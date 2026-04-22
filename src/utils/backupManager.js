export const SEZIONI = {
  calendario:   { key:'wl_calendario',          label:'Calendario' },
  firme:        { key:'wl_firme',                label:'Foglio Firme' },
  finanze:      { key:'wl_finanze',              label:'Transazioni' },
  previste:     { key:'wl_finanze_previste',     label:'Transazioni previste' },
  goals:        { key:'wl_risparmi_goals',       label:'Obiettivi risparmio' },
  salvadanaio:  { key:'wl_salvadanaio',          label:'Salvadanaio libero' },
  studio_corsi: { key:'wl_studio_corsi',         label:'Corsi studio' },
  studio_tasks: { key:'wl_studio_tasks',         label:'Task studio' },
  impostazioni: { key:'wl_settings',             label:'Impostazioni' },
}
const ALL_KEYS = Object.values(SEZIONI).map(s=>s.key)

export function exportBackup() {
  const data = {}
  ALL_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v) data[k]=JSON.parse(v) })
  const blob = new Blob([JSON.stringify({ version:3, exportedAt:new Date().toISOString(), data },null,2)],{ type:'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`vitaOS-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
  URL.revokeObjectURL(url)
}
export function importBackup(file) {
  return new Promise((resolve,reject)=>{
    const r = new FileReader()
    r.onload = e => { try { const p=JSON.parse(e.target.result); const src=p.data||p; ALL_KEYS.forEach(k=>{ if(src[k]!==undefined) localStorage.setItem(k,JSON.stringify(src[k])) }); resolve(true) } catch { reject(new Error('File non valido')) } }
    r.onerror = ()=>reject(new Error('Errore lettura'))
    r.readAsText(file)
  })
}
export function resetSezione(key) { const s=SEZIONI[key]; if(s) localStorage.removeItem(s.key) }
export function resetTutto() { ALL_KEYS.forEach(k=>localStorage.removeItem(k)) }
