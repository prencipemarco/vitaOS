export const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
export const GIORNI_BREVI = ['L','M','M','G','V','S','D']

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatShort(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T12:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function toDateStr(date) {
  if (!date) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfWeek(year, month) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1 // Monday = 0
}

export function buildCalendarGrid(year, month) {
  const days = getDaysInMonth(year, month)
  const offset = getFirstDayOfWeek(year, month)
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}

export function formatCurrency(n, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

export function formatCurrencyDec(n, currency = 'EUR') {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
