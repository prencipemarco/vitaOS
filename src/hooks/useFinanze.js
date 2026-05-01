import { useLocalStorage } from './useLocalStorage'

export const CATEGORIE_USCITE = ['Affitto/Mutuo','Alimentari','Trasporti','Svago','Salute','Abbonamenti','Bollette','Vestiario','Istruzione','Risparmio','Altro']
export const CATEGORIE_ENTRATE = ['Stipendio','Tredicesima','Quattordicesima','Freelance','Investimenti','Entrata extra','Regalo','Rimborso','Altro']

export function useFinanze() {
  const [transazioni, setTransazioni] = useLocalStorage('wl_finanze', [])
  const [previste, setPreviste] = useLocalStorage('wl_finanze_previste', [])

  const getSaldoDettagliato = () => {
    let bank = 0
    let cash = 0
    transazioni.forEach(t => {
      const val = t.tipo === 'entrata' ? t.importo : -t.importo
      if (t.account === 'cash') cash += val
      else bank += val // default 'bank' per transazioni vecchie
    })
    return { 
      bank: Math.round(bank * 100) / 100, 
      cash: Math.round(cash * 100) / 100, 
      totale: Math.round((bank + cash) * 100) / 100 
    }
  }

  const getSaldoDisponibile = () => getSaldoDettagliato().totale

  const addTransazione = (tx) => {
    const id = Date.now()
    setTransazioni(prev => [...prev, { 
      ...tx, 
      id, 
      importo: parseFloat(tx.importo),
      account: tx.account || 'bank'
    }])
    return id
  }

  const distribuisciSaldo = (nuovoCash, nuovoBank) => {
    const { cash: currentCash, bank: currentBank } = getSaldoDettagliato()
    const diffCash = nuovoCash - currentCash
    const diffBank = nuovoBank - currentBank
    
    const nuoveTx = []
    if (Math.abs(diffCash) > 0.01) {
      nuoveTx.push({
        id: Date.now(),
        desc: 'Rettifica saldo iniziale (Contanti)',
        importo: Math.abs(diffCash),
        tipo: diffCash > 0 ? 'entrata' : 'uscita',
        cat: 'Altro',
        account: 'cash',
        data: new Date().toISOString().slice(0, 10)
      })
    }
    if (Math.abs(diffBank) > 0.01) {
      nuoveTx.push({
        id: Date.now() + 1,
        desc: 'Rettifica saldo iniziale (Conto)',
        importo: Math.abs(diffBank),
        tipo: diffBank > 0 ? 'entrata' : 'uscita',
        cat: 'Altro',
        account: 'bank',
        data: new Date().toISOString().slice(0, 10)
      })
    }
    
    if (nuoveTx.length > 0) {
      setTransazioni(prev => [...prev, ...nuoveTx])
    }
  }

  const removeTransazione = (id) =>
    setTransazioni(prev => prev.filter(t => t.id !== id))

  const updateTransazione = (id, patch) => {
    setTransazioni(prev => prev.map(t => t.id === id ? { ...t, ...patch, importo: patch.importo !== undefined ? parseFloat(patch.importo) : t.importo } : t))
  }

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

  const andamentoSaldoStorico = () => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      // Fine del mese d
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const ds = endOfMonth.toISOString().slice(0, 10)
      
      const saldoAlPunto = transazioni
        .filter(t => t.data <= ds)
        .reduce((acc, t) => acc + (t.tipo === 'entrata' ? t.importo : -t.importo), 0)
      
      return { 
        mese: d.toLocaleDateString('it-IT', { month: 'short' }), 
        saldo: Math.round(saldoAlPunto * 100) / 100 
      }
    })
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
    transazioni, addTransazione, removeTransazione, updateTransazione,
    getSaldoDisponibile, getSaldoDettagliato, distribuisciSaldo,
    forMonth, riepilogo, perCategoria, andamentoMesi, andamentoSaldoStorico,
    previste, addPrevista, removePrevista, updatePrevista, confirmPrevista, previsteDelMese, totalePrevisteMese,
  }
}
