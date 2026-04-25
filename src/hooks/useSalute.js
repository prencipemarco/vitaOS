/**
 * useSalute.js
 * Hook per la gestione della salute e dell'allenamento.
 * Scheda settimanale, sessioni completate, progressi.
 */
import { useLocalStorage } from './useLocalStorage'

export const TIPI_GIORNO = {
  riposo:        { label: 'Riposo',         icon: '😴', color: '#888'    },
  riposo_attivo: { label: 'Riposo attivo',  icon: '🚶', color: '#3A7059' },
  push:          { label: 'Push',           icon: '💪', color: '#C46A3C' },
  pull:          { label: 'Pull',           icon: '🏋️', color: '#3A5F8A' },
  legs:          { label: 'Gambe',          icon: '🦵', color: '#7A5FA0' },
  full_body:     { label: 'Full Body',      icon: '⚡', color: '#A04545' },
  cardio:        { label: 'Cardio',         icon: '🏃', color: '#3A7059' },
  upper:         { label: 'Upper Body',     icon: '🔝', color: '#B07040' },
  custom:        { label: 'Personalizzato', icon: '✏️', color: '#888'    },
}

export const MUSCOLI = [
  'Petto', 'Schiena', 'Spalle', 'Bicipiti', 'Tricipiti',
  'Quadricipiti', 'Femorali', 'Glutei', 'Addome', 'Polpacci', 'Altro'
]

export const DEFAULT_SCHEDA = {
  1: { tipo: 'push',          nome: 'Push — Petto & Tricipiti',  esercizi: [] },
  2: { tipo: 'pull',          nome: 'Pull — Schiena & Bicipiti', esercizi: [] },
  3: { tipo: 'legs',          nome: 'Gambe',                     esercizi: [] },
  4: { tipo: 'riposo',        nome: 'Riposo',                    esercizi: [] },
  5: { tipo: 'upper',         nome: 'Upper Body',                esercizi: [] },
  6: { tipo: 'cardio',        nome: 'Cardio',                    esercizi: [] },
  0: { tipo: 'riposo_attivo', nome: 'Riposo attivo',             esercizi: [] },
}

export function useSalute() {
  const [scheda, setScheda] = useLocalStorage('wl_salute_scheda', DEFAULT_SCHEDA)
  const [sessioni, setSessioni] = useLocalStorage('wl_salute_sessioni', [])

  // ── Scheda settimanale ──────────────────────────────────────
  const updateGiorno = (dow, patch) =>
    setScheda(prev => ({ ...prev, [dow]: { ...(prev[dow] || {}), ...patch } }))

  const addEsercizio = (dow, esercizio) => {
    const id = `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const nuovo = {
      serie: 3, reps: 10, peso: 0, recupero_sec: 90,
      muscolo: 'Altro', note: '',
      ...esercizio, id,
    }
    setScheda(prev => ({
      ...prev,
      [dow]: { ...(prev[dow] || {}), esercizi: [...(prev[dow]?.esercizi || []), nuovo] },
    }))
    return id
  }

  const removeEsercizio = (dow, id) =>
    setScheda(prev => ({
      ...prev,
      [dow]: { ...prev[dow], esercizi: (prev[dow]?.esercizi || []).filter(e => e.id !== id) },
    }))

  const updateEsercizio = (dow, id, patch) =>
    setScheda(prev => ({
      ...prev,
      [dow]: {
        ...prev[dow],
        esercizi: (prev[dow]?.esercizi || []).map(e => e.id === id ? { ...e, ...patch } : e),
      },
    }))

  const moveEsercizio = (dow, from, to) =>
    setScheda(prev => {
      const arr = [...(prev[dow]?.esercizi || [])]
      const [el] = arr.splice(from, 1)
      arr.splice(to, 0, el)
      return { ...prev, [dow]: { ...prev[dow], esercizi: arr } }
    })

  // ── Sessioni allenamento ────────────────────────────────────
  const getSessioneOggi = () => {
    const today = new Date().toISOString().slice(0, 10)
    return sessioni.find(s => s.data === today) || null
  }

  const startSessione = (dow) => {
    const today = new Date().toISOString().slice(0, 10)
    const g = scheda[dow] || {}
    const id = `sess_${Date.now()}`
    const nuova = {
      id, data: today, dow,
      tipo: g.tipo || 'custom',
      nome: g.nome || 'Allenamento',
      esercizi: (g.esercizi || []).map(e => ({
        ...e,
        serie_log: Array.from({ length: Math.max(1, parseInt(e.serie) || 3) }, () => ({
          reps: e.reps, peso: parseFloat(e.peso) || 0, completata: false,
        })),
      })),
      iniziataAlle: new Date().toISOString(),
      completata: false,
    }
    setSessioni(prev => [...prev.filter(s => s.data !== today), nuova])
    return id
  }

  const completaSerie = (sessioneId, esId, idx, patch) =>
    setSessioni(prev => prev.map(s => {
      if (s.id !== sessioneId) return s
      return {
        ...s,
        esercizi: s.esercizi.map(e => {
          if (e.id !== esId) return e
          return {
            ...e,
            serie_log: e.serie_log.map((sr, i) =>
              i === idx ? { ...sr, ...patch, completata: true } : sr
            ),
          }
        }),
      }
    }))

  const completaSessione = (sessioneId) => {
    const s = sessioni.find(x => x.id === sessioneId)
    if (!s) return
    const durata = Math.round((Date.now() - new Date(s.iniziataAlle).getTime()) / 60000)
    setSessioni(prev => prev.map(x =>
      x.id === sessioneId
        ? { ...x, completata: true, completataAlle: new Date().toISOString(), durata_min: durata }
        : x
    ))
  }

  const deleteSessione = (id) => setSessioni(prev => prev.filter(s => s.id !== id))

  // ── Statistiche ────────────────────────────────────────────
  const getStatsGenerali = () => {
    const completate = sessioni.filter(s => s.completata)
    const now = new Date()
    const thisMonth = completate.filter(s => {
      const d = new Date(s.data + 'T12:00')
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length

    const doneSet = new Set(completate.map(x => x.data))
    let streak = 0
    const d = new Date()
    while (doneSet.has(d.toISOString().slice(0, 10))) {
      streak++; d.setDate(d.getDate() - 1)
    }

    const durataMedia = completate.filter(s => s.durata_min).length > 0
      ? Math.round(completate.filter(s => s.durata_min).reduce((a, s) => a + s.durata_min, 0) / completate.filter(s => s.durata_min).length)
      : 0

    return { total: completate.length, thisMonth, streak, durataMedia }
  }

  // ── Progressi per esercizio ────────────────────────────────
  const getProgressiEsercizio = (nomeEs) => {
    const res = []
    sessioni
      .filter(s => s.completata)
      .sort((a, b) => a.data.localeCompare(b.data))
      .forEach(s => {
        const e = s.esercizi.find(x => x.nome.toLowerCase() === nomeEs.toLowerCase())
        if (!e) return
        const pesi = e.serie_log.filter(sr => sr.completata && parseFloat(sr.peso) > 0).map(sr => parseFloat(sr.peso))
        const reps = e.serie_log.filter(sr => sr.completata).map(sr => parseInt(sr.reps) || 0)
        if (pesi.length) {
          res.push({
            data: s.data,
            pesoMax: Math.max(...pesi),
            pesoMedio: Math.round(pesi.reduce((a, b) => a + b, 0) / pesi.length * 10) / 10,
            volume: pesi.reduce((acc, p, i) => acc + p * (reps[i] || 0), 0),
          })
        }
      })
    return res
  }

  const getSessioniMese = (year, month) =>
    sessioni.filter(s => {
      const d = new Date(s.data + 'T12:00')
      return d.getFullYear() === year && d.getMonth() === month
    })

  const getAllEserciziNomi = () => {
    const nomi = new Set()
    Object.values(scheda).forEach(g => (g?.esercizi || []).forEach(e => nomi.add(e.nome)))
    sessioni.forEach(s => (s.esercizi || []).forEach(e => nomi.add(e.nome)))
    return [...nomi].filter(Boolean).sort()
  }

  return {
    scheda, updateGiorno,
    addEsercizio, removeEsercizio, updateEsercizio, moveEsercizio,
    sessioni, getSessioneOggi, startSessione,
    completaSerie, completaSessione, deleteSessione,
    getStatsGenerali, getProgressiEsercizio, getSessioniMese, getAllEserciziNomi,
  }
}
