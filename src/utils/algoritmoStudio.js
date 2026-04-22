/**
 * algoritmoStudio.js
 * Multi-course interleaved scheduler with global planning.
 * 
 * Strategy:
 *  - Collects all tasks from all courses, ordered by module dependency
 *  - Assigns tasks via round-robin interleaving across courses
 *  - Respects study slots from config (excluding holidays + blocked days)
 *  - Adds 30min buffer per task
 *  - Prevents slot overlap between courses
 *  - Reserves final 10% of slots as revision buffer per course
 */

import { isFestivita } from './festivita.js'

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export const TASK_BUFFER_MINUTES = 30

/**
 * Generate study slots for a date range, respecting schedule + holidays + events.
 */
export function generateStudySlots(startDate, endDate, scheduleStudio, calendarEvents = []) {
  const slots = []
  let current = new Date(startDate + 'T12:00')
  const end = new Date(endDate + 'T12:00')

  while (current <= end) {
    const ds = current.toISOString().slice(0, 10)
    const dow = current.getDay()
    const schedule = scheduleStudio?.[dow]

    if (schedule?.abilitato && schedule.dalle && schedule.alle) {
      if (!isFestivita(ds, current.getFullYear())) {
        const dayEvents = calendarEvents.filter(e => e.data === ds)
        const isBlocked = dayEvents.some(e => e.tipo === 'malattia' || e.tipo === 'ferie')
        const hasException = dayEvents.some(e => e.tipo === 'studio_eccezione')

        if (!isBlocked && !hasException) {
          const minuti = timeToMinutes(schedule.alle) - timeToMinutes(schedule.dalle) - (schedule.pausa || 0)
          if (minuti > 0) {
            slots.push({
              date: ds,
              dalle: schedule.dalle,
              alle: schedule.alle,
              minutiDisponibili: Math.max(0, minuti),
              usedMinutes: 0,
            })
          }
        }
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return slots
}

/**
 * Schedule tasks for a single course.
 */
export function scheduleTasks(moduli, slots) {
  if (!slots.length || !moduli.length) return []
  const allTasks = []
  const sorted = [...moduli].sort((a, b) => a.ordine - b.ordine)
  sorted.forEach(m => {
    m.task.forEach(t => allTasks.push({ ...t, moduloId: m.id, moduloTitolo: m.titolo }))
  })

  const totalMinutes = allTasks.reduce((s, t) => s + (t.durata_minuti || 50) + TASK_BUFFER_MINUTES, 0)
  const totalAvailable = slots.reduce((s, sl) => s + sl.minutiDisponibili, 0)

  // Reserve last 10% for revision
  let cumMin = 0
  const bufferThreshold = totalAvailable * 0.9
  const studySlots = []
  const bufferSlots = []
  for (const sl of slots) {
    if (cumMin < bufferThreshold) studySlots.push({ ...sl })
    else bufferSlots.push({ ...sl })
    cumMin += sl.minutiDisponibili
  }

  const scheduled = []
  let si = 0
  let usedInSlot = 0

  for (const task of allTasks) {
    const needed = (task.durata_minuti || 50) + TASK_BUFFER_MINUTES
    while (si < studySlots.length && (studySlots[si].minutiDisponibili - usedInSlot) < 25) {
      si++; usedInSlot = 0
    }
    const slot = studySlots[si]
    if (!slot) {
      const buf = bufferSlots[scheduled.filter(t=>t._inBuffer).length % Math.max(1, bufferSlots.length)]
      scheduled.push({ ...task, dataPianificata: buf?.date || null, oraPianificata: null, _inBuffer: true })
    } else {
      const startMin = timeToMinutes(slot.dalle) + usedInSlot
      scheduled.push({ ...task, dataPianificata: slot.date, oraPianificata: minutesToTime(startMin) })
      usedInSlot += needed
      if (usedInSlot >= slot.minutiDisponibili) { si++; usedInSlot = 0 }
    }
  }
  return scheduled
}

/**
 * Global multi-course interleaved scheduler.
 * Interleaves tasks across courses to avoid mental fatigue.
 * Returns { [corsoId]: Task[] }
 */
export function scheduleAllCourses(corsi, slots) {
  // Build round-robin queue from all courses
  const queues = corsi.map(corso => {
    const tasks = []
    const sorted = [...(corso.moduli || [])].sort((a, b) => a.ordine - b.ordine)
    sorted.forEach(m => m.task.forEach(t => tasks.push({ ...t, moduloId: m.id, moduloTitolo: m.titolo, corsoId: corso.id })))
    return { corsoId: corso.id, tasks, idx: 0 }
  }).filter(q => q.tasks.length > 0)

  if (!queues.length || !slots.length) return {}

  // Clone slots so we can track usage
  const slotsWork = slots.map(s => ({ ...s, usedMinutes: 0 }))
  let slotIdx = 0

  // Interleave: take one task per course in rotation
  const assigned = {} // corsoId -> Task[]
  queues.forEach(q => { assigned[q.corsoId] = [] })

  let allDone = false
  while (!allDone) {
    allDone = true
    for (const q of queues) {
      if (q.idx >= q.tasks.length) continue
      allDone = false
      const task = q.tasks[q.idx]
      const needed = (task.durata_minuti || 50) + TASK_BUFFER_MINUTES

      // Advance slot if needed
      while (slotIdx < slotsWork.length && (slotsWork[slotIdx].minutiDisponibili - slotsWork[slotIdx].usedMinutes) < 25) {
        slotIdx++
      }

      const slot = slotsWork[slotIdx]
      if (!slot) {
        assigned[q.corsoId].push({ ...task, dataPianificata: null, oraPianificata: null })
      } else {
        const startMin = timeToMinutes(slot.dalle) + slot.usedMinutes
        assigned[q.corsoId].push({ ...task, dataPianificata: slot.date, oraPianificata: minutesToTime(startMin) })
        slot.usedMinutes += needed
        if (slot.usedMinutes >= slot.minutiDisponibili) slotIdx++
      }
      q.idx++
    }
  }

  return assigned
}

/**
 * Statistics for a scheduled course.
 */
export function calcolaStatistiche(tasksScheduled) {
  const total = tasksScheduled.length
  const completati = tasksScheduled.filter(t => t.completato).length
  const oreTotal = Math.round(tasksScheduled.reduce((s, t) => s + (t.durata_minuti || 50), 0) / 60 * 10) / 10
  const oreCompletate = Math.round(tasksScheduled.filter(t => t.completato).reduce((s, t) => s + (t.durata_minuti || 50), 0) / 60 * 10) / 10
  const oggi = new Date().toISOString().slice(0, 10)
  const taskOggi = tasksScheduled.filter(t => t.dataPianificata === oggi && !t.completato)
  const taskInRitardo = tasksScheduled.filter(t => t.dataPianificata && t.dataPianificata < oggi && !t.completato)
  return { total, completati, oreTotal, oreCompletate, pct: total > 0 ? Math.round(completati/total*100) : 0, taskOggi: taskOggi.length, taskInRitardo: taskInRitardo.length }
}
