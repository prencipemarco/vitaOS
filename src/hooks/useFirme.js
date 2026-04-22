import { useLocalStorage } from './useLocalStorage'

function timeToMinutes(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function useFirme() {
  const [firme, setFirme] = useLocalStorage('wl_firme', [])

  // Check for duplicate date
  const hasDuplicate = (data) => firme.some(f => f.data === data)

  const addFirma = (firma) => {
    if (!firma.data || !firma.entrata || !firma.uscita) return { error: 'Campi mancanti' }
    if (hasDuplicate(firma.data)) return { error: 'Giornata già registrata per questa data' }
    const inM = timeToMinutes(firma.entrata)
    const outM = timeToMinutes(firma.uscita)
    if (outM <= inM) return { error: 'Orario uscita deve essere dopo entrata' }
    const id = Date.now()
    setFirme(prev => [...prev, { ...firma, id, pausa: Number(firma.pausa) || 0 }])
    return { success: true, id }
  }

  const removeFirma = (id) => setFirme(prev => prev.filter(f => f.id !== id))

  const calcOre = (firma) => {
    const net = timeToMinutes(firma.uscita) - timeToMinutes(firma.entrata) - (firma.pausa || 0)
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

  return { firme, addFirma, removeFirma, calcOre, totaleOre, stimaStipendio, hasDuplicate }
}
