export const SEZIONI = {
  calendario:    { key:'wl_calendario',          label:'Calendario' },
  firme:         { key:'wl_firme',               label:'Foglio Firme' },
  finanze:       { key:'wl_finanze',             label:'Transazioni' },
  previste:      { key:'wl_finanze_previste',    label:'Transazioni previste' },
  goals:         { key:'wl_risparmi_goals',      label:'Obiettivi risparmio' },
  salvadanaio:   { key:'wl_salvadanaio',         label:'Salvadanaio libero' },
  studio_corsi:  { key:'wl_studio_corsi',        label:'Corsi studio' },
  studio_tasks:  { key:'wl_studio_tasks',        label:'Task studio' },
  salute_scheda: { key:'wl_salute_scheda',       label:'Scheda allenamento' },
  salute_sessioni:{ key:'wl_salute_sessioni',    label:'Sessioni allenamento' },
  habits:        { key:'wl_habits',              label:'Abitudini' },
  notes:         { key:'wl_notes',               label:'Note' },
  impostazioni:  { key:'wl_settings',            label:'Impostazioni' },
}
const ALL_KEYS = Object.values(SEZIONI).map(s => s.key)

export function exportBackup() {
  const data = {}
  ALL_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v) data[k] = JSON.parse(v) })
  const blob = new Blob(
    [JSON.stringify({ version: 4, exportedAt: new Date().toISOString(), data }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vitaOS-backup-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = e => {
      try {
        const p = JSON.parse(e.target.result)
        const src = p.data || p
        ALL_KEYS.forEach(k => { if (src[k] !== undefined) localStorage.setItem(k, JSON.stringify(src[k])) })
        resolve(true)
      } catch { reject(new Error('File non valido')) }
    }
    r.onerror = () => reject(new Error('Errore lettura'))
    r.readAsText(file)
  })
}

export function resetSezione(key) {
  const s = SEZIONI[key]
  if (s) localStorage.removeItem(s.key)
}

export function resetTutto() {
  ALL_KEYS.forEach(k => localStorage.removeItem(k))
}

export function exportToCSV(key) {
  const raw = localStorage.getItem(SEZIONI[key]?.key)
  if (!raw) return
  const data = JSON.parse(raw)
  if (!Array.isArray(data) || data.length === 0) return

  let csv = ''
  if (key === 'finanze') {
    csv = 'Data,Titolo,Categoria,Importo,Tipo\n'
    csv += data.map(t => `${t.data},"${t.titolo}","${t.categoria}",${t.importo},${t.tipo}`).join('\n')
  } else if (key === 'salute_sessioni') {
    csv = 'Data,Nome,Tipo,Durata(min),Note\n'
    csv += data.map(s => `${s.data},"${s.nome}","${s.tipo}",${s.durata},"${s.note||''}"`).join('\n')
  }

  if (!csv) return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vitaOS-${key}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
