import { useState } from 'react'
import { useCalendario, TIPI_EVENTO } from '../hooks/useCalendario'
import { useRisparmi } from '../hooks/useRisparmi'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { getFestivita, getPonti, isFestivita, getFestivitaNome } from '../utils/festivita'
import { buildCalendarGrid, MESI, GIORNI_BREVI, todayStr, formatShort } from '../utils/dateHelpers'
import { PageHeader, SectionHeader, FormPanel, InputRow, Badge, EmptyState } from '../components/ui'
import { showConfirm } from '../components/ui'

function MonthNavInline({ year, month, onChange }) {
  const prev = () => month===0?onChange(year-1,11):onChange(year,month-1)
  const next = () => month===11?onChange(year+1,0):onChange(year,month+1)
  return (
    <div style={{ display:'flex',gap:6 }}>
      <button className="btn-ghost btn-sm" onClick={prev} style={{ padding:'3px 9px' }}>‹</button>
      <button className="btn-ghost btn-sm" onClick={next} style={{ padding:'3px 9px' }}>›</button>
    </div>
  )
}

export default function Calendario() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState(todayStr())
  const [formOpen, setFormOpen] = useState(false)
  const [showPonti, setShowPonti] = useState(false)
  const [form, setForm] = useState({ titolo:'', data:todayStr(), ora:'', tipo:'lavoro', note:'', ore:'8' })

  const { events, addEvent, removeEvent, eventsForDate, eventsForMonth, countFerie, countPermessi } = useCalendario()
  const { goals } = useRisparmi()
  const { getOrarioGiorno } = useImpostazioni()

  const festivita = getFestivita(year)
  const ponti = getPonti(year)
  const festivitaMonth = festivita.filter(f => {
    const d = new Date(f.data+'T12:00')
    return d.getFullYear()===year && d.getMonth()===month
  })
  const pontiMonth = ponti.filter(p => {
    const d = new Date(p.data+'T12:00')
    return d.getFullYear()===year && d.getMonth()===month
  })

  const cells = buildCalendarGrid(year, month)
  const today = todayStr()
  const monthEvents = eventsForMonth(year, month)
  const selectedEvents = selected ? eventsForDate(selected) : []
  const toDateStr = (d) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const eventsForCell = (d) => d ? monthEvents.filter(e=>e.data===toDateStr(d)) : []

  // Goal deadlines as pseudo-events
  const goalDeadlines = goals.filter(g=>g.scadenza).map(g=>({
    id:`goal-${g.id}`, data:g.scadenza, titolo:`Scadenza: ${g.nome}`, tipo:'scadenza',
    note:`Target: €${g.target}`
  }))
  const allCellEvents = (d) => {
    if (!d) return []
    const ds = toDateStr(d)
    const ev = eventsForCell(d)
    const gd = goalDeadlines.filter(g=>g.data===ds)
    return [...ev, ...gd]
  }

  const handleAdd = () => {
    if (!form.titolo.trim() || !form.data) return
    addEvent({ ...form })
    setForm({ titolo:'', data:selected||todayStr(), ora:'', tipo:'lavoro', note:'', ore:'8' })
    setFormOpen(false)
  }

  const handleRemove = (id) => {
    showConfirm('Rimuovere questo evento?', () => removeEvent(id))
  }

  const handleCellClick = (d) => {
    if (!d) return
    const ds = toDateStr(d)
    setSelected(ds)
    setForm(f=>({...f,data:ds}))
  }

  const isFest = (d) => d && isFestivita(toDateStr(d), year)
  const isPonte = (d) => d && ponti.some(p=>p.data===toDateStr(d))
  const getFestNome = (d) => d ? getFestivitaNome(toDateStr(d), year) : null
  const getOrarioCell = (d) => {
    if (!d) return null
    const ds = toDateStr(d)
    const dow = new Date(ds+'T12:00').getDay()
    return getOrarioGiorno(dow)
  }

  const selectedDow = selected ? new Date(selected+'T12:00').getDay() : null
  const selectedOrario = selectedDow !== null ? getOrarioGiorno(selectedDow) : null

  return (
    <div style={{ padding:'24px 28px',animation:'fadeUp .24s ease both' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div>
            <div className="label-xs" style={{ marginBottom:4 }}>calendario</div>
            <div style={{ fontSize:20,fontWeight:700,letterSpacing:'-.02em',display:'flex',alignItems:'center',gap:10 }}>
              {MESI[month]} {year}
              <MonthNavInline year={year} month={month} onChange={(y,m)=>{ setYear(y);setMonth(m);setSelected(null) }} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
          <span style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>
            <span style={{ color:TIPI_EVENTO.ferie.color,marginRight:3 }}>■</span>{countFerie(year)}g ferie
          </span>
          <span style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>
            <span style={{ color:TIPI_EVENTO.permesso.color,marginRight:3 }}>■</span>{countPermessi(year)}h perm.
          </span>
          <span style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>
            <span style={{ color:'#E8B84B',marginRight:3 }}>■</span>{festivitaMonth.length} fest.
          </span>
          <button className="btn-ghost btn-sm" onClick={()=>setShowPonti(v=>!v)}
            style={{ fontSize:11,padding:'4px 9px',color:showPonti?'var(--ac)':undefined,borderColor:showPonti?'var(--ac)':undefined }}>
            {showPonti?'▲':'◈'} ponti ({pontiMonth.length})
          </button>
        </div>
      </div>

      {/* Ponti panel */}
      {showPonti && pontiMonth.length>0 && (
        <div style={{ marginBottom:14,padding:'10px 14px',background:'rgba(232,184,75,.08)',border:'1px solid rgba(232,184,75,.22)',borderRadius:9,animation:'slideDown .18s ease',display:'flex',flexWrap:'wrap',gap:8 }}>
          {pontiMonth.map((p,i)=>(
            <div key={i} style={{ fontSize:12,color:'var(--t2)',background:'rgba(232,184,75,.1)',padding:'4px 10px',borderRadius:6,border:'1px solid rgba(232,184,75,.2)' }}>
              🌉 {p.suggerimento}
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid',gridTemplateColumns:'1fr 250px',gap:14,alignItems:'start' }}>
        {/* Calendar grid */}
        <div className="card card-1" style={{ padding:0,overflow:'hidden' }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',background:'var(--sf2)',borderBottom:'1px solid var(--bd)' }}>
            {GIORNI_BREVI.map((g,i)=>(
              <div key={i} style={{ textAlign:'center',fontSize:10,fontWeight:700,letterSpacing:'.1em',color:'var(--t3)',padding:'9px 0' }}>{g}</div>
            ))}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)' }}>
            {cells.map((d,i)=>{
              const ds = d ? toDateStr(d) : null
              const isToday = ds===today
              const isSel = ds===selected
              const isWeekend = (i%7)>=5
              const fest = getFestNome(d)
              const ponte = isPonte(d)
              const cellEvs = allCellEvents(d)
              const orario = getOrarioCell(d)
              const isWorkday = orario?.abilitato && !fest
              return (
                <div key={i} onClick={()=>handleCellClick(d)}
                  style={{
                    minHeight:108,padding:'5px 4px 4px',
                    borderRight:(i%7)<6?'1px solid var(--bd)':'none',
                    borderBottom:'1px solid var(--bd)',
                    cursor:d?'pointer':'default',
                    background:isSel?'var(--ac-bg)':fest?'rgba(232,184,75,.06)':isToday?'var(--sf2)':isWeekend&&d?'rgba(0,0,0,.01)':'transparent',
                    transition:'background .12s',
                  }}
                  onMouseEnter={e=>{ if(d&&!isSel) e.currentTarget.style.background='var(--sf2)' }}
                  onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background=fest?'rgba(232,184,75,.06)':isToday?'var(--sf2)':(isWeekend&&d?'rgba(0,0,0,.01)':'transparent') }}
                >
                  {d&&(
                    <>
                      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:3 }}>
                        {isToday
                          ? <span style={{ width:20,height:20,borderRadius:'50%',background:'var(--ac)',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700 }}>{d}</span>
                          : <span style={{ fontSize:12,color:isWeekend||fest?'var(--t3)':'var(--t2)',fontWeight:isSel?600:400 }}>{d}</span>
                        }
                        {fest && <span style={{ fontSize:7,background:'rgba(232,184,75,.25)',color:'#7A6020',borderRadius:3,padding:'1px 3px',fontWeight:600,maxWidth:55,textAlign:'right',lineHeight:1.3 }}>{fest.slice(0,10)}</span>}
                        {ponte && !fest && <span style={{ fontSize:8,color:'#7A6020',opacity:.6 }}>🌉</span>}
                      </div>
                      {/* Work hours row */}
                      {isWorkday && !isWeekend && (
                        <div style={{ fontSize:8,fontFamily:"'DM Mono',monospace",color:'var(--t3)',marginBottom:2,lineHeight:1 }}>
                          {orario.dalle}–{orario.alle}
                        </div>
                      )}
                      <div style={{ display:'flex',flexDirection:'column',gap:2 }}>
                        {cellEvs.slice(0,3).map(ev=>{
                          const color = ev.tipo==='scadenza'?'#7A5FA0':(TIPI_EVENTO[ev.tipo]?.color||'#888')
                          return (
                            <div key={ev.id} style={{ background:color+'1A',borderLeft:`2px solid ${color}`,color,fontSize:10,fontWeight:500,padding:'1px 4px',borderRadius:'0 3px 3px 0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.6 }}>
                              {ev.ora&&<span style={{ opacity:.65,marginRight:2,fontFamily:"'DM Mono',monospace",fontSize:9 }}>{ev.ora}</span>}
                              {ev.titolo}
                            </div>
                          )
                        })}
                        {cellEvs.length>3&&<div style={{ fontSize:9,color:'var(--t3)',paddingLeft:4 }}>+{cellEvs.length-3} altri</div>}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
          <div className="card card-2">
            <SectionHeader action={
              <button className="btn-ghost btn-sm" onClick={()=>setFormOpen(f=>!f)}>
                {formOpen?'✕':'+ evento'}
              </button>
            }>
              {selected?formatShort(selected):'seleziona giorno'}
            </SectionHeader>

            {/* Work hours for selected day */}
            {selected && selectedOrario?.abilitato && !isFestivita(selected, year) && (
              <div style={{ marginBottom:10,padding:'6px 10px',background:'var(--sf2)',borderRadius:7,fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace",display:'flex',gap:8,alignItems:'center' }}>
                <span style={{ color:'var(--t3)' }}>orario</span>
                <span>{selectedOrario.dalle} → {selectedOrario.alle}</span>
                {selectedOrario.pausa>0&&<span style={{ color:'var(--t3)' }}>pausa {selectedOrario.pausa}min</span>}
              </div>
            )}
            {selected && isFestivita(selected, year) && (
              <div style={{ marginBottom:10,padding:'6px 10px',background:'rgba(232,184,75,.08)',border:'1px solid rgba(232,184,75,.2)',borderRadius:7,fontSize:11,color:'#7A6020',display:'flex',alignItems:'center',gap:6 }}>
                <span>🎉</span>
                <span>{getFestivitaNome(selected, year)}</span>
              </div>
            )}

            <FormPanel open={formOpen}>
              <input className="input-field" placeholder="Titolo evento" value={form.titolo}
                onChange={e=>setForm(f=>({...f,titolo:e.target.value}))} />
              <InputRow>
                <input className="input-field" type="date" value={form.data}
                  onChange={e=>setForm(f=>({...f,data:e.target.value}))} />
                <input className="input-field" type="time" value={form.ora}
                  onChange={e=>setForm(f=>({...f,ora:e.target.value}))} style={{ maxWidth:82 }} />
              </InputRow>
              <select className="input-field" value={form.tipo}
                onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
                {Object.entries(TIPI_EVENTO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
              {form.tipo==='permesso'&&(
                <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                  <span style={{ fontSize:11,color:'var(--t3)',whiteSpace:'nowrap' }}>Ore:</span>
                  <input className="input-field" type="number" min="1" max="8" value={form.ore}
                    onChange={e=>setForm(f=>({...f,ore:e.target.value}))} style={{ maxWidth:70 }} />
                </div>
              )}
              <input className="input-field" placeholder="Note (opz.)" value={form.note}
                onChange={e=>setForm(f=>({...f,note:e.target.value}))} />
              <InputRow>
                <button className="btn-ghost" onClick={()=>setFormOpen(false)}>Annulla</button>
                <button className="btn-accent" onClick={handleAdd}>Salva</button>
              </InputRow>
            </FormPanel>

            {[...selectedEvents, ...goalDeadlines.filter(g=>g.data===selected)].length===0&&!formOpen
              ? <EmptyState message={selected?'Nessun evento':'Clicca un giorno'} />
              : [...selectedEvents, ...goalDeadlines.filter(g=>g.data===selected)].map(ev=>{
                const color = ev.tipo==='scadenza'?'#7A5FA0':(TIPI_EVENTO[ev.tipo]?.color||'#888')
                const label = ev.tipo==='scadenza'?'Scadenza':(TIPI_EVENTO[ev.tipo]?.label||ev.tipo)
                return (
                  <div key={ev.id} style={{ marginBottom:8,padding:'8px 10px',background:color+'11',borderLeft:`3px solid ${color}`,borderRadius:'0 7px 7px 0',animation:'slideDown .14s ease' }}>
                    <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:4 }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:500 }}>{ev.titolo}</div>
                        <div style={{ display:'flex',gap:5,marginTop:3,flexWrap:'wrap',alignItems:'center' }}>
                          {ev.ora&&<span style={{ fontSize:10,fontFamily:"'DM Mono',monospace",color:'var(--t3)' }}>{ev.ora}</span>}
                          <Badge color={color}>{label}</Badge>
                        </div>
                        {ev.note&&<div style={{ fontSize:11,color:'var(--t3)',marginTop:3 }}>{ev.note}</div>}
                      </div>
                      {!ev.id.toString().startsWith('goal-')&&(
                        <button className="btn-danger" onClick={()=>handleRemove(ev.id)} style={{ flexShrink:0 }}>✕</button>
                      )}
                    </div>
                  </div>
                )
              })
            }
          </div>

          {/* Month summary */}
          <div className="card card-3">
            <div className="label-xs" style={{ marginBottom:8 }}>mese in sintesi</div>
            {festivitaMonth.length>0&&(
              <div style={{ marginBottom:8,paddingBottom:8,borderBottom:'1px solid var(--bd)' }}>
                <div style={{ fontSize:11,color:'var(--t3)',marginBottom:4 }}>Festività</div>
                {festivitaMonth.map(f=>(
                  <div key={f.data} style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                    <span style={{ fontSize:11,color:'var(--t2)' }}>{f.nome}</span>
                    <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--t3)' }}>{f.data.slice(8)}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(TIPI_EVENTO).map(k=>{
              const count = monthEvents.filter(e=>e.tipo===k).length
              if(!count) return null
              return (
                <div key={k} style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                  <div style={{ width:8,height:8,borderRadius:2,background:TIPI_EVENTO[k].color+'33',borderLeft:`2px solid ${TIPI_EVENTO[k].color}`,flexShrink:0 }} />
                  <span style={{ flex:1,fontSize:12,color:'var(--t2)' }}>{TIPI_EVENTO[k].label}</span>
                  <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",fontWeight:500 }}>{count}</span>
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
