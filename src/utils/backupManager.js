import { get, set, del } from 'idb-keyval'
import { z } from 'zod'

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
  salute_corse:   { key:'wl_salute_corse',       label:'Sessioni corsa/cardio' },
  habits:        { key:'wl_habits',              label:'Abitudini' },
  notes:         { key:'wl_notes',               label:'Note' },
  impostazioni:  { key:'wl_settings',            label:'Impostazioni' },
}
const ALL_KEYS = Object.values(SEZIONI).map(s => s.key)

const BackupSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  data: z.record(z.string(), z.any()).optional()
}).or(z.record(z.string(), z.any()))

export async function exportBackup() {
  const data = {}
  for (const k of ALL_KEYS) {
    const v = await get(k)
    if (v !== undefined) data[k] = v
  }
  const blob = new Blob(
    [JSON.stringify({ version: 5, exportedAt: new Date().toISOString(), data }, null, 2)],
    { type: 'application/json' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vitaOS-backup-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importBackup(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = async e => {
      try {
        const raw = JSON.parse(e.target.result)
        const parsed = BackupSchema.parse(raw)
        const src = parsed.data || parsed
        
        for (const k of ALL_KEYS) {
          if (src[k] !== undefined) await set(k, src[k])
        }
        resolve(true)
      } catch (err) { 
        reject(new Error('File non valido o corrotto: ' + err.message)) 
      }
    }
    r.onerror = () => reject(new Error('Errore lettura'))
    r.readAsText(file)
  })
}

export async function resetSezione(key) {
  const s = SEZIONI[key]
  if (s) {
    await del(s.key)
    localStorage.removeItem(s.key)
  }
}

export async function resetTutto() {
  for (const k of ALL_KEYS) {
    await del(k)
    localStorage.removeItem(k)
  }
}

export async function exportToCSV(key) {
  const s = SEZIONI[key]
  if (!s) return
  const data = await get(s.key)
  if (!Array.isArray(data) || data.length === 0) return

  let csv = ''
  if (key === 'finanze') {
    csv = 'Data,Titolo,Categoria,Importo,Tipo\n'
    csv += data.map(t => `${t.data},"${t.desc||t.titolo}","${t.cat||t.categoria}",${t.importo},${t.tipo}`).join('\n')
  } else if (key === 'salute_sessioni') {
    csv = 'Data,Nome,Tipo,Durata(min),Note\n'
    csv += data.map(s => `${s.data},"${s.nome}","${s.tipo}",${s.durata_min||s.durata},"${s.note||''}"`).join('\n')
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
