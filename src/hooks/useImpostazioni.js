import { useLocalStorage } from './useLocalStorage'

export const GIORNI_SETTIMANA = [
  { id:1, label:'Lunedì' },{ id:2, label:'Martedì' },{ id:3, label:'Mercoledì' },
  { id:4, label:'Giovedì' },{ id:5, label:'Venerdì' },{ id:6, label:'Sabato' },{ id:0, label:'Domenica' },
]

const ORARIO_DEFAULT = { abilitato:false, dalle:'20:00', alle:'22:00', pausa:0 }

export const DEFAULT_SETTINGS = {
  name: '',
  tipoContratto: 'dipendente',
  stipendioLordo: '',
  stipendioNetto: '',
  scheduleLavorativo: {
    1:{ abilitato:true, dalle:'09:00', alle:'18:00', pausa:60 },
    2:{ abilitato:true, dalle:'09:00', alle:'18:00', pausa:60 },
    3:{ abilitato:true, dalle:'09:00', alle:'18:00', pausa:60 },
    4:{ abilitato:true, dalle:'09:00', alle:'18:00', pausa:60 },
    5:{ abilitato:true, dalle:'09:00', alle:'18:00', pausa:60 },
    6:{ abilitato:false, dalle:'09:00', alle:'13:00', pausa:0 },
    0:{ abilitato:false, dalle:'', alle:'', pausa:0 },
  },
  // NEW: study schedule (separate from work)
  scheduleStudio: {
    1:{ ...ORARIO_DEFAULT, abilitato:true },
    2:{ ...ORARIO_DEFAULT, abilitato:true },
    3:{ ...ORARIO_DEFAULT, abilitato:true },
    4:{ ...ORARIO_DEFAULT, abilitato:true },
    5:{ ...ORARIO_DEFAULT, abilitato:true },
    6:{ ...ORARIO_DEFAULT },
    0:{ ...ORARIO_DEFAULT },
  },
  tredicesima: false,
  quattordicesima: false,
  meseTredicesima: 11,
  meseQuattordicesima: 6,
  giorniFerieAnnui: 26,
  orePermessoAnnuo: 104,
  tariffaOraria: '',
  // API key for AI features (optional)
  anthropicApiKey: '',
  theme: 'light',
}

export function useImpostazioni() {
  const [settings, setSettings] = useLocalStorage('wl_settings', DEFAULT_SETTINGS)

  const update = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  const updateScheduleGiorno = (giornoId, patch) =>
    setSettings(s => ({ ...s, scheduleLavorativo: { ...s.scheduleLavorativo, [giornoId]: { ...(s.scheduleLavorativo?.[giornoId]||{}), ...patch } } }))

  const updateStudioGiorno = (giornoId, patch) =>
    setSettings(s => ({ ...s, scheduleStudio: { ...s.scheduleStudio, [giornoId]: { ...(s.scheduleStudio?.[giornoId]||ORARIO_DEFAULT), ...patch } } }))

  const getSchedule = () => settings.scheduleLavorativo || DEFAULT_SETTINGS.scheduleLavorativo
  const getScheduleStudio = () => settings.scheduleStudio || DEFAULT_SETTINGS.scheduleStudio
  const getOrarioGiorno = (dow) => (settings.scheduleLavorativo||{})[dow] || { abilitato:false }
  const getOrarioStudio = (dow) => (settings.scheduleStudio||{})[dow] || { abilitato:false }

  const oreContrattualiMensili = () => {
    const sch = getSchedule()
    let ore = 0
    Object.values(sch).forEach(g => {
      if(!g.abilitato||!g.dalle||!g.alle) return
      const [hd,md] = g.dalle.split(':').map(Number)
      const [ha,ma] = g.alle.split(':').map(Number)
      ore += Math.max(0,((ha*60+ma)-(hd*60+md)-(g.pausa||0))/60)
    })
    return Math.round(ore*52/12*10)/10
  }

  const oreStudioSettimanali = () => {
    const sch = getScheduleStudio()
    let ore = 0
    Object.values(sch).forEach(g => {
      if(!g.abilitato||!g.dalle||!g.alle) return
      const [hd,md] = g.dalle.split(':').map(Number)
      const [ha,ma] = g.alle.split(':').map(Number)
      ore += Math.max(0,((ha*60+ma)-(hd*60+md)-(g.pausa||0))/60)
    })
    return Math.round(ore*10)/10
  }

  const tariffaCalcolata = () => {
    if(settings.tariffaOraria) return parseFloat(settings.tariffaOraria)
    const netto = parseFloat(settings.stipendioNetto)
    if(!netto) return 0
    const ore = oreContrattualiMensili()
    return ore>0 ? Math.round(netto/ore*100)/100 : 0
  }

  const stipendioMensileNetto = () => parseFloat(settings.stipendioNetto)||0

  const reddtitoMedioMensile = () => {
    const base = stipendioMensileNetto()
    let bonus = 0
    if(settings.tredicesima) bonus += base
    if(settings.quattordicesima) bonus += base
    return Math.round((base*12+bonus)/12)
  }

  return {
    settings, update,
    updateScheduleGiorno, updateStudioGiorno,
    getSchedule, getScheduleStudio, getOrarioGiorno, getOrarioStudio,
    oreContrattualiMensili, oreStudioSettimanali,
    tariffaCalcolata, stipendioMensileNetto, reddtitoMedioMensile,
    GIORNI_SETTIMANA,
  }
}
