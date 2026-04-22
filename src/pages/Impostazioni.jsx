import { useState } from 'react'
import { useImpostazioni, GIORNI_SETTIMANA as GIORNI } from '../hooks/useImpostazioni'
import { exportBackup, importBackup, resetSezione, resetTutto, SEZIONI } from '../utils/backupManager'
import { formatCurrency } from '../utils/dateHelpers'
import { showConfirm, showSuccess, showError } from '../components/ui'

function Row({ label, sub, children }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bd)',gap:12 }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:500 }}>{label}</div>
        {sub&&<div style={{ fontSize:11,color:'var(--t3)',marginTop:1 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  )
}
function Inp({ value,onChange,type='text',style,...rest }) {
  return <input className="input-field" type={type} value={value||''} onChange={onChange}
    style={{ maxWidth:150,fontFamily:type==='number'?"'DM Mono',monospace":undefined,...style }} {...rest} />
}
function ToggleBtn({ checked, onChange }) {
  return (
    <button className="toggle" onClick={()=>onChange(!checked)} style={{ border:'none',cursor:'pointer' }}>
      <span style={{ position:'absolute',left:2,top:2,width:13,height:13,background:'var(--ac)',borderRadius:'50%',
        transition:'transform .2s',display:'block',transform:checked?'translateX(15px)':'none' }} />
    </button>
  )
}
const MESI_N=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const GIORNI_FULL=[{id:1,l:'Lun'},{id:2,l:'Mar'},{id:3,l:'Mer'},{id:4,l:'Gio'},{id:5,l:'Ven'},{id:6,l:'Sab'},{id:0,l:'Dom'}]

export default function Impostazioni() {
  const { settings, update, updateScheduleGiorno, updateStudioGiorno, getSchedule, getScheduleStudio, oreContrattualiMensili, oreStudioSettimanali, tariffaCalcolata, reddtitoMedioMensile } = useImpostazioni()
  const [tab, setTab] = useState('config')
  const sch = getSchedule()
  const schStudio = getScheduleStudio()
  const oreContr = oreContrattualiMensili()
  const oreStudioSett = oreStudioSettimanali()
  const tariffaCalc = tariffaCalcolata()
  const redditoMedio = reddtitoMedioMensile()
  const stipNetto = parseFloat(settings.stipendioNetto)||0

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if(!file) return
    try { await importBackup(file); showSuccess('Backup importato. Ricarica la pagina.') }
    catch(err) { showError(err.message) }
    e.target.value=''
  }
  const handleResetSezione = (key) => showConfirm(`Cancellare: ${SEZIONI[key].label}?`, () => {
    resetSezione(key); setTimeout(()=>window.location.reload(),400)
  })
  const handleResetTutto = () => showConfirm('Cancellare TUTTI i dati? Operazione irreversibile.', () => {
    resetTutto(); window.location.reload()
  })

  return (
    <div style={{ padding:28,animation:'fadeUp .24s ease both' }}>
      <div style={{ marginBottom:20 }}>
        <div className="label-xs" style={{ marginBottom:4 }}>sistema</div>
        <div style={{ fontSize:20,fontWeight:700,letterSpacing:'-.02em',marginBottom:16 }}>Configurazione & Impostazioni</div>
        <div style={{ display:'inline-flex',border:'1px solid var(--bd2)',borderRadius:9,overflow:'hidden',background:'var(--sf)' }}>
          {[{id:'config',l:'Configurazione'},{id:'impostazioni',l:'Impostazioni'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:'7px 20px',border:'none',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",transition:'all .16s',
                background:tab===t.id?'var(--ac)':'transparent',color:tab===t.id?'#fff':'var(--t2)' }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {tab==='config'&&(
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>

          {/* Profilo */}
          <div className="card card-1">
            <div className="label-xs" style={{ marginBottom:4 }}>profilo e contratto</div>
            <Row label="Nome" sub="Visualizzato nella sidebar">
              <Inp value={settings.name} onChange={e=>update('name',e.target.value)} placeholder="Il tuo nome" style={{ maxWidth:170 }} />
            </Row>
            <Row label="Tipo contratto">
              <select className="input-field" style={{ maxWidth:160 }} value={settings.tipoContratto} onChange={e=>update('tipoContratto',e.target.value)}>
                <option value="dipendente">Dipendente</option>
                <option value="freelance">Freelance / P.IVA</option>
              </select>
            </Row>
            <Row label="Stipendio netto/mese" sub="Usato per calcoli">
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Inp type="number" value={settings.stipendioNetto} onChange={e=>update('stipendioNetto',e.target.value)} placeholder="0" style={{ maxWidth:100 }} />
                <span style={{ fontSize:12,color:'var(--t2)' }}>€</span>
              </div>
            </Row>
            <Row label="Stipendio lordo/mese" sub="Solo riferimento">
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Inp type="number" value={settings.stipendioLordo} onChange={e=>update('stipendioLordo',e.target.value)} placeholder="0" style={{ maxWidth:100 }} />
                <span style={{ fontSize:12,color:'var(--t2)' }}>€</span>
              </div>
            </Row>
            <Row label="Tariffa oraria" sub={oreContr>0&&stipNetto>0?`Calcolata: €${tariffaCalc}/h`:'Sovrascrive il calcolo auto'}>
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Inp type="number" value={settings.tariffaOraria} onChange={e=>update('tariffaOraria',e.target.value)} placeholder="auto" style={{ maxWidth:80 }} />
                <span style={{ fontSize:12,color:'var(--t2)' }}>€/h</span>
              </div>
            </Row>
          </div>

          {/* Mensilità */}
          <div className="card card-2">
            <div className="label-xs" style={{ marginBottom:4 }}>mensilità e permessi</div>
            <Row label="Tredicesima"><ToggleBtn checked={!!settings.tredicesima} onChange={v=>update('tredicesima',v)} /></Row>
            {settings.tredicesima&&<Row label="Mese erogazione 13ª">
              <select className="input-field" style={{ maxWidth:140 }} value={settings.meseTredicesima??11} onChange={e=>update('meseTredicesima',parseInt(e.target.value))}>
                {MESI_N.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </Row>}
            <Row label="Quattordicesima"><ToggleBtn checked={!!settings.quattordicesima} onChange={v=>update('quattordicesima',v)} /></Row>
            {settings.quattordicesima&&<Row label="Mese erogazione 14ª">
              <select className="input-field" style={{ maxWidth:140 }} value={settings.meseQuattordicesima??6} onChange={e=>update('meseQuattordicesima',parseInt(e.target.value))}>
                {MESI_N.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </Row>}
            <Row label="Giorni ferie annui">
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Inp type="number" value={settings.giorniFerieAnnui} onChange={e=>update('giorniFerieAnnui',parseInt(e.target.value)||0)} style={{ maxWidth:70 }} />
                <span style={{ fontSize:12,color:'var(--t2)' }}>giorni</span>
              </div>
            </Row>
            <Row label="Ore permesso annue" sub="ROL / ex-festività">
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <Inp type="number" value={settings.orePermessoAnnuo} onChange={e=>update('orePermessoAnnuo',parseInt(e.target.value)||0)} style={{ maxWidth:70 }} />
                <span style={{ fontSize:12,color:'var(--t2)' }}>ore</span>
              </div>
            </Row>
            <div style={{ marginTop:12,padding:'10px 12px',background:'var(--sf2)',borderRadius:8 }}>
              <div className="label-xs" style={{ marginBottom:6 }}>parametri calcolati</div>
              {[['Ore contratto/mese',`${oreContr}h`],['Tariffa oraria',tariffaCalc>0?`€${tariffaCalc}/h`:'—'],['Reddito medio/mese',redditoMedio>0?formatCurrency(redditoMedio):'—']].map(([k,v])=>(
                <div key={k} style={{ display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12 }}>
                  <span style={{ color:'var(--t2)' }}>{k}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace",color:'var(--ac)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Orario settimanale */}
          <div className="card card-3" style={{ gridColumn:'1/-1' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14 }}>
              <div>
                <div className="label-xs">orario lavorativo settimanale</div>
                <div style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>
                  Attiva i giorni lavorativi e imposta l'orario — verrà mostrato nel calendario
                </div>
              </div>
              {oreContr>0&&<div style={{ fontSize:12,fontFamily:"'DM Mono',monospace",color:'var(--ac)',fontWeight:500 }}>{oreContr}h/mese</div>}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8 }}>
              {GIORNI_FULL.map(g=>{
                const s = sch[g.id]||{abilitato:false,dalle:'09:00',alle:'18:00',pausa:60}
                return (
                  <div key={g.id} style={{
                    border:'1px solid var(--bd)',borderRadius:10,padding:'10px 8px',
                    background:s.abilitato?'var(--ac-bg)':'transparent',
                    borderColor:s.abilitato?'rgba(196,106,60,.22)':'var(--bd)',
                    transition:'all .18s',
                  }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:s.abilitato?10:0 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:s.abilitato?'var(--ac)':'var(--t3)',letterSpacing:'.04em' }}>{g.l}</span>
                      <ToggleBtn checked={s.abilitato} onChange={v=>updateScheduleGiorno(g.id,{abilitato:v})} />
                    </div>
                    {s.abilitato&&(
                      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                        {[['dalle',s.dalle],['alle',s.alle]].map(([k,v])=>(
                          <div key={k}>
                            <div style={{ fontSize:9,color:'var(--t3)',marginBottom:2,letterSpacing:'.08em',textTransform:'uppercase' }}>{k}</div>
                            <input type="time" value={v} onChange={e=>updateScheduleGiorno(g.id,{[k]:e.target.value})}
                              className="input-field" style={{ padding:'4px 5px',fontSize:12,fontFamily:"'DM Mono',monospace" }} />
                          </div>
                        ))}
                        <div>
                          <div style={{ fontSize:9,color:'var(--t3)',marginBottom:2,letterSpacing:'.08em',textTransform:'uppercase' }}>pausa</div>
                          <select className="input-field" value={s.pausa} onChange={e=>updateScheduleGiorno(g.id,{pausa:parseInt(e.target.value)})}
                            style={{ padding:'4px 5px',fontSize:12 }}>
                            <option value={0}>—</option>
                            <option value={30}>30m</option>
                            <option value={60}>1h</option>
                            <option value={90}>1h30</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {/* Studio schedule */}
          <div className="card card-4" style={{ gridColumn:'1/-1' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <div className="label-xs">orario dedicato allo studio</div>
                <div style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>
                  Slot che lo scheduler userà per pianificare i task dei corsi
                </div>
              </div>
              {oreStudioSett>0&&<div style={{ fontSize:12,fontFamily:"'DM Mono',monospace",color:'#7A5FA0',fontWeight:500 }}>{oreStudioSett}h/settimana</div>}
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8 }}>
              {GIORNI_FULL.map(g=>{
                const s = schStudio[g.id]||{abilitato:false,dalle:'20:00',alle:'22:00',pausa:0}
                return (
                  <div key={g.id} style={{
                    border:'1px solid var(--bd)',borderRadius:10,padding:'10px 8px',
                    background:s.abilitato?'rgba(122,95,160,.08)':'transparent',
                    borderColor:s.abilitato?'rgba(122,95,160,.25)':'var(--bd)',
                    transition:'all .18s',
                  }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:s.abilitato?10:0 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:s.abilitato?'#7A5FA0':'var(--t3)',letterSpacing:'.04em' }}>{g.l}</span>
                      <ToggleBtn checked={s.abilitato} onChange={v=>updateStudioGiorno(g.id,{abilitato:v})} />
                    </div>
                    {s.abilitato&&(
                      <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                        {[['dalle',s.dalle],['alle',s.alle]].map(([k,v])=>(
                          <div key={k}>
                            <div style={{ fontSize:9,color:'var(--t3)',marginBottom:2,letterSpacing:'.08em',textTransform:'uppercase' }}>{k}</div>
                            <input type="time" value={v} onChange={e=>updateStudioGiorno(g.id,{[k]:e.target.value})}
                              className="input-field" style={{ padding:'4px 5px',fontSize:12,fontFamily:"'DM Mono',monospace" }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Anthropic API key */}
          <div className="card card-5">
            <div className="label-xs" style={{ marginBottom:4 }}>AI — chiave API Anthropic (opzionale)</div>
            <div style={{ fontSize:12,color:'var(--t2)',marginBottom:10,lineHeight:1.6 }}>
              Aggiungi la tua API key per abilitare la generazione automatica dei piani di studio. Senza chiave, il sistema genera il prompt da copiare manualmente in Claude.ai.
            </div>
            <Row label="API Key" sub="Salvata solo nel browser, mai trasmessa altrove">
              <input className="input-field" type="password" value={settings.anthropicApiKey||''}
                onChange={e=>update('anthropicApiKey',e.target.value)}
                placeholder="sk-ant-api03-..." style={{ maxWidth:240,fontFamily:"'DM Mono',monospace" }} />
            </Row>
          </div>
        </div>
      )}

      {tab==='impostazioni'&&(
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
          <div className="card card-1">
            <div className="label-xs" style={{ marginBottom:4 }}>backup e ripristino</div>
            <Row label="Esporta tutti i dati" sub="File JSON scaricabile">
              <button className="btn-ghost" onClick={()=>{exportBackup();showSuccess('Backup esportato.')}}>Esporta</button>
            </Row>
            <Row label="Importa backup" sub="Ripristina da file esportato">
              <label style={{ cursor:'pointer' }}>
                <span className="btn-ghost" style={{ display:'inline-block' }}>Scegli file</span>
                <input type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
              </label>
            </Row>
          </div>
          <div className="card card-2">
            <div className="label-xs" style={{ marginBottom:4 }}>informazioni sistema</div>
            {[['Versione','1.0.0'],['Storage','localStorage'],['Modalità','Offline'],['Framework','React 19 + Vite 8']].map(([k,v])=>(
              <div key={k} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--bd)',fontSize:12 }}>
                <span style={{ color:'var(--t2)' }}>{k}</span>
                <span style={{ fontFamily:"'DM Mono',monospace" }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card card-3">
            <div className="label-xs" style={{ marginBottom:8 }}>reset per sezione</div>
            {Object.entries(SEZIONI).map(([key,s])=>(
              <div key={key} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--bd)' }}>
                <span style={{ fontSize:12,color:'var(--t2)' }}>{s.label}</span>
                <button className="btn-danger" style={{ fontSize:11,padding:'3px 9px' }} onClick={()=>handleResetSezione(key)}>Reset</button>
              </div>
            ))}
          </div>
          <div className="card card-4">
            <div className="label-xs" style={{ marginBottom:8 }}>zona pericolosa</div>
            <div style={{ padding:'12px',background:'rgba(160,69,69,.05)',border:'1px solid rgba(160,69,69,.15)',borderRadius:8 }}>
              <div style={{ fontSize:13,fontWeight:500,color:'var(--rd)',marginBottom:6 }}>Reset completo</div>
              <div style={{ fontSize:12,color:'var(--t2)',lineHeight:1.6,marginBottom:10 }}>Cancella tutti i dati. Irreversibile — esporta prima un backup.</div>
              <button className="btn-ghost" style={{ borderColor:'rgba(160,69,69,.3)',color:'var(--rd)' }} onClick={handleResetTutto}>
                Elimina tutti i dati
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
