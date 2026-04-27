import { useLocalStorage } from './useLocalStorage'

export const CATEGORIE_USCITE = ['Affitto/Mutuo','Alimentari','Trasporti','Svago','Salute','Abbonamenti','Bollette','Vestiario','Istruzione','Risparmio','Altro']
export const CATEGORIE_ENTRATE = ['Stipendio','Tredicesima','Quattordicesima','Freelance','Investimenti','Entrata extra','Regalo','Rimborso','Altro']

export function useFinanze() {
  const [transazioni, setTransazioni] = useLocalStorage('wl_finanze', [])
  const [previste, setPreviste] = useLocalStorage('wl_finanze_previste', [])

  const getSaldoDisponibile = () => {
    const entrate = transazioni.filter(t=>t.tipo==='entrata').reduce((s,t)=>s+t.importo,0)
    const uscite  = transazioni.filter(t=>t.tipo==='uscita').reduce((s,t)=>s+t.importo,0)
    return Math.round((entrate - uscite)*100)/100
  }

  const addTransazione = (tx) => {
    const id = Date.now()
    setTransazioni(prev => [...prev, { ...tx, id, importo: parseFloat(tx.importo) }])
    return id
  }

  const removeTransazione = (id) =>
    setTransazioni(prev => prev.filter(t => t.id !== id))

  const forMonth = (year, month) =>
    transazioni.filter(t => {
      const d = new Date(t.data+'T12:00')
      return d.getFullYear()===year && d.getMonth()===month
    })

  const riepilogo = (year, month) => {
    const mese = forMonth(year, month)
    const entrate = mese.filter(t=>t.tipo==='entrata').reduce((s,t)=>s+t.importo,0)
    const uscite  = mese.filter(t=>t.tipo==='uscita').reduce((s,t)=>s+t.importo,0)
    return { entrate, uscite, netto: entrate - uscite }
  }

  const perCategoria = (year, month) => {
    const acc = {}
    forMonth(year, month).filter(t=>t.tipo==='uscita').forEach(t => {
      acc[t.cat] = (acc[t.cat]||0)+t.importo
    })
    return Object.entries(acc).map(([name,value])=>({ name, value }))
      .sort((a,b)=>b.value-a.value)
  }

  const andamentoMesi = () => {
    const now = new Date()
    return Array.from({ length:6 }, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
      const r = riepilogo(d.getFullYear(), d.getMonth())
      return { mese:d.toLocaleDateString('it-IT',{ month:'short' }), ...r }
    })
  }

  // Previste
  const addPrevista = (tx) => {
    const id = Date.now()
    setPreviste(prev => [...prev, { ...tx, id, importo:parseFloat(tx.importo) }])
    return id
  }
  const removePrevista = (id) => setPreviste(prev => prev.filter(t=>t.id!==id))
  const updatePrevista = (id, patch) => {
    setPreviste(prev => prev.map(p => p.id === id ? { ...p, ...patch, importo: patch.importo !== undefined ? parseFloat(patch.importo) : p.importo } : p))
  }
  
  const confirmPrevista = (id, dataEffettiva, patch) => {
    let p = previste.find(x => x.id === id)
    if (!p) return
    if (patch) {
      p = { ...p, ...patch, importo: patch.importo !== undefined ? parseFloat(patch.importo) : p.importo }
    }
    addTransazione({
      desc: p.desc,
      importo: p.importo,
      tipo: p.tipo,
      cat: p.cat,
      data: dataEffettiva || new Date().toISOString().slice(0,10)
    })
    removePrevista(id)
  }

  const previsteDelMese = (year, month) =>
    previste.filter(p => {
      if (!p.mese) return true
      const d = new Date(p.mese+'-01T12:00')
      return d.getFullYear()===year && d.getMonth()===month
    })
  const totalePrevisteMese = (year, month) => {
    const lista = previsteDelMese(year, month)
    return {
      uscite:  lista.filter(p=>p.tipo==='uscita').reduce((s,p)=>s+p.importo,0),
      entrate: lista.filter(p=>p.tipo==='entrata').reduce((s,p)=>s+p.importo,0),
    }
  }

  return {
    transazioni, addTransazione, removeTransazione,
    getSaldoDisponibile,
    forMonth, riepilogo, perCategoria, andamentoMesi,
    previste, addPrevista, removePrevista, updatePrevista, confirmPrevista, previsteDelMese, totalePrevisteMese,
  }
}
