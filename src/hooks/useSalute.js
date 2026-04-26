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

export const MUSCOLI = ['Petto','Schiena','Spalle','Bicipiti','Tricipiti','Quadricipiti','Femorali','Glutei','Addome','Polpacci','Altro']
export const EARTH_CIRCUMFERENCE_KM = 40075

export const DEFAULT_SCHEDA = {
  1: { tipo:'push',         nome:'Push — Petto & Tricipiti',  esercizi:[] },
  2: { tipo:'pull',         nome:'Pull — Schiena & Bicipiti', esercizi:[] },
  3: { tipo:'legs',         nome:'Gambe',                     esercizi:[] },
  4: { tipo:'riposo',       nome:'Riposo',                    esercizi:[] },
  5: { tipo:'upper',        nome:'Upper Body',                esercizi:[] },
  6: { tipo:'cardio',       nome:'Cardio',                    esercizi:[] },
  0: { tipo:'riposo_attivo',nome:'Riposo attivo',             esercizi:[] },
}

export function calcPace(distanza_km, durata_min) {
  if (!distanza_km || !durata_min || distanza_km <= 0) return null
  const dec = durata_min / distanza_km
  const mm = Math.floor(dec), ss = Math.round((dec - mm) * 60)
  return { decimal: dec, label: `${mm}'${String(ss).padStart(2,'0')}"` }
}
export function calcSpeed(distanza_km, durata_min) {
  if (!distanza_km || !durata_min || durata_min <= 0) return 0
  return Math.round((distanza_km / durata_min) * 60 * 10) / 10
}
export function formatDurata(min) {
  const h = Math.floor(min / 60), m = min % 60
  return h === 0 ? `${m}min` : `${h}h ${m > 0 ? m + 'min' : ''}`
}

export function useSalute() {
  const [scheda, setScheda]   = useLocalStorage('wl_salute_scheda', DEFAULT_SCHEDA)
  const [sessioni, setSessioni] = useLocalStorage('wl_salute_sessioni', [])
  const [corse, setCorse]     = useLocalStorage('wl_salute_corse', [])

  // ── Scheda ─────────────────────────────────────────────────
  const updateGiorno = (dow, patch) =>
    setScheda(prev => ({ ...prev, [dow]: { ...(prev[dow]||{}), ...patch } }))

  const addEsercizio = (dow, es) => {
    const id = `e_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
    const n = { serie:3, reps:10, peso:0, recupero_sec:90, muscolo:'Altro', note:'', ...es, id }
    setScheda(prev => ({ ...prev, [dow]: { ...(prev[dow]||{}), esercizi:[...(prev[dow]?.esercizi||[]),n] } }))
    return id
  }
  const removeEsercizio = (dow, id) =>
    setScheda(prev => ({ ...prev, [dow]: { ...prev[dow], esercizi:(prev[dow]?.esercizi||[]).filter(e=>e.id!==id) } }))
  const updateEsercizio = (dow, id, patch) =>
    setScheda(prev => ({ ...prev, [dow]: { ...prev[dow], esercizi:(prev[dow]?.esercizi||[]).map(e=>e.id===id?{...e,...patch}:e) } }))
  const moveEsercizio = (dow, from, to) =>
    setScheda(prev => {
      const arr = [...(prev[dow]?.esercizi||[])]
      const [el] = arr.splice(from,1); arr.splice(to,0,el)
      return { ...prev, [dow]: { ...prev[dow], esercizi:arr } }
    })

  // ── Sessioni palestra ──────────────────────────────────────
  const getSessioneOggi = () => {
    const today = new Date().toISOString().slice(0,10)
    return sessioni.find(s=>s.data===today) || null
  }
  const startSessione = (dow) => {
    const today = new Date().toISOString().slice(0,10)
    const g = scheda[dow]||{}
    const id = `sess_${Date.now()}`
    const nuova = {
      id, data:today, dow, tipo:g.tipo||'custom', nome:g.nome||'Allenamento',
      esercizi:(g.esercizi||[]).map(e=>({
        ...e, serie_log:Array.from({length:Math.max(1,parseInt(e.serie)||3)},()=>({reps:e.reps,peso:parseFloat(e.peso)||0,completata:false}))
      })),
      iniziataAlle:new Date().toISOString(), completata:false,
    }
    setSessioni(prev=>[...prev.filter(s=>s.data!==today),nuova])
    return id
  }
  const completaSerie = (sid,esId,idx,patch) =>
    setSessioni(prev=>prev.map(s=>{
      if(s.id!==sid) return s
      return {...s,esercizi:s.esercizi.map(e=>{
        if(e.id!==esId) return e
        return {...e,serie_log:e.serie_log.map((sr,i)=>i===idx?{...sr,...patch,completata:true}:sr)}
      })}
    }))
  const completaSessione = (sid) => {
    const s = sessioni.find(x=>x.id===sid); if(!s) return
    const durata = Math.round((Date.now()-new Date(s.iniziataAlle).getTime())/60000)
    setSessioni(prev=>prev.map(x=>x.id===sid?{...x,completata:true,completataAlle:new Date().toISOString(),durata_min:durata}:x))
  }
  const deleteSessione = (id) => setSessioni(prev=>prev.filter(s=>s.id!==id))

  // ── Corse ──────────────────────────────────────────────────
  const addCorsa = (corsa) => {
    const id = `corsa_${Date.now()}`
    const dist = parseFloat(corsa.distanza_km)||0
    const dur  = parseInt(corsa.durata_min)||0
    const nuova = {
      ...corsa, id,
      distanza_km: dist, durata_min: dur,
      velocita_media: calcSpeed(dist,dur),
      pace: calcPace(dist,dur),
      createdAt: new Date().toISOString(),
    }
    setCorse(prev=>[nuova,...prev])
    return id
  }
  const removeCorsa = (id) => setCorse(prev=>prev.filter(c=>c.id!==id))

  const getStatsCorse = () => {
    const ok = corse.filter(c=>c.distanza_km>0)
    const totaleKm = Math.round(ok.reduce((a,c)=>a+c.distanza_km,0)*100)/100
    const totalMin = ok.reduce((a,c)=>a+c.durata_min,0)
    const pctTerra = Math.min(100*Math.ceil(totaleKm/EARTH_CIRCUMFERENCE_KM),Math.round((totaleKm/EARTH_CIRCUMFERENCE_KM)*10000)/100)
    const pctTerraCurrent = Math.round((totaleKm % EARTH_CIRCUMFERENCE_KM / EARTH_CIRCUMFERENCE_KM)*10000)/100
    const giriTerra = Math.floor(totaleKm/EARTH_CIRCUMFERENCE_KM)
    const now = new Date()
    const thisMonth = ok.filter(c=>{const d=new Date(c.data+'T12:00');return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()})
    const kmMese = Math.round(thisMonth.reduce((a,c)=>a+c.distanza_km,0)*10)/10
    const bestPace = ok.filter(c=>c.pace?.decimal).sort((a,b)=>a.pace.decimal-b.pace.decimal)[0]
    const bestDist = ok.reduce((best,c)=>c.distanza_km>(best?.distanza_km||0)?c:best,null)
    const sorted = [...ok].sort((a,b)=>a.data.localeCompare(b.data))
    const paceList = sorted.filter(c=>c.pace?.decimal).slice(-20)
    const distList = sorted.slice(-20)
    const weeklyKm = (() => {
      const weeks = {}
      ok.forEach(c=>{
        const d=new Date(c.data+'T12:00')
        const diff=d.getDay()===0?6:d.getDay()-1
        const ws=new Date(d); ws.setDate(d.getDate()-diff)
        const key=ws.toISOString().slice(0,10)
        weeks[key]=(weeks[key]||0)+c.distanza_km
      })
      return Object.entries(weeks).sort(([a],[b])=>a.localeCompare(b)).slice(-8)
        .map(([data,km])=>({data:data.slice(5),km:Math.round(km*10)/10}))
    })()
    return { totaleKm, totalMin, pctTerra: pctTerraCurrent, giriTerra, numCorse:ok.length, kmMese, bestPace, bestDist, paceList, distList, weeklyKm }
  }

  // ── Stats palestra ─────────────────────────────────────────
  const getStatsGenerali = () => {
    const completate = sessioni.filter(s=>s.completata)
    const now = new Date()
    const thisMonth = completate.filter(s=>{const d=new Date(s.data+'T12:00');return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()}).length
    const doneSet = new Set(completate.map(x=>x.data))
    let streak=0; const d=new Date()
    while(doneSet.has(d.toISOString().slice(0,10))){streak++;d.setDate(d.getDate()-1)}
    const durataMedia = completate.filter(s=>s.durata_min).length>0
      ? Math.round(completate.filter(s=>s.durata_min).reduce((a,s)=>a+s.durata_min,0)/completate.filter(s=>s.durata_min).length) : 0
    return {total:completate.length,thisMonth,streak,durataMedia}
  }

  const getProgressiEsercizio = (nome) => {
    const res=[]
    sessioni.filter(s=>s.completata).sort((a,b)=>a.data.localeCompare(b.data)).forEach(s=>{
      const e=s.esercizi.find(x=>x.nome.toLowerCase()===nome.toLowerCase()); if(!e) return
      const pesi=e.serie_log.filter(sr=>sr.completata&&parseFloat(sr.peso)>0).map(sr=>parseFloat(sr.peso))
      const reps=e.serie_log.filter(sr=>sr.completata).map(sr=>parseInt(sr.reps)||0)
      if(pesi.length) res.push({data:s.data,pesoMax:Math.max(...pesi),pesoMedio:Math.round(pesi.reduce((a,b)=>a+b,0)/pesi.length*10)/10,volume:pesi.reduce((acc,p,i)=>acc+p*(reps[i]||0),0)})
    })
    return res
  }

  const getAllEserciziNomi = () => {
    const nomi=new Set()
    Object.values(scheda).forEach(g=>(g?.esercizi||[]).forEach(e=>nomi.add(e.nome)))
    sessioni.forEach(s=>(s.esercizi||[]).forEach(e=>nomi.add(e.nome)))
    return [...nomi].filter(Boolean).sort()
  }

  return {
    scheda, updateGiorno, addEsercizio, removeEsercizio, updateEsercizio, moveEsercizio,
    sessioni, getSessioneOggi, startSessione, completaSerie, completaSessione, deleteSessione,
    corse, addCorsa, removeCorsa, getStatsCorse,
    getStatsGenerali, getProgressiEsercizio, getAllEserciziNomi,
  }
}