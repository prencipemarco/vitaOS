import { useLocalStorage } from './useLocalStorage'

export const DEFAULT_SLOT = { abilitato: false, dalle: '', alle: '' }
export const DEFAULT_STUDIO_GIORNO = {
  abilitato: false,
  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' },
  pomeriggio: { abilitato: false, dalle: '20:00', alle: '22:00' },
}

export const DEFAULT_PALESTRA_GIORNO = {
  abilitato: false,
  dalle: '18:30',
  alle: '20:00',
  sede: '',
  bufferMinuti: 30,
}

export const DEFAULT_SETTINGS = {
  name: '',
  tipoContratto: 'dipendente',
  stipendioLordo: '',
  stipendioNetto: '',
  scheduleLavorativo: {
    1: { abilitato: true,  dalle: '09:00', alle: '18:00' },
    2: { abilitato: true,  dalle: '09:00', alle: '18:00' },
    3: { abilitato: true,  dalle: '09:00', alle: '18:00' },
    4: { abilitato: true,  dalle: '09:00', alle: '18:00' },
    5: { abilitato: true,  dalle: '09:00', alle: '18:00' },
    6: { abilitato: false, dalle: '',      alle: ''      },
    0: { abilitato: false, dalle: '',      alle: ''      },
  },
  scheduleStudio: {
    1: { ...DEFAULT_STUDIO_GIORNO, abilitato: true, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    2: { ...DEFAULT_STUDIO_GIORNO, abilitato: true, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    3: { ...DEFAULT_STUDIO_GIORNO, abilitato: true, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    4: { ...DEFAULT_STUDIO_GIORNO, abilitato: true, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    5: { ...DEFAULT_STUDIO_GIORNO, abilitato: true, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    6: { ...DEFAULT_STUDIO_GIORNO },
    0: { ...DEFAULT_STUDIO_GIORNO },
  },
  schedulePalestra: {
    1: { ...DEFAULT_PALESTRA_GIORNO },
    2: { ...DEFAULT_PALESTRA_GIORNO },
    3: { ...DEFAULT_PALESTRA_GIORNO },
    4: { ...DEFAULT_PALESTRA_GIORNO },
    5: { ...DEFAULT_PALESTRA_GIORNO },
    6: { ...DEFAULT_PALESTRA_GIORNO },
    0: { ...DEFAULT_PALESTRA_GIORNO },
  },
  tredicesima: false,
  quattordicesima: false,
  meseTredicesima: 11,
  meseQuattordicesima: 6,
  giorniFerieAnnui: 26,
  orePermessoAnnuo: 104,
  tariffaOraria: '',
  anthropicApiKey: '',
  theme: 'light',
}

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function addMinToTime(t, min) {
  const total = timeToMin(t) + min
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function subMinFromTime(t, min) {
  const total = Math.max(0, timeToMin(t) - min)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

export function useImpostazioni() {
  const [settings, setSettings] = useLocalStorage('wl_settings', DEFAULT_SETTINGS)

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  // ── Work schedule ──────────────────────────────────────────
  const updateScheduleGiorno = (dow, patch) =>
    setSettings(s => ({
      ...s,
      scheduleLavorativo: {
        ...(s.scheduleLavorativo || {}),
        [dow]: { ...(s.scheduleLavorativo?.[dow] || {}), ...patch }
      }
    }))

  // ── Study schedule ─────────────────────────────────────────
  const updateStudioGiorno = (dow, patch) =>
    setSettings(s => ({
      ...s,
      scheduleStudio: {
        ...(s.scheduleStudio || {}),
        [dow]: { ...(DEFAULT_STUDIO_GIORNO), ...(s.scheduleStudio?.[dow] || {}), ...patch }
      }
    }))

  const updateStudioSlot = (dow, fascia, patch) =>
    setSettings(s => {
      const g = s.scheduleStudio?.[dow] || { ...DEFAULT_STUDIO_GIORNO }
      return {
        ...s,
        scheduleStudio: {
          ...(s.scheduleStudio || {}),
          [dow]: { ...g, [fascia]: { ...(g[fascia] || {}), ...patch } }
        }
      }
    })

  // ── Gym schedule ───────────────────────────────────────────
  const updatePalestraGiorno = (dow, patch) =>
    setSettings(s => ({
      ...s,
      schedulePalestra: {
        ...(s.schedulePalestra || {}),
        [dow]: { ...(DEFAULT_PALESTRA_GIORNO), ...(s.schedulePalestra?.[dow] || {}), ...patch }
      }
    }))

  const getSchedulePalestra = () => settings.schedulePalestra || DEFAULT_SETTINGS.schedulePalestra

  // Returns the full block including travel buffers for calendar display
  const getPalestraBlockGiorno = (dow) => {
    const g = (settings.schedulePalestra || {})[dow] || { ...DEFAULT_PALESTRA_GIORNO }
    if (!g.abilitato || !g.dalle || !g.alle) return null
    const buf = parseInt(g.bufferMinuti) || 30
    return {
      ...g,
      dalleConBuffer: subMinFromTime(g.dalle, buf),
      alleConBuffer: addMinToTime(g.alle, buf),
    }
  }

  const getSchedule = () => settings.scheduleLavorativo || DEFAULT_SETTINGS.scheduleLavorativo
  const getScheduleStudio = () => settings.scheduleStudio || DEFAULT_SETTINGS.scheduleStudio

  const getOrarioGiorno = (dow) => (settings.scheduleLavorativo || {})[dow] || { abilitato: false }
  const getOrarioStudio = (dow) => (settings.scheduleStudio || {})[dow] || { ...DEFAULT_STUDIO_GIORNO }
  const getOrarioPalestra = (dow) => (settings.schedulePalestra || {})[dow] || { ...DEFAULT_PALESTRA_GIORNO }

  // ── Computed ───────────────────────────────────────────────
  const minutiStudioGiorno = (dow) => {
    const g = getOrarioStudio(dow)
    if (!g.abilitato) return 0
    let min = 0
    ;['mattina', 'pomeriggio'].forEach(f => {
      const slot = g[f]
      if (slot?.abilitato && slot.dalle && slot.alle)
        min += Math.max(0, timeToMin(slot.alle) - timeToMin(slot.dalle))
    })
    return min
  }

  const oreStudioSettimanali = () => {
    let tot = 0
    ;[0,1,2,3,4,5,6].forEach(dow => { tot += minutiStudioGiorno(dow) })
    return Math.round(tot / 60 * 10) / 10
  }

  const oreContrattualiMensili = () => {
    const sch = getSchedule()
    let ore = 0
    Object.values(sch).forEach(g => {
      if (!g.abilitato || !g.dalle || !g.alle) return
      ore += Math.max(0, (timeToMin(g.alle) - timeToMin(g.dalle)) / 60)
    })
    return Math.round(ore * 52 / 12 * 10) / 10
  }

  const tariffaCalcolata = () => {
    if (settings.tariffaOraria) return parseFloat(settings.tariffaOraria)
    const netto = parseFloat(settings.stipendioNetto)
    if (!netto) return 0
    const ore = oreContrattualiMensili()
    return ore > 0 ? Math.round((netto / ore) * 100) / 100 : 0
  }

  const stipendioMensileNetto = () => parseFloat(settings.stipendioNetto) || 0

  const reddtitoMedioMensile = () => {
    const base = stipendioMensileNetto()
    let bonus = 0
    if (settings.tredicesima) bonus += base
    if (settings.quattordicesima) bonus += base
    return Math.round((base * 12 + bonus) / 12)
  }

  const orePalestraSettimanali = () => {
    const sch = getSchedulePalestra()
    let ore = 0
    Object.values(sch).forEach(g => {
      if (!g.abilitato || !g.dalle || !g.alle) return
      ore += Math.max(0, (timeToMin(g.alle) - timeToMin(g.dalle)) / 60)
    })
    return Math.round(ore * 10) / 10
  }

  return {
    settings, update, saveSettings: setSettings,
    updateScheduleGiorno, updateStudioGiorno, updateStudioSlot, updatePalestraGiorno,
    getSchedule, getScheduleStudio, getSchedulePalestra,
    getOrarioGiorno, getOrarioStudio, getOrarioPalestra, getPalestraBlockGiorno,
    minutiStudioGiorno, oreStudioSettimanali,
    oreContrattualiMensili, tariffaCalcolata,
    stipendioMensileNetto, reddtitoMedioMensile,
    orePalestraSettimanali,
  }
}
