/**
 * algoritmoStudio.js
 * Multi-course interleaved scheduler — dual study slots support.
 * Reads both mattina + pomeriggio per day, merges them into ordered slot list.
 */
import { isFestivita } from './festivita.js'

export const TASK_BUFFER_MINUTES = 0 // removed buffer, keep it clean

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

/**
 * Get all study sub-slots for a given day from the dual-slot schedule.
 * Returns array of { dalle, alle, minuti } ordered by start time.
 */
function getSubSlots(scheduleGiorno) {
  if (!scheduleGiorno?.abilitato) return []
  const slots = []
  ;['mattina','pomeriggio'].forEach(f => {
    const slot = scheduleGiorno[f]
    if (slot?.abilitato && slot.dalle && slot.alle) {
      const minuti = timeToMin(slot.alle) - timeToMin(slot.dalle)
      if (minuti > 0) slots.push({ dalle: slot.dalle, alle: slot.alle, minuti, fascia: f })
    }
  })
  return slots.sort((a,b) => timeToMin(a.dalle) - timeToMin(b.dalle))
}

/**
 * Generate all available study slots in a date range.
 * Each day can produce multiple sub-slots (morning + afternoon).
 */
export function generateStudySlots(startDate, endDate, scheduleStudio, calendarEvents = []) {
  const slots = []
  let current = new Date(startDate + 'T12:00')
  const end = new Date(endDate + 'T12:00')

  while (current <= end) {
    const ds = current.toISOString().slice(0, 10)
    const dow = current.getDay()
    const g = scheduleStudio?.[dow]

    if (g?.abilitato) {
      const isHoliday = isFestivita(ds, current.getFullYear())
      const dayEvents = calendarEvents.filter(e => e.data === ds)
      const isBlocked = dayEvents.some(e => e.tipo === 'malattia' || e.tipo === 'ferie' || e.tipo === 'studio_eccezione')

      if (!isHoliday && !isBlocked) {
        const subSlots = getSubSlots(g)
        subSlots.forEach(ss => {
          slots.push({
            date: ds,
            dalle: ss.dalle,
            alle: ss.alle,
            fascia: ss.fascia,
            minutiDisponibili: ss.minuti,
            usedMinutes: 0,
          })
        })
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return slots
}

/**
 * Schedule tasks for one course into available slots.
 */
export function scheduleTasks(moduli, slots) {
  if (!slots.length || !moduli.length) return []
  const allTasks = []
  ;[...moduli].sort((a,b) => a.ordine-b.ordine).forEach(m => {
    m.task.forEach(t => allTasks.push({ ...t, moduloId: m.id, moduloTitolo: m.titolo }))
  })

  const slotsWork = slots.map(s => ({ ...s }))
  let si = 0, usedInSlot = 0
  const scheduled = []

  for (const task of allTasks) {
    const needed = task.durata_minuti || 50
    while (si < slotsWork.length && (slotsWork[si].minutiDisponibili - usedInSlot) < 20) {
      si++; usedInSlot = 0
    }
    if (si >= slotsWork.length) {
      scheduled.push({ ...task, dataPianificata: null, oraPianificata: null })
    } else {
      const slot = slotsWork[si]
      const startMin = timeToMin(slot.dalle) + usedInSlot
      scheduled.push({ ...task, dataPianificata: slot.date, oraPianificata: minToTime(startMin), fascia: slot.fascia })
      usedInSlot += needed
      if (usedInSlot >= slot.minutiDisponibili) { si++; usedInSlot = 0 }
    }
  }
  return scheduled
}

/**
 * Global interleaved multi-course scheduler.
 * Distributes tasks across courses in round-robin, respecting dual slots.
 */
export function scheduleAllCourses(corsi, slots) {
  const queues = corsi.map(corso => {
    const tasks = []
    ;[...(corso.moduli||[])].sort((a,b) => a.ordine-b.ordine).forEach(m =>
      m.task.forEach(t => tasks.push({ ...t, moduloId: m.id, moduloTitolo: m.titolo, corsoId: corso.id, corsoNome: corso.nome }))
    )
    return { corsoId: corso.id, tasks, idx: 0 }
  }).filter(q => q.tasks.length > 0)

  if (!queues.length || !slots.length) return {}

  const slotsWork = slots.map(s => ({ ...s, usedMinutes: 0 }))
  let si = 0
  const assigned = {}
  queues.forEach(q => { assigned[q.corsoId] = [] })

  let allDone = false
  while (!allDone) {
    allDone = true
    for (const q of queues) {
      if (q.idx >= q.tasks.length) continue
      allDone = false
      const task = q.tasks[q.idx]
      const needed = task.durata_minuti || 50

      while (si < slotsWork.length && (slotsWork[si].minutiDisponibili - slotsWork[si].usedMinutes) < 20) si++

      const slot = slotsWork[si]
      if (!slot) {
        assigned[q.corsoId].push({ ...task, dataPianificata: null, oraPianificata: null })
      } else {
        const startMin = timeToMin(slot.dalle) + slot.usedMinutes
        assigned[q.corsoId].push({
          ...task,
          dataPianificata: slot.date,
          oraPianificata: minToTime(startMin),
          fascia: slot.fascia,
        })
        slot.usedMinutes += needed
        if (slot.usedMinutes >= slot.minutiDisponibili) si++
      }
      q.idx++
    }
  }
  return assigned
}

export function calcolaStatistiche(tasksScheduled) {
  const total = tasksScheduled.length
  const completati = tasksScheduled.filter(t => t.completato).length
  const oreTotal = Math.round(tasksScheduled.reduce((s,t) => s+(t.durata_minuti||50),0)/60*10)/10
  const oreCompletate = Math.round(tasksScheduled.filter(t=>t.completato).reduce((s,t)=>s+(t.durata_minuti||50),0)/60*10)/10
  const oggi = new Date().toISOString().slice(0,10)
  const taskInRitardo = tasksScheduled.filter(t=>t.dataPianificata&&t.dataPianificata<oggi&&!t.completato).length
  return { total, completati, oreTotal, oreCompletate, pct: total>0?Math.round(completati/total*100):0, taskInRitardo }
}