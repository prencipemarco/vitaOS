import { useState } from 'react'
import { useCalendario, TIPI_EVENTO } from '../hooks/useCalendario'
import { useRisparmi } from '../hooks/useRisparmi'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useStudio } from '../hooks/useStudio'
import { useSalute, TIPI_GIORNO } from '../hooks/useSalute'
import { getFestivita, getPonti, isFestivita, getFestivitaNome } from '../utils/festivita'
import { buildCalendarGrid, MESI, GIORNI_BREVI, todayStr, formatShort } from '../utils/dateHelpers'
import { PageHeader, SectionHeader, FormPanel, InputRow, Badge, EmptyState, showConfirm, OnboardingModal } from '../components/ui'

const STUDIO_COLOR = '#7A5FA0'
const GYM_COLOR    = '#3A7059'

function MonthNavInline({ year, month, onChange }) {
  const prev = () => month===0?onChange(year-1,11):onChange(year,month-1)
  const next = () => month===11?onChange(year+1,0):onChange(year,month+1)
  return (
    <div style={{display:'flex',gap:6}}>
      <button className="btn-ghost btn-sm" onClick={prev} style={{padding:'3px 9px'}}>‹</button>
      <button className="btn-ghost btn-sm" onClick={next} style={{padding:'3px 9px'}}>›</button>
    </div>
  )
}

export default function Calendario() {
  const now = new Date()
  const [year,setYear]   = useState(now.getFullYear())
  const [month,setMonth] = useState(now.getMonth())
  const [selected,setSelected] = useState(todayStr())
  const [formOpen, setFormOpen] = useState(false)
  const [showPonti,setShowPonti] = useState(false)
  const [form, setForm] = useState({ titolo:'', data:todayStr(), ora:'', oraFine:'', tipo:'lavoro', note:'', ore:8 })

  const {events,addEvent,removeEvent,eventsForDate,eventsForMonth,countFerie,countPermessi} = useCalendario()
  const {goals} = useRisparmi()
  const {getOrarioGiorno,getOrarioStudio,getSchedulePalestra} = useImpostazioni()
  const {corsi,getTasksForCorso} = useStudio()
  const {scheda:schedaSalute,sessioni:sessioniSalute} = useSalute()

  const festivita  = getFestivita(year)
  const ponti      = getPonti(year)
  const festivitaMonth = festivita.filter(f=>{const d=new Date(f.data+'T12:00');return d.getFullYear()===year&&d.getMonth()===month})
  const pontiMonth = ponti.filter(p=>{const d=new Date(p.data+'T12:00');return d.getFullYear()===year&&d.getMonth()===month})

  const cells      = buildCalendarGrid(year,month)
  const today      = todayStr()
  const monthEvents= eventsForMonth(year,month)
  const toDateStr  = d=>`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const palSched   = getSchedulePalestra()

  const goalDeadlines = goals.filter(g=>g.scadenza).map(g=>({
    id:`goal-${g.id}`,data:g.scadenza,titolo:`📅 ${g.nome}`,tipo:'scadenza',ora:''
  }))

  const getStudyTasksForDate = (ds) => {
    const result=[]
    corsi.forEach(corso=>{
      getTasksForCorso(corso.id).filter(t=>t.dataPianificata===ds&&!t.completato)
        .forEach(t=>result.push({...t,corsoNome:corso.nome,corsoId:corso.id}))
    })
    return result.sort((a,b)=>(a.oraPianificata||'').localeCompare(b.oraPianificata||''))
  }

  // ── Schedule labels for a cell ─────────────────────────────
  // Only shows: Lavoro HH:MM–HH:MM, Studio HH:MM–HH:MM, Esercizio HH:MM–HH:MM
  const getLabelsForDate = (d) => {
    if (!d) return []
    const ds = toDateStr(d)
    const dow = new Date(ds+'T12:00').getDay()
    const labels = []
    // Lavoro
    const wo = getOrarioGiorno(dow)
    if (wo?.abilitato&&wo.dalle&&!isFestivita(ds,year))
      labels.push({text:`${wo.dalle}–${wo.alle}`,color:'#3A5F8A',prefix:'Lavoro'})
    // Studio
    const st = getOrarioStudio(dow)
    if (st?.abilitato) {
      ;['mattina','pomeriggio'].forEach(f=>{
        const slot=st[f]
        if(slot?.abilitato&&slot.dalle) labels.push({text:`${slot.dalle}–${slot.alle}`,color:STUDIO_COLOR,prefix:'Studio'})
      })
    }
    // Palestra — solo se il giorno è configurato come giorno di palestra
    const gp = palSched[dow]
    const giornoScheda = schedaSalute[dow]
    const isGymDay = gp?.abilitato && gp.dalle && gp.alle
    const isRest   = !giornoScheda || giornoScheda.tipo==='riposo' || giornoScheda.tipo==='riposo_attivo'
    if (isGymDay && !isRest)
      labels.push({text:`${gp.dalle}–${gp.alle}`,color:GYM_COLOR,prefix:'Esercizio'})
    return labels
  }

  // ── Cell items (event chips) ───────────────────────────────
  // Gym NON appare come chip separato — è già nei labels sopra
  const allCellItems = (d) => {
    if (!d) return []
    const ds = toDateStr(d)
    return [
      ...monthEvents.filter(e=>e.data===ds),
      ...goalDeadlines.filter(g=>g.data===ds),
      ...getStudyTasksForDate(ds),
    ]
  }

  const selectedEvents  = selected ? eventsForDate(selected) : []
  const selectedGoals   = goalDeadlines.filter(g=>g.data===selected)
  const selectedStudy   = selected ? getStudyTasksForDate(selected) : []
  const allSelected     = [...selectedEvents,...selectedGoals,...selectedStudy]

  const handleAdd = () => {
    if (!form.titolo.trim()||!form.data) return
    addEvent({...form})
    setForm({titolo:'',data:selected||today,ora:'',tipo:'lavoro',note:'',ore:'8'})
    setFormOpen(false)
  }
  const handleRemove = (id) => showConfirm('Rimuovere questo evento?',()=>removeEvent(id))
  const handleCellClick = d => {
    if (!d) return
    const ds = toDateStr(d)
    setSelected(ds)
    setForm(f=>({...f,data:ds}))
  }

  const festNome = d => d ? getFestivitaNome(toDateStr(d),year) : null

  return (
    <div style={{padding:'20px 28px',animation:'fadeUp .24s ease both'}}>
      <OnboardingModal 
        sectionId="calendario"
        title="Calendario Intelligente"
        icon="📅"
        description="Qui puoi visualizzare tutti i tuoi impegni. Il sistema integra automaticamente i tuoi orari di lavoro, di studio e gli allenamenti in palestra, mostrandoti anche le scadenze degli obiettivi di risparmio e i ponti festivi."
      />
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div>
            <div className="label-xs" style={{marginBottom:4}}>calendario</div>
            <div style={{fontSize:20,fontWeight:700,letterSpacing:'-.02em',display:'flex',alignItems:'center',gap:10}}>
              {MESI[month]} {year}
              <MonthNavInline year={year} month={month} onChange={(y,m)=>{setYear(y);setMonth(m);setSelected(null)}} />
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace"}}>
            <span style={{color:TIPI_EVENTO.ferie.color,marginRight:3}}>■</span>{countFerie(year)}g ferie
          </span>
          <span style={{fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace"}}>
            <span style={{color:TIPI_EVENTO.permesso.color,marginRight:3}}>■</span>{countPermessi(year)}h perm.
          </span>
          <span style={{fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace"}}>
            <span style={{color:'#E8B84B',marginRight:3}}>■</span>{festivitaMonth.length} fest.
          </span>
          <button className="btn-ghost btn-sm" onClick={()=>setShowPonti(v=>!v)}
            style={{fontSize:11,padding:'4px 9px',color:showPonti?'var(--ac)':undefined,borderColor:showPonti?'var(--ac)':undefined}}>
            {showPonti?'▲':'◈'} ponti ({pontiMonth.length})
          </button>
        </div>
      </div>

      {showPonti&&pontiMonth.length>0&&(
        <div style={{marginBottom:12,padding:'9px 14px',background:'rgba(232,184,75,.08)',border:'1px solid rgba(232,184,75,.2)',borderRadius:9,animation:'slideDown .18s ease',display:'flex',flexWrap:'wrap',gap:8}}>
          {pontiMonth.map((p,i)=>(
            <div key={i} style={{fontSize:12,color:'var(--t2)',background:'rgba(232,184,75,.1)',padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,184,75,.18)'}}>
              🌉 {p.suggerimento}
            </div>
          ))}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 248px',gap:14,alignItems:'start'}}>
        {/* ── Calendar grid ── */}
        <div className="card card-1" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'var(--sf2)',borderBottom:'1px solid var(--bd)'}}>
            {GIORNI_BREVI.map((g,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:10,fontWeight:700,letterSpacing:'.1em',color:'var(--t3)',padding:'9px 0'}}>{g}</div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
            {cells.map((d,i)=>{
              const ds   = d ? toDateStr(d) : null
              const isToday  = ds===today
              const isSel    = ds===selected
              const isWeekend= (i%7)>=5
              const fest = festNome(d)
              const cellItems = allCellItems(d)
              const schedLabels = getLabelsForDate(d)

              return (
                <div key={i} onClick={()=>handleCellClick(d)}
                  style={{
                    minHeight:130,padding:'5px 4px 4px',
                    borderRight:(i%7)<6?'1px solid var(--bd)':'none',
                    borderBottom:'1px solid var(--bd)',
                    cursor:d?'pointer':'default',
                    background:isSel?'var(--ac-bg)':fest?'rgba(232,184,75,.06)':isToday?'var(--sf2)':isWeekend&&d?'rgba(0,0,0,.01)':'transparent',
                    transition:'background .12s',
                  }}
                  onMouseEnter={e=>{if(d&&!isSel)e.currentTarget.style.background='var(--sf2)'}}
                  onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background=fest?'rgba(232,184,75,.06)':isToday?'var(--sf2)':(isWeekend&&d?'rgba(0,0,0,.01)':'transparent')}}
                >
                  {d&&(
                    <>
                      {/* Day number */}
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:3}}>
                        {isToday
                          ? <span style={{width:20,height:20,borderRadius:'50%',background:'var(--ac)',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{d}</span>
                          : <span style={{fontSize:12,color:isWeekend||fest?'var(--t3)':'var(--t2)',fontWeight:isSel?600:400}}>{d}</span>
                        }
                        {fest&&<span style={{fontSize:7,background:'rgba(232,184,75,.22)',color:'#7A6020',borderRadius:3,padding:'1px 3px',fontWeight:600,lineHeight:1.4,maxWidth:52,textAlign:'right',flexShrink:0}}>{fest.slice(0,12)}</span>}
                      </div>

                      {/* Schedule labels: Lavoro / Studio / Esercizio */}
                      {schedLabels.length>0&&(
                        <div style={{display:'flex',flexDirection:'column',gap:1,marginBottom:3}}>
                          {schedLabels.map((sl,si)=>(
                            <div key={si} style={{fontSize:8,fontFamily:"'DM Mono',monospace",color:sl.color,opacity:.75,lineHeight:1.3}}>
                              {sl.prefix} {sl.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Event chips */}
                      <div style={{display:'flex',flexDirection:'column',gap:2}}>
                        {cellItems.slice(0,4).map((item,ci)=>{
                          const isStudy = !!item.corsoNome
                          const isGoal  = item.id?.toString().startsWith('goal-')
                          const color   = isGoal?'#7A5FA0':isStudy?STUDIO_COLOR:(TIPI_EVENTO[item.tipo]?.color||'#888')
                          const label   = isStudy?(item.corsoNome?.slice(0,14)||item.titolo):item.titolo
                          return (
                            <div key={item.id||ci} style={{
                              background:color+'1A',borderLeft:`2px solid ${color}`,
                              color,fontSize:9,fontWeight:500,
                              padding:'1px 4px',borderRadius:'0 3px 3px 0',
                              whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.6,
                            }}>
                              {(item.ora||item.oraPianificata)&&<span style={{opacity:.6,marginRight:2,fontFamily:"'DM Mono',monospace",fontSize:8}}>{item.ora||item.oraPianificata}</span>}
                              {label}
                            </div>
                          )
                        })}
                        {cellItems.length>4&&<div style={{fontSize:8,color:'var(--t3)',paddingLeft:4}}>+{cellItems.length-4} altri</div>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div className="card card-2">
            <SectionHeader action={
              <button className="btn-ghost btn-sm" onClick={()=>setFormOpen(f=>!f)}>
                {formOpen?'✕':'+ evento'}
              </button>
            }>
              {selected?formatShort(selected):'seleziona giorno'}
            </SectionHeader>

            {/* Day info panel */}
            {selected&&(()=>{
              const dow  = new Date(selected+'T12:00').getDay()
              const wo   = getOrarioGiorno(dow)
              const st   = getOrarioStudio(dow)
              const gp   = palSched[dow]
              const gg   = schedaSalute[dow]
              const isGymDay = gp?.abilitato&&gp.dalle&&gg&&gg.tipo!=='riposo'&&gg.tipo!=='riposo_attivo'
              return (
                <div style={{marginBottom:8,display:'flex',flexDirection:'column',gap:4}}>
                  {wo?.abilitato&&!isFestivita(selected,year)&&(
                    <div style={{padding:'5px 9px',background:'#3A5F8A11',borderLeft:'2px solid #3A5F8A',borderRadius:'0 6px 6px 0',fontSize:11,color:'#3A5F8A',fontFamily:"'DM Mono',monospace"}}>
                      Lavoro {wo.dalle} → {wo.alle}
                    </div>
                  )}
                  {st?.abilitato&&['mattina','pomeriggio'].map(f=>{
                    const slot=st[f]; if(!slot?.abilitato||!slot.dalle) return null
                    return <div key={f} style={{padding:'5px 9px',background:STUDIO_COLOR+'11',borderLeft:`2px solid ${STUDIO_COLOR}`,borderRadius:'0 6px 6px 0',fontSize:11,color:STUDIO_COLOR,fontFamily:"'DM Mono',monospace"}}>
                      Studio ({f}) {slot.dalle} → {slot.alle}
                    </div>
                  })}
                  {isGymDay&&(
                    <div style={{padding:'5px 9px',background:GYM_COLOR+'11',borderLeft:`2px solid ${GYM_COLOR}`,borderRadius:'0 6px 6px 0',fontSize:11,color:GYM_COLOR,fontFamily:"'DM Mono',monospace"}}>
                      Esercizio {gp.dalle} → {gp.alle}
                      {gp.sede&&<span style={{opacity:.7}}> · {gp.sede}</span>}
                      <div style={{opacity:.6,fontSize:10,marginTop:1}}>+{gp.bufferMinuti||30}min viaggio per lato</div>
                    </div>
                  )}
                  {!isGymDay&&gg&&(gg.tipo==='riposo'||gg.tipo==='riposo_attivo')&&gp?.abilitato===false&&(
                    <div style={{padding:'5px 9px',background:'rgba(136,136,136,.08)',borderLeft:'2px solid #aaa',borderRadius:'0 6px 6px 0',fontSize:11,color:'var(--t3)'}}>
                      {gg.tipo==='riposo_attivo'?'🚶 Riposo attivo':'😴 Riposo'}
                    </div>
                  )}
                  {isFestivita(selected,year)&&(
                    <div style={{padding:'5px 9px',background:'rgba(232,184,75,.1)',borderLeft:'2px solid #E8B84B',borderRadius:'0 6px 6px 0',fontSize:11,color:'#7A6020'}}>
                      🎉 {getFestivitaNome(selected,year)}
                    </div>
                  )}
                </div>
              )
            })()}

            <FormPanel open={formOpen}>
              <input className="input-field" placeholder="Titolo evento" value={form.titolo}
                onChange={e=>setForm(f=>({...f,titolo:e.target.value}))} />
              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                <input className="input-field" type="date" value={form.data}
                  onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={{flex:1}} />
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <input className="input-field" type="time" value={form.ora}
                    onChange={e=>setForm(f=>({...f,ora:e.target.value}))} style={{width:74, padding:'7px 4px', fontSize:11}} title="Ora inizio" />
                  <span style={{color:'var(--t3)', fontSize:10}}>→</span>
                  <input className="input-field" type="time" value={form.oraFine||''}
                    onChange={e=>setForm(f=>({...f,oraFine:e.target.value}))} style={{width:74, padding:'7px 4px', fontSize:11}} title="Ora fine (opzionale)" />
                </div>
              </div>
              <select className="input-field" value={form.tipo}
                onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                {Object.entries(TIPI_EVENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              {form.tipo==='permesso'&&(
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <span style={{fontSize:11,color:'var(--t3)',whiteSpace:'nowrap'}}>Ore:</span>
                  <input className="input-field" type="number" min="1" max="8" value={form.ore}
                    onChange={e=>setForm(f=>({...f,ore:e.target.value}))} style={{maxWidth:70}} />
                </div>
              )}
              <input className="input-field" placeholder="Note (opz.)" value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
              <InputRow>
                <button className="btn-ghost" onClick={()=>setFormOpen(false)}>Annulla</button>
                <button className="btn-accent" onClick={handleAdd}>Salva</button>
              </InputRow>
            </FormPanel>

            {allSelected.length===0&&!formOpen
              ? <EmptyState message={selected?'Nessun evento':'Clicca un giorno'} />
              : allSelected.map((item,i)=>{
                const isStudy= !!item.corsoNome
                const isGoal = item.id?.toString().startsWith('goal-')
                const color  = isGoal?'#7A5FA0':isStudy?STUDIO_COLOR:(TIPI_EVENTO[item.tipo]?.color||'#888')
                const badge  = isGoal?'Scadenza':isStudy?item.corsoNome:(TIPI_EVENTO[item.tipo]?.label||item.tipo)
                return (
                  <div key={item.id||i} style={{marginBottom:7,padding:'8px 10px',background:color+'11',borderLeft:`3px solid ${color}`,borderRadius:'0 7px 7px 0',animation:'slideDown .14s ease'}}>
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:4}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:500}}>{item.titolo}</div>
                        <div style={{display:'flex',gap:5,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                          {(item.ora||item.oraPianificata)&&(
                            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:'var(--t3)'}}>
                              {item.ora||item.oraPianificata}
                              {item.oraFine ? ` - ${item.oraFine}` : ''}
                            </span>
                          )}
                          <Badge color={color}>{badge}</Badge>
                          {item.tipo==='permesso'&&item.ore&&<span style={{fontSize:10,color:'var(--t3)'}}>{item.ore}h</span>}
                          {isStudy&&<span style={{fontSize:10,color:'var(--t3)'}}>{item.durata_minuti}min</span>}
                        </div>
                        {item.note&&<div style={{fontSize:11,color:'var(--t3)',marginTop:3}}>{item.note}</div>}
                      </div>
                      {!isStudy&&!isGoal&&<button className="btn-danger" onClick={()=>handleRemove(item.id)} style={{flexShrink:0}}>✕</button>}
                    </div>
                  </div>
                )
              })
            }
          </div>

          {/* Month summary */}
          <div className="card card-3">
            <div className="label-xs" style={{marginBottom:8}}>mese in sintesi</div>
            {festivitaMonth.length>0&&(
              <div style={{marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--bd)'}}>
                <div style={{fontSize:11,color:'var(--t3)',marginBottom:4}}>Festività</div>
                {festivitaMonth.map(f=>(
                  <div key={f.data} style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:11,color:'var(--t2)'}}>{f.nome}</span>
                    <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--t3)'}}>{f.data.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(TIPI_EVENTO).map(k=>{
              const count=monthEvents.filter(e=>e.tipo===k).length
              if(!count) return null
              return (
                <div key={k} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                  <div style={{width:8,height:8,borderRadius:2,background:TIPI_EVENTO[k].color+'33',borderLeft:`2px solid ${TIPI_EVENTO[k].color}`,flexShrink:0}} />
                  <span style={{flex:1,fontSize:12,color:'var(--t2)'}}>{TIPI_EVENTO[k].label}</span>
                  <span style={{fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:500}}>{count}</span>
                </div>
              )
            })}
            {monthEvents.length===0&&festivitaMonth.length===0&&<EmptyState message="Nessun evento" />}
          </div>
        </div>
      </div>
    </div>
  )
}