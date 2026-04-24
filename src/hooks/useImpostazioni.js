import { useLocalStorage } from './useLocalStorage'

export const DEFAULT_SLOT = { abilitato: false, dalle: '', alle: '' }
export const DEFAULT_STUDIO_GIORNO = {
  abilitato: false,
  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' },
  pomeriggio: { abilitato: false, dalle: '20:00', alle: '22:00' },
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
  // Each day: two independent slots (mattina + pomeriggio)
  scheduleStudio: {
    1: { ...DEFAULT_STUDIO_GIORNO, abilitato: true,  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' }, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    2: { ...DEFAULT_STUDIO_GIORNO, abilitato: true,  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' }, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    3: { ...DEFAULT_STUDIO_GIORNO, abilitato: true,  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' }, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    4: { ...DEFAULT_STUDIO_GIORNO, abilitato: true,  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' }, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    5: { ...DEFAULT_STUDIO_GIORNO, abilitato: true,  mattina: { abilitato: false, dalle: '07:00', alle: '09:00' }, pomeriggio: { abilitato: true, dalle: '20:00', alle: '22:00' } },
    6: { ...DEFAULT_STUDIO_GIORNO },
    0: { ...DEFAULT_STUDIO_GIORNO },
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

export function useImpostazioni() {
  const [settings, setSettings] = useLocalStorage('wl_settings', DEFAULT_SETTINGS)

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  // Work schedule: no pause
  const updateScheduleGiorno = (dow, patch) =>
    setSettings(s => ({
      ...s,
      scheduleLavorativo: {
        ...(s.scheduleLavorativo || {}),
        [dow]: { ...(s.scheduleLavorativo?.[dow] || {}), ...patch }
      }
    }))

  // Study schedule: per-day dual slot
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

  const getSchedule = () => settings.scheduleLavorativo || DEFAULT_SETTINGS.scheduleLavorativo
  const getScheduleStudio = () => settings.scheduleStudio || DEFAULT_SETTINGS.scheduleStudio

  const getOrarioGiorno = (dow) => (settings.scheduleLavorativo || {})[dow] || { abilitato: false }
  const getOrarioStudio = (dow) => (settings.scheduleStudio || {})[dow] || { ...DEFAULT_STUDIO_GIORNO }

  // Total minutes of study per day (sum of enabled slots)
  const minutiStudioGiorno = (dow) => {
    const g = getOrarioStudio(dow)
    if (!g.abilitato) return 0
    let min = 0
    ;['mattina', 'pomeriggio'].forEach(f => {
      const slot = g[f]
      if (slot?.abilitato && slot.dalle && slot.alle) {
        min += Math.max(0, timeToMin(slot.alle) - timeToMin(slot.dalle))
      }
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

  return {
    settings, update,
    updateScheduleGiorno, updateStudioGiorno, updateStudioSlot,
    getSchedule, getScheduleStudio, getOrarioGiorno, getOrarioStudio,
    minutiStudioGiorno, oreStudioSettimanali,
    oreContrattualiMensili, tariffaCalcolata,
    stipendioMensileNetto, reddtitoMedioMensile,
  }
}
