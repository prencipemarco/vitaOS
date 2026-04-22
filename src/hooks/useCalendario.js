import { useLocalStorage } from './useLocalStorage'

export const TIPI_EVENTO = {
  lavoro:       { label: 'Lavoro',       color: '#3A5F8A' },
  straordinario:{ label: 'Straordinario',color: '#C46A3C' },
  malattia:     { label: 'Malattia',     color: '#A04545' },
  ferie:        { label: 'Ferie',        color: '#3A7059' },
  permesso:     { label: 'Permesso',     color: '#7A5FA0' },
  personale:    { label: 'Personale',    color: '#888'    },
}

export function useCalendario() {
  const [events, setEvents] = useLocalStorage('wl_calendario', [])
  let _nid = Date.now()

  const addEvent = (ev) => {
    const id = ++_nid
    setEvents(prev => [...prev, { ...ev, id }])
    return id
  }

  const removeEvent = (id) => setEvents(prev => prev.filter(e => e.id !== id))

  const updateEvent = (id, patch) =>
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))

  const eventsForDate = (dateStr) =>
    events.filter(e => e.data === dateStr).sort((a, b) => (a.ora || '').localeCompare(b.ora || ''))

  const eventsForMonth = (year, month) =>
    events.filter(e => {
      const d = new Date(e.data + 'T12:00')
      return d.getFullYear() === year && d.getMonth() === month
    })

  const countFerie = (year) =>
    events.filter(e => {
      const d = new Date(e.data + 'T12:00')
      return d.getFullYear() === year && e.tipo === 'ferie'
    }).length

  const countPermessi = (year) => {
    const dayPerm = events.filter(e => {
      const d = new Date(e.data + 'T12:00')
      return d.getFullYear() === year && e.tipo === 'permesso'
    })
    return dayPerm.reduce((s, e) => s + (parseFloat(e.ore) || 8), 0)
  }

  return { events, addEvent, removeEvent, updateEvent, eventsForDate, eventsForMonth, countFerie, countPermessi }
}
