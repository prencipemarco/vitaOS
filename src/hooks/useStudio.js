import { useLocalStorage } from './useLocalStorage'
import { scheduleTasks, scheduleAllCourses, generateStudySlots, calcolaStatistiche } from '../utils/algoritmoStudio'

export const TIPI_CORSO = {
  universita:    { label:'Università',     icon:'🎓' },
  certificazione:{ label:'Certificazione', icon:'📜' },
  libero:        { label:'Studio libero',  icon:'📖' },
}
export const TIPI_TASK = {
  teoria:           { label:'Teoria',          color:'#3A5F8A' },
  esercizi:         { label:'Esercizi',         color:'#C46A3C' },
  ripasso:          { label:'Ripasso',          color:'#3A7059' },
  simulazione_esame:{ label:'Simulazione esame',color:'#7A5FA0' },
}

export function useStudio() {
  const [corsi, setCorsi] = useLocalStorage('wl_studio_corsi', [])
  const [tasksState, setTasksState] = useLocalStorage('wl_studio_tasks', {})

  // ── Courses ────────────────────────────────────────────────
  const addCorso = (corsoData) => {
    const id = `corso_${Date.now()}`
    const corso = { ...corsoData.corso, id, createdAt: new Date().toISOString() }
    const moduli = (corsoData.moduli || []).map((m, i) => ({
      ...m,
      id: m.id?.startsWith('m_') ? m.id : `m_${id}_${i}`,
      task: (m.task || []).map((t, j) => ({
        ...t,
        id: t.id?.includes('_') ? t.id : `t_${id}_${i}_${j}`,
      }))
    }))
    setCorsi(prev => [...prev, { ...corso, moduli }])
    return id
  }

  const removeCorso = (id) => {
    setCorsi(prev => prev.filter(c => c.id !== id))
    setTasksState(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const updateCorso = (id, patch) =>
    setCorsi(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))

  // ── Tasks ──────────────────────────────────────────────────
  const getTasksForCorso = (corsoId) => tasksState[corsoId] || []

  const setTasksForCorso = (corsoId, tasks) =>
    setTasksState(prev => ({ ...prev, [corsoId]: tasks }))

  const completeTask = (corsoId, taskId) => {
    const tasks = getTasksForCorso(corsoId)
    setTasksForCorso(corsoId, tasks.map(t =>
      t.id === taskId
        ? { ...t, completato: !t.completato, completatoIl: !t.completato ? new Date().toISOString().slice(0,10) : null }
        : t
    ))
  }

  const rescheduleTask = (corsoId, taskId, nuovaData) => {
    const tasks = getTasksForCorso(corsoId)
    setTasksForCorso(corsoId, tasks.map(t => t.id === taskId ? { ...t, dataPianificata: nuovaData } : t))
  }

  // ── Single course scheduling ───────────────────────────────
  const generateSchedule = (corsoId, scheduleStudio, calendarEvents = []) => {
    const corso = corsi.find(c => c.id === corsoId)
    if (!corso || !corso.dataEsame) return { error: 'Data esame non impostata' }
    const today = new Date().toISOString().slice(0, 10)
    const bufferDate = (() => {
      const d = new Date(corso.dataEsame + 'T12:00'); d.setDate(d.getDate() - 2)
      return d.toISOString().slice(0, 10)
    })()
    if (bufferDate < today) return { error: "La data dell'esame è già passata o troppo vicina" }
    const slots = generateStudySlots(today, bufferDate, scheduleStudio, calendarEvents)
    if (!slots.length) return { error: 'Nessuno slot di studio disponibile. Verifica la configurazione orario studio.' }
    const scheduled = scheduleTasks(corso.moduli || [], slots)
    setTasksForCorso(corsoId, scheduled.map(t => ({ ...t, completato: false })))
    const totalNeeded = scheduled.reduce((s, t) => s + (t.durata_minuti || 50), 0)
    const totalAvail = slots.reduce((s, sl) => s + sl.minutiDisponibili, 0)
    return { success: true, slotsCount: slots.length, oreDisponibili: Math.round(totalAvail/60), oreNecessarie: Math.round(totalNeeded/60), fattibile: totalAvail >= totalNeeded }
  }

  // ── Global multi-course interleaved scheduling ─────────────
  const generateAllSchedules = (scheduleStudio, calendarEvents = []) => {
    const corsiConEsame = corsi.filter(c => c.dataEsame)
    if (!corsiConEsame.length) return { error: 'Nessun corso con data esame impostata' }
    const today = new Date().toISOString().slice(0, 10)
    // Use latest exam date as end
    const lastExam = corsiConEsame.reduce((max, c) => c.dataEsame > max ? c.dataEsame : max, '')
    const bufferDate = (() => {
      const d = new Date(lastExam + 'T12:00'); d.setDate(d.getDate() - 2)
      return d.toISOString().slice(0, 10)
    })()
    if (bufferDate < today) return { error: 'Tutte le date esame sono passate' }
    const slots = generateStudySlots(today, bufferDate, scheduleStudio, calendarEvents)
    if (!slots.length) return { error: 'Nessuno slot di studio disponibile' }
    const assigned = scheduleAllCourses(corsiConEsame, slots)
    // Save all
    Object.entries(assigned).forEach(([corsoId, tasks]) => {
      setTasksForCorso(corsoId, tasks.map(t => ({ ...t, completato: false })))
    })
    return { success: true, corsiPianificati: Object.keys(assigned).length, slotsCount: slots.length }
  }

  // ── Stats ──────────────────────────────────────────────────
  const getStats = (corsoId) => calcolaStatistiche(getTasksForCorso(corsoId))

  // ── Today: pull pending today + drag-forward late tasks ────
  const getTodayTasks = () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = []
    corsi.forEach(corso => {
      const tasks = getTasksForCorso(corso.id)
      // Today's pending
      tasks.filter(t => t.dataPianificata === today && !t.completato)
        .forEach(t => result.push({ ...t, corsoNome: corso.nome, corsoId: corso.id }))
      // Late (past due) — dragged to today
      tasks.filter(t => t.dataPianificata && t.dataPianificata < today && !t.completato)
        .forEach(t => result.push({ ...t, corsoNome: corso.nome, corsoId: corso.id, isLate: true }))
    })
    return result
  }

  const getTodayTasksCompleted = () => {
    const today = new Date().toISOString().slice(0, 10)
    const result = []
    corsi.forEach(corso => {
      const tasks = getTasksForCorso(corso.id)
      tasks.filter(t => t.completato && t.completatoIl === today)
        .forEach(t => result.push({ ...t, corsoNome: corso.nome, corsoId: corso.id }))
    })
    return result
  }

  const getLateTasksCount = () => {
    const today = new Date().toISOString().slice(0, 10)
    let n = 0
    corsi.forEach(c => {
      n += getTasksForCorso(c.id).filter(t => t.dataPianificata && t.dataPianificata < today && !t.completato).length
    })
    return n
  }

  const contributoNecessario = (corsoId) => {
    const corso = corsi.find(c => c.id === corsoId)
    if (!corso?.dataEsame) return null
    const now = new Date()
    const scad = new Date(corso.dataEsame + 'T12:00')
    const mesi = Math.max(1, (scad.getFullYear()-now.getFullYear())*12+(scad.getMonth()-now.getMonth()))
    const tasks = getTasksForCorso(corsoId)
    const mancanti = tasks.filter(t => !t.completato).reduce((s,t) => s+(t.durata_minuti||50), 0)
    return { mesi, oreRimaste: Math.round(mancanti/60*10)/10 }
  }

  return {
    corsi, addCorso, removeCorso, updateCorso,
    getTasksForCorso, setTasksForCorso, completeTask, rescheduleTask,
    generateSchedule, generateAllSchedules,
    getStats, getTodayTasks, getTodayTasksCompleted, getLateTasksCount, contributoNecessario,
  }
}
