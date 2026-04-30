import { useLocalStorage } from './useLocalStorage'

function timeToMin(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function useFirme() {
  const [firme, setFirme] = useLocalStorage('wl_firme', [])

  const checkOverlap = (data, entrata, uscita) => {
    const inM = timeToMin(entrata)
    const outM = timeToMin(uscita)
    return firme
      .filter(f => f.data === data)
      .some(f => {
        const fIn = timeToMin(f.entrata)
        const fOut = timeToMin(f.uscita)
        // Sovrapposizione se l'inizio o la fine del nuovo intervallo cade dentro uno esistente
        return (inM >= fIn && inM < fOut) || (outM > fIn && outM <= fOut) || (inM <= fIn && outM >= fOut)
      })
  }

  const addFirma = (firma) => {
    if (!firma.data || !firma.entrata || !firma.uscita) return { error: 'Campi mancanti' }
    if (checkOverlap(firma.data, firma.entrata, firma.uscita)) {
      return { error: 'Orario sovrapposto a una sessione esistente' }
    }
    const inM = timeToMin(firma.entrata)
    const outM = timeToMin(firma.uscita)
    if (outM <= inM) return { error: 'Orario uscita deve essere dopo entrata' }
    const id = Date.now()
    setFirme(prev => [...prev, { data: firma.data, entrata: firma.entrata, uscita: firma.uscita, id }])
    return { success: true, id }
  }

  const removeFirma = (id) => setFirme(prev => prev.filter(f => f.id !== id))

  const calcOre = (firma) => {
    const net = timeToMin(firma.uscita) - timeToMin(firma.entrata)
    return Math.max(0, Math.round((net / 60) * 100) / 100)
  }

  const totaleOre = (year, month) => {
    const mese = firme.filter(f => {
      const d = new Date(f.data + 'T12:00')
      return d.getFullYear() === year && d.getMonth() === month
    })
    return Math.round(mese.reduce((s, f) => s + calcOre(f), 0) * 100) / 100
  }

  const stimaStipendio = (year, month, rate) =>
    Math.round(totaleOre(year, month) * rate)

  return { firme, addFirma, removeFirma, calcOre, totaleOre, stimaStipendio, checkOverlap }
}
