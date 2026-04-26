import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useSalute, TIPI_GIORNO, MUSCOLI, EARTH_CIRCUMFERENCE_KM, calcPace, calcSpeed, formatDurata } from '../hooks/useSalute'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { PageHeader, Badge, EmptyState, ProgressBar, SectionHeader, InputRow, showConfirm, showSuccess, showError } from '../components/ui'
import { formatShort } from '../utils/dateHelpers'

const GYM_COLOR  = '#3A7059'
const RUN_COLOR  = '#C46A3C'
const GIORNI_FULL= [{id:1,l:'Lunedì'},{id:2,l:'Martedì'},{id:3,l:'Mercoledì'},{id:4,l:'Giovedì'},{id:5,l:'Venerdì'},{id:6,l:'Sabato'},{id:0,l:'Domenica'}]

// ── Earth Globe Animation ───────────────────────────────────
function EarthGlobe({ pctTerra, totaleKm, giriTerra }) {
  const [animPct, setAnimPct] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    let start = null
    const target = pctTerra
    const duration = 1800
    const animate = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setAnimPct(ease * target)
      if (progress < 1) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [pctTerra])

  const SIZE   = 220
  const CX     = SIZE / 2
  const CY     = SIZE / 2
  const R      = 80
  const STROKE = 10
  const CIRC   = 2 * Math.PI * R
  const dashOffset = CIRC * (1 - animPct / 100)

  // Runner dot position on circle
  const angle    = (animPct / 100) * 2 * Math.PI - Math.PI / 2
  const runnerX  = CX + R * Math.cos(angle)
  const runnerY  = CY + R * Math.sin(angle)

  // Latitude lines for globe effect
  const latLines = [-50,-25,0,25,50]
  const lonLines = [0,30,60,90,120,150]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
      <div style={{ position:'relative' }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <radialGradient id="globeGrad" cx="35%" cy="35%">
              <stop offset="0%" stopColor="#4a9eff" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="#1a3a6e" stopOpacity="0.15"/>
            </radialGradient>
            <clipPath id="globeClip">
              <circle cx={CX} cy={CY} r={R}/>
            </clipPath>
          </defs>

          {/* Globe base */}
          <circle cx={CX} cy={CY} r={R} fill="url(#globeGrad)" stroke="rgba(74,158,255,.2)" strokeWidth={1}/>

          {/* Grid lines */}
          <g clipPath="url(#globeClip)" stroke="rgba(74,158,255,.15)" strokeWidth={0.7} fill="none">
            {latLines.map(lat => {
              const y = CY + (lat/90)*R
              const halfW = Math.sqrt(Math.max(0,R*R-(y-CY)*(y-CY)))
              return <line key={lat} x1={CX-halfW} y1={y} x2={CX+halfW} y2={y}/>
            })}
            {lonLines.map(lon => {
              const rx = R * Math.abs(Math.cos(lon*Math.PI/180))
              return <ellipse key={lon} cx={CX} cy={CY} rx={rx} ry={R}/>
            })}
          </g>

          {/* Track (grey background ring) */}
          <circle cx={CX} cy={CY} r={R+STROKE/2+4}
            fill="none" stroke="var(--sf2)" strokeWidth={STROKE+2}/>

          {/* Completed arc */}
          <circle cx={CX} cy={CY} r={R+STROKE/2+4}
            fill="none"
            stroke={RUN_COLOR}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{transition:'stroke-dashoffset 0.1s'}}
          />

          {/* Runner dot */}
          {animPct > 0 && (
            <g>
              <circle cx={runnerX} cy={runnerY} r={8}
                fill={RUN_COLOR} stroke="var(--sf)" strokeWidth={2}
                style={{filter:`drop-shadow(0 0 4px ${RUN_COLOR}88)`}}/>
              <text x={runnerX} y={runnerY+4} textAnchor="middle" fontSize={9} fill="white">🏃</text>
            </g>
          )}

          {/* Center text */}
          <text x={CX} y={CY-14} textAnchor="middle" fontSize={22} fontWeight={700}
            fontFamily="'DM Mono',monospace" fill="var(--t1)">
            {animPct.toFixed(1)}%
          </text>
          <text x={CX} y={CY+6} textAnchor="middle" fontSize={9} fill="var(--t3)">
            della Terra
          </text>
          <text x={CX} y={CY+20} textAnchor="middle" fontSize={11} fontWeight={600}
            fontFamily="'DM Mono',monospace" fill={RUN_COLOR}>
            {totaleKm.toLocaleString('it-IT')} km
          </text>
          {giriTerra > 0 && (
            <text x={CX} y={CY+36} textAnchor="middle" fontSize={9} fill={GYM_COLOR}>
              {giriTerra} {giriTerra===1?'giro completo':'giri completi'}!
            </text>
          )}
        </svg>
      </div>

      {/* Fun distance comparisons */}
      <div style={{ width:'100%' }}>
        {[
          { label:'Roma → Milano',     km:477,   icon:'🚄' },
          { label:'Italia (N→S)',      km:1300,  icon:'🇮🇹' },
          { label:'Mezza maratona',    km:21.1,  icon:'🏅' },
          { label:'Maratona completa', km:42.195,icon:'🏆' },
        ].map(ref => {
          const volte = Math.floor((totaleKm||0) / ref.km)
          const pct   = Math.min(100, ((totaleKm||0) % ref.km) / ref.km * 100)
          return (
            <div key={ref.label} style={{ marginBottom:9 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                <span style={{ fontSize:11, color:'var(--t2)' }}>{ref.icon} {ref.label}</span>
                <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:RUN_COLOR, fontWeight:600 }}>
                  {volte>0?`×${volte} + `:''}{(((totaleKm||0) % ref.km)).toFixed(1)}/{ref.km}km
                </span>
              </div>
              <div className="progress-track" style={{ height:3 }}>
                <div className="progress-fill" style={{ width:`${pct}%`, background:RUN_COLOR }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Rest Timer ──────────────────────────────────────────────
function RestTimer({ sec=90, onDismiss }) {
  const [remaining, setRemaining] = useState(sec)
  const [running, setRunning]     = useState(true)
  const ref = useRef(null)
  useEffect(()=>{
    if(running){ref.current=setInterval(()=>{setRemaining(r=>{if(r<=1){clearInterval(ref.current);setRunning(false);return 0}return r-1})},1000)}
    else clearInterval(ref.current)
    return()=>clearInterval(ref.current)
  },[running])
  const pct=Math.round((remaining/sec)*100)
  const done=remaining===0
  const mm=String(Math.floor(remaining/60)).padStart(2,'0'),ss=String(remaining%60).padStart(2,'0')
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:done?'rgba(58,112,89,.12)':'rgba(196,106,60,.08)',border:`1px solid ${done?'rgba(58,112,89,.3)':'rgba(196,106,60,.2)'}`,animation:'slideDown .18s ease',marginBottom:5}}>
      <svg width={36} height={36} style={{flexShrink:0}}>
        <circle cx={18} cy={18} r={14} fill="none" stroke="var(--bd2)" strokeWidth={3}/>
        <circle cx={18} cy={18} r={14} fill="none" stroke={done?GYM_COLOR:'var(--ac)'} strokeWidth={3}
          strokeDasharray={`${2*Math.PI*14}`} strokeDashoffset={`${2*Math.PI*14*(1-pct/100)}`}
          strokeLinecap="round" transform="rotate(-90 18 18)" style={{transition:'stroke-dashoffset 1s linear'}}/>
        <text x={18} y={22} textAnchor="middle" fontSize={8} fontFamily="'DM Mono',monospace" fill={done?GYM_COLOR:'var(--ac)'} fontWeight={600}>{done?'✓':`${mm}:${ss}`}</text>
      </svg>
      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:done?GYM_COLOR:'var(--ac)'}}>{done?'Recupero completato!':'Recupero in corso'}</div>
        <div style={{fontSize:11,color:'var(--t3)'}}>{done?'Pronti per la prossima serie':`${mm}:${ss} rimanenti`}</div>
      </div>
      <div style={{display:'flex',gap:5}}>
        {!done&&<button className="btn-ghost" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>setRunning(r=>!r)}>{running?'⏸':'▶'}</button>}
        <button className="btn-ghost" style={{fontSize:11,padding:'3px 8px'}} onClick={onDismiss}>✕</button>
      </div>
    </div>
  )
}

// ── Set Row ─────────────────────────────────────────────────
function SetRow({serie,idx,esId,sid,defaultRec,onComplete}) {
  const [reps,setReps]=useState(serie.reps)
  const [peso,setPeso]=useState(serie.peso)
  const [showTimer,setShowTimer]=useState(false)
  const handleComplete=()=>{onComplete(sid,esId,idx,{reps,peso});setShowTimer(true)}
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',borderRadius:8,background:serie.completata?'rgba(58,112,89,.06)':'var(--sf2)',border:`1px solid ${serie.completata?'rgba(58,112,89,.2)':'var(--bd)'}`,marginBottom:5,opacity:serie.completata?.7:1,transition:'all .14s'}}>
        <span style={{width:22,height:22,borderRadius:6,flexShrink:0,background:serie.completata?GYM_COLOR:'transparent',border:`1.5px solid ${serie.completata?GYM_COLOR:'var(--bd2)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700,transition:'all .14s'}}>
          {serie.completata?'✓':idx+1}
        </span>
        <span style={{fontSize:11,color:'var(--t3)',width:32}}>S{idx+1}</span>
        <div style={{display:'flex',alignItems:'center',gap:5,flex:1}}>
          <input type="number" value={reps} onChange={e=>setReps(e.target.value)} disabled={serie.completata}
            style={{width:52,padding:'3px 6px',border:'1px solid var(--bd2)',borderRadius:6,fontSize:12,background:'var(--bg)',color:'var(--t1)',fontFamily:"'DM Mono',monospace",outline:'none'}}/>
          <span style={{fontSize:11,color:'var(--t3)'}}>rep</span>
          <input type="number" value={peso} onChange={e=>setPeso(e.target.value)} disabled={serie.completata}
            style={{width:58,padding:'3px 6px',border:'1px solid var(--bd2)',borderRadius:6,fontSize:12,background:'var(--bg)',color:'var(--t1)',fontFamily:"'DM Mono',monospace",outline:'none'}}/>
          <span style={{fontSize:11,color:'var(--t3)'}}>kg</span>
        </div>
        {!serie.completata&&<button onClick={handleComplete}
          style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${GYM_COLOR}`,background:'transparent',color:GYM_COLOR,fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:'pointer',fontWeight:600,transition:'all .14s',flexShrink:0}}
          onMouseEnter={e=>{e.currentTarget.style.background=GYM_COLOR;e.currentTarget.style.color='#fff'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color=GYM_COLOR}}>✓ Fatto</button>}
      </div>
      {showTimer&&serie.completata&&<RestTimer sec={parseInt(defaultRec)||90} onDismiss={()=>setShowTimer(false)}/>}
    </div>
  )
}

// ── Exercise Card (workout mode) ────────────────────────────
function ExerciseCard({esercizio,sid,onComplete}) {
  const [open,setOpen]=useState(true)
  const done=esercizio.serie_log?.filter(s=>s.completata).length||0
  const total=esercizio.serie_log?.length||0
  return (
    <div style={{border:'1px solid var(--bd)',borderRadius:10,overflow:'hidden',marginBottom:10}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',gap:10,padding:'11px 14px',cursor:'pointer',background:'var(--sf)',userSelect:'none'}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>{esercizio.nome}</div>
          <div style={{fontSize:11,color:'var(--t3)',marginTop:1}}>{esercizio.muscolo} · {total} serie · ⏱{esercizio.recupero_sec}s</div>
        </div>
        <div style={{height:4,width:70,background:'var(--sf2)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${total>0?(done/total*100):0}%`,background:GYM_COLOR,borderRadius:2,transition:'width .4s'}}/>
        </div>
        <span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:done===total&&total>0?GYM_COLOR:'var(--t2)',minWidth:32,textAlign:'right'}}>{done}/{total}</span>
        <span style={{fontSize:12,color:'var(--t3)',display:'inline-block',transform:open?'rotate(180deg)':'none',transition:'transform .18s'}}>⌄</span>
      </div>
      {open&&<div style={{padding:'10px 14px 12px',background:'var(--bg)',borderTop:'1px solid var(--bd)',animation:'slideDown .16s ease'}}>
        {(esercizio.serie_log||[]).map((sr,i)=><SetRow key={i} serie={sr} idx={i} esId={esercizio.id} sid={sid} defaultRec={esercizio.recupero_sec} onComplete={onComplete}/>)}
        {esercizio.note&&<div style={{fontSize:11,color:'var(--t3)',marginTop:5,padding:'5px 8px',background:'var(--sf2)',borderRadius:6}}>📝 {esercizio.note}</div>}
      </div>}
    </div>
  )
}

// ── Session Timer ───────────────────────────────────────────
function SessionTimer({iniziataAlle}) {
  const [el,setEl]=useState(0)
  useEffect(()=>{const s=new Date(iniziataAlle).getTime();const u=()=>setEl(Math.floor((Date.now()-s)/1000));u();const t=setInterval(u,1000);return()=>clearInterval(t)},[iniziataAlle])
  const mm=String(Math.floor(el/60)).padStart(2,'0'),ss=String(el%60).padStart(2,'0')
  return (
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:22,fontFamily:"'DM Mono',monospace",fontWeight:500,color:GYM_COLOR}}>{mm}:{ss}</div>
      <div style={{fontSize:10,color:'var(--t3)'}}>durata</div>
    </div>
  )
}

// ── Esercizio Row (scheda editor) ───────────────────────────
function EsercizioRow({esercizio,index,total,onRemove,onUpdate,onMove}) {
  const [editing,setEditing]=useState(false)
  const [form,setForm]=useState(esercizio)
  return (
    <div style={{marginBottom:7,border:'1px solid var(--bd)',borderRadius:9,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:9,padding:'10px 12px',background:'var(--sf)'}}>
        <div style={{display:'flex',flexDirection:'column',gap:2}}>
          <button onClick={()=>onMove(index,index-1)} disabled={index===0} style={{background:'none',border:'none',cursor:index===0?'default':'pointer',fontSize:9,opacity:index===0?.3:.7,color:'var(--t2)',padding:'0 2px',lineHeight:1}}>▲</button>
          <button onClick={()=>onMove(index,index+1)} disabled={index===total-1} style={{background:'none',border:'none',cursor:index===total-1?'default':'pointer',fontSize:9,opacity:index===total-1?.3:.7,color:'var(--t2)',padding:'0 2px',lineHeight:1}}>▼</button>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>{esercizio.nome}</div>
          <div style={{fontSize:11,color:'var(--t3)',fontFamily:"'DM Mono',monospace"}}>{esercizio.serie}×{esercizio.reps} @ {esercizio.peso}kg · ⏱{esercizio.recupero_sec}s · {esercizio.muscolo}</div>
        </div>
        <button className="btn-ghost btn-sm" onClick={()=>setEditing(e=>!e)} style={{fontSize:11}}>{editing?'✕':'✏️'}</button>
        <button className="btn-danger" onClick={onRemove}>✕</button>
      </div>
      {editing&&<div style={{padding:'10px 12px',background:'var(--bg)',borderTop:'1px solid var(--bd)',animation:'slideDown .16s ease'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:7}}>
          {[['Serie','serie'],['Reps','reps'],['Peso kg','peso'],['Rec. s','recupero_sec']].map(([l,k])=>(
            <div key={k}><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>{l}</div>
              <input className="input-field" type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:7}}>
          <select className="input-field" value={form.muscolo} onChange={e=>setForm(f=>({...f,muscolo:e.target.value}))}>
            {MUSCOLI.map(m=><option key={m}>{m}</option>)}
          </select>
          <input className="input-field" placeholder="Note" value={form.note||''} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
        </div>
        <button className="btn-accent" style={{background:GYM_COLOR,borderColor:GYM_COLOR}} onClick={()=>{onUpdate(form);setEditing(false)}}>Salva</button>
      </div>}
    </div>
  )
}

// ── Weekly Calendar ─────────────────────────────────────────
function WeeklyCalendar({scheda,sessioni,todayDow,schedulePalestra}) {
  const today=new Date().toISOString().slice(0,10)
  const doneSet=new Set(sessioni.filter(s=>s.completata).map(s=>s.data))
  const days=[{id:1,l:'L'},{id:2,l:'M'},{id:3,l:'M'},{id:4,l:'G'},{id:5,l:'V'},{id:6,l:'S'},{id:0,l:'D'}]
  const weekStart=(()=>{const d=new Date();const diff=d.getDay()===0?6:d.getDay()-1;d.setDate(d.getDate()-diff);return d})()
  return (
    <div className="card card-2">
      <div className="label-xs" style={{marginBottom:10}}>questa settimana</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
        {days.map((d,i)=>{
          const date=new Date(weekStart);date.setDate(weekStart.getDate()+i)
          const ds=date.toISOString().slice(0,10)
          const isToday=d.id===todayDow&&ds===today
          const done=doneSet.has(ds)
          const g=scheda[d.id]||{}
          const gp=schedulePalestra[d.id]||{}
          const tipo=TIPI_GIORNO[g.tipo]||TIPI_GIORNO.riposo
          const isGymDay=gp.abilitato&&g.tipo!=='riposo'&&g.tipo!=='riposo_attivo'
          return (
            <div key={d.id} style={{textAlign:'center'}}>
              <div style={{fontSize:9,color:'var(--t3)',marginBottom:4}}>{d.l}</div>
              <div style={{width:32,height:32,borderRadius:'50%',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,background:done?GYM_COLOR:isToday?'var(--ac-bg)':'var(--sf2)',border:`1.5px solid ${done?GYM_COLOR:isToday?'var(--ac)':isGymDay?tipo.color+'44':'var(--bd)'}`,color:done?'#fff':isToday?'var(--ac)':'var(--t2)',fontWeight:done||isToday?700:400}}>
                {done?'✓':tipo.icon}
              </div>
              <div style={{fontSize:8,color:'var(--t3)',marginTop:3}}>{date.getDate()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PAGE ───────────────────────────────────────────────
export default function Salute() {
  const {
    scheda, updateGiorno, addEsercizio, removeEsercizio, updateEsercizio, moveEsercizio,
    sessioni, getSessioneOggi, startSessione, completaSerie, completaSessione, deleteSessione,
    corse, addCorsa, removeCorsa, getStatsCorse,
    getStatsGenerali, getProgressiEsercizio, getAllEserciziNomi,
  } = useSalute()
  const { settings, getScheduleStudio, getSchedulePalestra } = useImpostazioni()

  const [tab, setTab]       = useState('oggi')
  const [selectedDow, setSelectedDow] = useState(new Date().getDay())
  const [esFormOpen, setEsFormOpen]   = useState(false)
  const [esForm, setEsForm]     = useState({nome:'',serie:3,reps:10,peso:0,recupero_sec:90,muscolo:'Petto',note:''})
  const [selectedEsercizio, setSelectedEsercizio] = useState('')
  const [sessioneOggi, setSessioneOggi] = useState(getSessioneOggi)

  // Running form
  const [corsaForm, setCorsaForm] = useState({data:new Date().toISOString().slice(0,10),distanza_km:'',durata_min:'',dislivello_m:'',note:''})
  const [corsaFormOpen, setCorsaFormOpen] = useState(false)

  const now        = new Date()
  const todayDow   = now.getDay()
  const palSched   = getSchedulePalestra()
  const giornoOggi = scheda[todayDow] || {}
  const gpOggi     = palSched[todayDow] || {}
  const isGymDay   = gpOggi.abilitato && giornoOggi.tipo !== 'riposo' && giornoOggi.tipo !== 'riposo_attivo'
  const isRiposo   = !isGymDay
  const stats      = getStatsGenerali()
  const statsCorse = getStatsCorse()
  const allNomi    = getAllEserciziNomi()

  useEffect(()=>{setSessioneOggi(getSessioneOggi())},[sessioni])
  useEffect(()=>{if(allNomi.length>0&&!selectedEsercizio)setSelectedEsercizio(allNomi[0])},[allNomi.length])

  // Auto-compute speed/pace preview for running form
  const previewDist = parseFloat(corsaForm.distanza_km)||0
  const previewDur  = parseInt(corsaForm.durata_min)||0
  const previewSpeed= previewDist>0&&previewDur>0 ? calcSpeed(previewDist,previewDur) : null
  const previewPace = previewDist>0&&previewDur>0 ? calcPace(previewDist,previewDur) : null

  const handleStartSessione = () => { startSessione(todayDow); showSuccess('Allenamento iniziato! Forza 💪') }
  const handleCompleta = () => {
    if(!sessioneOggi) return
    showConfirm("Completare l'allenamento di oggi?",()=>{ completaSessione(sessioneOggi.id); showSuccess('Allenamento completato! Ottimo lavoro 🎉') })
  }
  const handleAddEsercizio = () => {
    if(!esForm.nome.trim()) return
    addEsercizio(selectedDow,esForm)
    setEsForm({nome:'',serie:3,reps:10,peso:0,recupero_sec:90,muscolo:'Petto',note:''})
    setEsFormOpen(false)
    showSuccess('Esercizio aggiunto.')
  }
  const handleAddCorsa = () => {
    if(!corsaForm.distanza_km||!corsaForm.durata_min) { showError('Inserisci distanza e durata'); return }
    addCorsa(corsaForm)
    setCorsaForm({data:new Date().toISOString().slice(0,10),distanza_km:'',durata_min:'',dislivello_m:'',note:''})
    setCorsaFormOpen(false)
    showSuccess('Corsa registrata! 🏃')
  }

  const TABS = [
    {id:'oggi',    label:'Oggi',     badge:sessioneOggi&&!sessioneOggi.completata?'●':null},
    {id:'scheda',  label:'Scheda',   badge:null},
    {id:'corsa',   label:'Corsa',    badge:corse.length>0?corse.length:null},
    {id:'progressi',label:'Progressi',badge:null},
  ]

  return (
    <div style={{padding:28,animation:'fadeUp .24s ease both'}}>
      <PageHeader label="salute & fitness" title="Allenamento & Corsa" />

      {/* KPI */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          ['SESSIONI/MESE', stats.thisMonth||'—', stats.thisMonth>0?GYM_COLOR:undefined, 'palestra'],
          ['STREAK',        stats.streak>0?`${stats.streak}🔥`:'—', stats.streak>2?'var(--ac)':undefined, 'giorni consec.'],
          ['KM CORSA/MESE', statsCorse.kmMese>0?`${statsCorse.kmMese}km`:'—', RUN_COLOR, 'questo mese'],
          ['KM TOTALI',     statsCorse.totaleKm>0?`${statsCorse.totaleKm}km`:'—', undefined, `${statsCorse.pctTerra.toFixed(2)}% della Terra`],
        ].map(([l,v,c,s],i)=>(
          <div key={l} className={`card card-${i+1}`}>
            <div className="label-xs" style={{marginBottom:7}}>{l}</div>
            <div className="stat-val" style={c?{color:c}:{}}>{v}</div>
            <div style={{fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace"}}>{s}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'1px solid var(--bd)',marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:'9px 18px',border:'none',background:'transparent',cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
            color:tab===t.id?GYM_COLOR:'var(--t2)',
            borderBottom:tab===t.id?`2px solid ${GYM_COLOR}`:'2px solid transparent',
            marginBottom:-1,transition:'all .16s',display:'flex',alignItems:'center',gap:6,
          }}>
            {t.label}
            {t.badge&&<span style={{fontSize:10,padding:'1px 5px',borderRadius:10,background:GYM_COLOR,color:'#fff',fontWeight:700}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── TAB OGGI ── */}
      {tab==='oggi'&&(
        <div>
          {isRiposo&&!sessioneOggi&&(
            <div className="card" style={{textAlign:'center',padding:48,background:'rgba(58,112,89,.04)',border:'1px solid rgba(58,112,89,.15)'}}>
              <div style={{fontSize:48,marginBottom:12}}>{giornoOggi.tipo==='riposo_attivo'?'🚶':'😴'}</div>
              <div style={{fontSize:17,fontWeight:700,marginBottom:8}}>{giornoOggi.tipo==='riposo_attivo'?'Riposo Attivo':'Giorno di Riposo'}</div>
              <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7}}>
                {giornoOggi.tipo==='riposo_attivo'?'Attività leggera: camminate, stretching, mobilità.':'Il recupero è parte fondamentale dell\'allenamento. I muscoli crescono a riposo.'}
              </div>
            </div>
          )}

          {isGymDay&&!sessioneOggi&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12}}>
              <div className="card card-5">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:GYM_COLOR,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:4}}>
                      {TIPI_GIORNO[giornoOggi.tipo]?.icon} {TIPI_GIORNO[giornoOggi.tipo]?.label}
                    </div>
                    <div style={{fontSize:18,fontWeight:700}}>{giornoOggi.nome||'Allenamento di oggi'}</div>
                  </div>
                  <button onClick={handleStartSessione} style={{padding:'10px 22px',borderRadius:9,border:`1px solid ${GYM_COLOR}`,background:GYM_COLOR,color:'#fff',fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:'pointer',boxShadow:`0 4px 14px rgba(58,112,89,.3)`,transition:'all .16s'}}
                    onMouseEnter={e=>e.currentTarget.style.opacity='.88'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
                    💪 Inizia allenamento
                  </button>
                </div>
                {(giornoOggi.esercizi||[]).length===0
                  ? <EmptyState message="Nessun esercizio nella scheda — vai nella tab Scheda"/>
                  : (giornoOggi.esercizi||[]).map(e=>(
                    <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,background:'var(--sf2)',marginBottom:7,border:'1px solid var(--bd)'}}>
                      <span style={{fontSize:13,fontWeight:600,color:'var(--t1)',flex:1}}>{e.nome}</span>
                      <Badge color={GYM_COLOR}>{e.muscolo}</Badge>
                      <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--t2)'}}>{e.serie}×{e.reps}{parseFloat(e.peso)>0?` @ ${e.peso}kg`:''}</span>
                    </div>
                  ))
                }
              </div>
              <RecentSessions sessioni={sessioni}/>
            </div>
          )}

          {sessioneOggi&&!sessioneOggi.completata&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:12}}>
              <div>
                <div className="card card-5" style={{marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div>
                      <div style={{fontSize:11,color:GYM_COLOR,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase'}}>In corso {TIPI_GIORNO[sessioneOggi.tipo]?.icon}</div>
                      <div style={{fontSize:17,fontWeight:700}}>{sessioneOggi.nome}</div>
                    </div>
                    <SessionTimer iniziataAlle={sessioneOggi.iniziataAlle}/>
                  </div>
                  {(()=>{
                    const tot=(sessioneOggi.esercizi||[]).reduce((a,e)=>a+(e.serie_log?.length||0),0)
                    const done=(sessioneOggi.esercizi||[]).reduce((a,e)=>a+(e.serie_log?.filter(s=>s.completata).length||0),0)
                    return <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:11,color:'var(--t3)'}}>
                        <span>Progresso sessione</span><span style={{fontFamily:"'DM Mono',monospace"}}>{done}/{tot} serie</span>
                      </div>
                      <ProgressBar value={done} max={tot} color={GYM_COLOR}/>
                    </div>
                  })()}
                </div>
                {(sessioneOggi.esercizi||[]).map(e=><ExerciseCard key={e.id} esercizio={e} sid={sessioneOggi.id} onComplete={completaSerie}/>)}
                <button onClick={handleCompleta} style={{width:'100%',marginTop:8,padding:'13px',borderRadius:10,border:`1px solid ${GYM_COLOR}`,background:GYM_COLOR,color:'#fff',fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:'pointer',boxShadow:`0 4px 16px rgba(58,112,89,.3)`,transition:'all .16s'}}>
                  🎯 Completa allenamento
                </button>
              </div>
              <RecentSessions sessioni={sessioni}/>
            </div>
          )}

          {sessioneOggi?.completata&&(
            <div className="card card-5" style={{background:'rgba(58,112,89,.05)',border:'1px solid rgba(58,112,89,.2)'}}>
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
                <div style={{fontSize:48}}>🎉</div>
                <div>
                  <div style={{fontSize:18,fontWeight:700,color:GYM_COLOR}}>Allenamento completato!</div>
                  <div style={{fontSize:12,color:'var(--t2)',marginTop:2}}>{sessioneOggi.nome} · {sessioneOggi.durata_min}min</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {[['Esercizi',(sessioneOggi.esercizi||[]).length],['Serie',((sessioneOggi.esercizi||[]).reduce((a,e)=>a+(e.serie_log?.filter(s=>s.completata).length||0),0))],['Durata',`${sessioneOggi.durata_min}min`]].map(([l,v])=>(
                  <div key={l} style={{textAlign:'center',padding:'10px 8px',background:'var(--sf)',borderRadius:9,border:'1px solid var(--bd)'}}>
                    <div style={{fontSize:10,color:'var(--t3)',marginBottom:4,letterSpacing:'.07em'}}>{l.toUpperCase()}</div>
                    <div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:GYM_COLOR}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB SCHEDA ── */}
      {tab==='scheda'&&(
        <div style={{display:'grid',gridTemplateColumns:'200px 1fr',gap:14}}>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {GIORNI_FULL.map(g=>{
              const gg=scheda[g.id]||{}
              const gp=palSched[g.id]||{}
              // Auto-determine: se palestra non abilitata, è riposo
              const efectiveTipo = gp.abilitato ? (gg.tipo||'custom') : 'riposo'
              const tipo=TIPI_GIORNO[efectiveTipo]||TIPI_GIORNO.riposo
              const sel=selectedDow===g.id
              const isToday=g.id===todayDow
              return (
                <div key={g.id} onClick={()=>setSelectedDow(g.id)}
                  style={{padding:'10px 12px',borderRadius:9,cursor:'pointer',border:`1px solid ${sel?tipo.color:'var(--bd)'}`,background:sel?tipo.color+'12':'var(--sf)',transition:'all .15s'}}
                  onMouseEnter={e=>{if(!sel)e.currentTarget.style.borderColor=tipo.color+'66'}}
                  onMouseLeave={e=>{if(!sel)e.currentTarget.style.borderColor='var(--bd)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{fontSize:15}}>{tipo.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:sel?tipo.color:'var(--t1)',display:'flex',alignItems:'center',gap:5}}>
                        {g.l}{isToday&&<span style={{fontSize:9,color:'var(--ac)',fontWeight:700}}>●</span>}
                        {!gp.abilitato&&<span style={{fontSize:9,color:'var(--t3)',fontWeight:400,marginLeft:2}}>riposo</span>}
                      </div>
                      <div style={{fontSize:10,color:'var(--t3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{gg.nome||tipo.label}</div>
                    </div>
                    {gp.abilitato&&<span style={{fontSize:10,color:'var(--t3)',fontFamily:"'DM Mono',monospace"}}>{(gg.esercizi||[]).length}ex</span>}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(()=>{
              const g=scheda[selectedDow]||{}
              const gp=palSched[selectedDow]||{}
              const tipo=TIPI_GIORNO[g.tipo]||TIPI_GIORNO.riposo
              const dowLabel=GIORNI_FULL.find(x=>x.id===selectedDow)?.l
              const isGymConfigured=gp.abilitato
              return (
                <>
                  <div className="card card-1">
                    <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
                      <span style={{fontSize:32}}>{tipo.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:17,fontWeight:700,marginBottom:8}}>{dowLabel}</div>
                        {isGymConfigured
                          ? <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                              <select className="input-field" value={g.tipo||'riposo'} onChange={e=>updateGiorno(selectedDow,{tipo:e.target.value})}>
                                {Object.entries(TIPI_GIORNO).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                              </select>
                              <input className="input-field" placeholder="Nome sessione" value={g.nome||''} onChange={e=>updateGiorno(selectedDow,{nome:e.target.value})}/>
                            </div>
                          : <div style={{padding:'7px 10px',background:'var(--sf2)',borderRadius:7,fontSize:12,color:'var(--t3)'}}>
                              Giorno di riposo — abilita la palestra in <strong>Impostazioni → Palestra</strong> per configurare questo giorno.
                            </div>
                        }
                      </div>
                    </div>
                    {isGymConfigured&&gp.dalle&&(
                      <div style={{padding:'6px 10px',background:GYM_COLOR+'0D',borderRadius:7,fontSize:11,color:GYM_COLOR,borderLeft:`3px solid ${GYM_COLOR}`}}>
                        Orario configurato: {gp.dalle}–{gp.alle}{gp.sede?` · ${gp.sede}`:''}
                      </div>
                    )}
                  </div>

                  {isGymConfigured&&g.tipo!=='riposo'&&g.tipo!=='riposo_attivo'&&(
                    <div className="card card-2">
                      <SectionHeader action={<button className="btn-ghost btn-sm" onClick={()=>setEsFormOpen(f=>!f)}>{esFormOpen?'✕':'+ esercizio'}</button>}>
                        esercizi — {(g.esercizi||[]).length}
                      </SectionHeader>
                      {esFormOpen&&(
                        <div style={{padding:'12px',background:'var(--sf2)',borderRadius:9,marginBottom:12,border:'1px solid var(--bd)',animation:'slideDown .18s ease'}}>
                          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:7,marginBottom:7}}>
                            <input className="input-field" placeholder="Nome esercizio (es. Panca Piana)" value={esForm.nome} onChange={e=>setEsForm(f=>({...f,nome:e.target.value}))}/>
                            <select className="input-field" value={esForm.muscolo} onChange={e=>setEsForm(f=>({...f,muscolo:e.target.value}))}>
                              {MUSCOLI.map(m=><option key={m}>{m}</option>)}
                            </select>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:7,marginBottom:7}}>
                            {[['Serie','serie'],['Reps','reps'],['Peso kg','peso'],['Rec. s','recupero_sec']].map(([ph,key])=>(
                              <div key={key}><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>{ph}</div>
                                <input className="input-field" type="number" value={esForm[key]} onChange={e=>setEsForm(f=>({...f,[key]:e.target.value}))}/></div>
                            ))}
                          </div>
                          <input className="input-field" placeholder="Note (opzionale)" value={esForm.note} onChange={e=>setEsForm(f=>({...f,note:e.target.value}))} style={{marginBottom:7}}/>
                          <InputRow>
                            <button className="btn-ghost" onClick={()=>setEsFormOpen(false)}>Annulla</button>
                            <button className="btn-accent" onClick={handleAddEsercizio} style={{background:GYM_COLOR,borderColor:GYM_COLOR}}>Salva esercizio</button>
                          </InputRow>
                        </div>
                      )}
                      {(g.esercizi||[]).length===0
                        ? <EmptyState message="Nessun esercizio. Aggiungine uno."/>
                        : (g.esercizi||[]).map((e,i)=>(
                          <EsercizioRow key={e.id} esercizio={e} index={i} total={(g.esercizi||[]).length}
                            onRemove={()=>showConfirm(`Rimuovere "${e.nome}"?`,()=>removeEsercizio(selectedDow,e.id))}
                            onUpdate={(patch)=>updateEsercizio(selectedDow,e.id,patch)}
                            onMove={(from,to)=>moveEsercizio(selectedDow,from,to)}/>
                        ))
                      }
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── TAB CORSA ── */}
      {tab==='corsa'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:12}}>
          {/* Left: log + charts */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* Add run form */}
            <div className="card card-1">
              <SectionHeader action={<button className="btn-ghost btn-sm" onClick={()=>setCorsaFormOpen(f=>!f)}>{corsaFormOpen?'✕':'+ registra corsa'}</button>}>
                storico corse — {corse.length}
              </SectionHeader>

              {corsaFormOpen&&(
                <div style={{padding:'12px',background:'var(--sf2)',borderRadius:9,marginBottom:12,border:`1px solid rgba(196,106,60,.2)`,animation:'slideDown .18s ease'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:7,marginBottom:7}}>
                    <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>Data</div>
                      <input className="input-field" type="date" value={corsaForm.data} onChange={e=>setCorsaForm(f=>({...f,data:e.target.value}))}/></div>
                    <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>Distanza (km)</div>
                      <input className="input-field" type="number" step="0.01" placeholder="5.0" value={corsaForm.distanza_km} onChange={e=>setCorsaForm(f=>({...f,distanza_km:e.target.value}))}/></div>
                    <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>Durata (min)</div>
                      <input className="input-field" type="number" placeholder="30" value={corsaForm.durata_min} onChange={e=>setCorsaForm(f=>({...f,durata_min:e.target.value}))}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:7,marginBottom:7}}>
                    <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>Dislivello (m)</div>
                      <input className="input-field" type="number" placeholder="0" value={corsaForm.dislivello_m} onChange={e=>setCorsaForm(f=>({...f,dislivello_m:e.target.value}))}/></div>
                    <div><div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>Note</div>
                      <input className="input-field" placeholder="Percorso, condizioni..." value={corsaForm.note} onChange={e=>setCorsaForm(f=>({...f,note:e.target.value}))}/></div>
                  </div>
                  {/* Live preview */}
                  {previewSpeed&&(
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:10}}>
                      {[['Velocità media',`${previewSpeed} km/h`,RUN_COLOR],['Passo',previewPace?.label||'—',GYM_COLOR],['Tempo totale',formatDurata(previewDur),'var(--t2)']].map(([l,v,c])=>(
                        <div key={l} style={{padding:'7px 10px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--bd)',textAlign:'center'}}>
                          <div style={{fontSize:9,color:'var(--t3)',marginBottom:2}}>{l.toUpperCase()}</div>
                          <div style={{fontSize:14,fontFamily:"'DM Mono',monospace",fontWeight:700,color:c}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <InputRow>
                    <button className="btn-ghost" onClick={()=>setCorsaFormOpen(false)}>Annulla</button>
                    <button className="btn-accent" onClick={handleAddCorsa} style={{background:RUN_COLOR,borderColor:RUN_COLOR}}>🏃 Salva corsa</button>
                  </InputRow>
                </div>
              )}

              {/* Run list */}
              {corse.length===0&&!corsaFormOpen
                ? <EmptyState message="Nessuna corsa registrata. Inizia il tuo tracking!"/>
                : corse.slice(0,12).map(c=>(
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--bd)'}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:RUN_COLOR+'15',border:`1.5px solid ${RUN_COLOR}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🏃</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:14,fontWeight:700,color:RUN_COLOR,fontFamily:"'DM Mono',monospace"}}>{c.distanza_km}km</span>
                        <span style={{fontSize:12,color:'var(--t2)'}}>{formatDurata(c.durata_min)}</span>
                        {c.dislivello_m>0&&<span style={{fontSize:11,color:'var(--t3)'}}>↑{c.dislivello_m}m</span>}
                      </div>
                      <div style={{display:'flex',gap:8,marginTop:2,flexWrap:'wrap'}}>
                        <span style={{fontSize:11,color:'var(--t3)',fontFamily:"'DM Mono',monospace"}}>{formatShort(c.data)}</span>
                        {c.velocita_media>0&&<span style={{fontSize:11,color:'var(--t2)'}}>{c.velocita_media}km/h</span>}
                        {c.pace&&<span style={{fontSize:11,color:GYM_COLOR,fontFamily:"'DM Mono',monospace"}}>{c.pace.label}/km</span>}
                        {c.note&&<span style={{fontSize:10,color:'var(--t3)',fontStyle:'italic'}}>{c.note}</span>}
                      </div>
                    </div>
                    <button className="btn-danger" style={{fontSize:11,padding:'2px 7px'}}
                      onClick={()=>showConfirm(`Eliminare la corsa del ${formatShort(c.data)}?`,()=>removeCorsa(c.id))}>✕</button>
                  </div>
                ))
              }
            </div>

            {/* Charts */}
            {statsCorse.distList.length>1&&(
              <div className="card card-2">
                <div className="label-xs" style={{marginBottom:12}}>distanza per uscita (km)</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={statsCorse.distList} margin={{top:4,right:4,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false}/>
                    <XAxis dataKey="data" tickFormatter={d=>formatShort(d)} tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}km`} width={36}/>
                    <Tooltip formatter={(v)=>[`${v}km`,'Distanza']} labelFormatter={d=>formatShort(d)} contentStyle={{background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,fontSize:12}}/>
                    <Bar dataKey="distanza_km" fill={RUN_COLOR} radius={[4,4,0,0]} opacity={0.85}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {statsCorse.paceList.length>1&&(
              <div className="card card-3">
                <div className="label-xs" style={{marginBottom:4}}>andamento passo (min/km) — <span style={{color:GYM_COLOR,fontWeight:400}}>più basso = più veloce</span></div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={statsCorse.paceList} margin={{top:4,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                    <XAxis dataKey="data" tickFormatter={d=>formatShort(d)} tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false}
                      tickFormatter={v=>{const mm=Math.floor(v),ss=Math.round((v-mm)*60);return `${mm}'${String(ss).padStart(2,'0')}"` }} width={44} domain={['auto','auto']}/>
                    <Tooltip formatter={(v)=>{const mm=Math.floor(v),ss=Math.round((v-mm)*60);return [`${mm}'${String(ss).padStart(2,'0')}"/km`,'Passo']}} labelFormatter={d=>formatShort(d)} contentStyle={{background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,fontSize:12}}/>
                    <Line type="monotone" dataKey="pace.decimal" stroke={GYM_COLOR} strokeWidth={2} dot={{r:4,fill:GYM_COLOR}} name="Passo"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {statsCorse.weeklyKm.length>0&&(
              <div className="card card-4">
                <div className="label-xs" style={{marginBottom:12}}>km settimanali</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={statsCorse.weeklyKm} margin={{top:4,right:4,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false}/>
                    <XAxis dataKey="data" tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:9,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}km`} width={32}/>
                    <Tooltip formatter={(v)=>[`${v}km`,'Settimana']} contentStyle={{background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,fontSize:12}}/>
                    <Bar dataKey="km" fill={GYM_COLOR} radius={[4,4,0,0]} opacity={0.8}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Right: Earth globe + stats */}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="card card-2" style={{background:'linear-gradient(135deg,rgba(196,106,60,.04),rgba(58,112,89,.06))'}}>
              <div className="label-xs" style={{marginBottom:16,color:RUN_COLOR}}>🌍 il tuo viaggio attorno alla Terra</div>
              <EarthGlobe pctTerra={statsCorse.pctTerra} totaleKm={statsCorse.totaleKm} giriTerra={statsCorse.giriTerra}/>
            </div>

            <div className="card card-3">
              <div className="label-xs" style={{marginBottom:10}}>record personali</div>
              {[
                ['🏅 Distanza max', statsCorse.bestDist?`${statsCorse.bestDist.distanza_km}km`:'—', statsCorse.bestDist?formatShort(statsCorse.bestDist.data):null],
                ['⚡ Passo migliore', statsCorse.bestPace?.pace?.label||'—', statsCorse.bestPace?formatShort(statsCorse.bestPace.data):null],
                ['📅 Corse totali', `${statsCorse.numCorse}`, 'registrate'],
                ['⏱ Tempo totale', statsCorse.totalMin>0?formatDurata(statsCorse.totalMin):'—', 'in movimento'],
              ].map(([l,v,sub])=>(
                <div key={l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
                  <span style={{fontSize:12,color:'var(--t2)'}}>{l}</span>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:700,color:RUN_COLOR}}>{v}</div>
                    {sub&&<div style={{fontSize:10,color:'var(--t3)'}}>{sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB PROGRESSI ── */}
      {tab==='progressi'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:12}}>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div className="card card-1">
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div className="label-xs" style={{flex:1}}>progressione peso — seleziona esercizio</div>
                <select className="input-field" style={{maxWidth:220}} value={selectedEsercizio} onChange={e=>setSelectedEsercizio(e.target.value)}>
                  {allNomi.length===0?<option value="">Nessun esercizio nel log</option>:allNomi.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              {(()=>{
                const data=selectedEsercizio?getProgressiEsercizio(selectedEsercizio):[]
                if(data.length===0) return <EmptyState message={allNomi.length===0?'Completa una sessione per vedere i progressi':'Nessun dato per questo esercizio'}/>
                const first=data[0].pesoMax,last=data[data.length-1].pesoMax,diff=Math.round((last-first)*10)/10
                return (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data} margin={{top:4,right:8,bottom:0,left:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)"/>
                        <XAxis dataKey="data" tickFormatter={d=>formatShort(d)} tick={{fontSize:10,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fontSize:10,fill:'var(--t2)',fontFamily:"'DM Mono'"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}kg`} width={42}/>
                        <Tooltip formatter={(v,n)=>[`${v}kg`,n==='pesoMax'?'Peso massimo':'Peso medio']} labelFormatter={l=>formatShort(l)} contentStyle={{background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,fontSize:12}}/>
                        <Line type="monotone" dataKey="pesoMax" stroke={GYM_COLOR} strokeWidth={2} dot={{r:4,fill:GYM_COLOR}} name="pesoMax"/>
                        <Line type="monotone" dataKey="pesoMedio" stroke="var(--ac)" strokeWidth={1.5} dot={{r:3}} strokeDasharray="4 2" name="pesoMedio"/>
                      </LineChart>
                    </ResponsiveContainer>
                    {data.length>=2&&(
                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <div style={{padding:'6px 12px',borderRadius:7,background:GYM_COLOR+'12',border:`1px solid ${GYM_COLOR}22`,fontSize:11,color:GYM_COLOR}}>Max: <strong style={{fontFamily:"'DM Mono',monospace"}}>{last}kg</strong></div>
                        {diff!==0&&<div style={{padding:'6px 12px',borderRadius:7,background:diff>0?'rgba(58,112,89,.08)':'rgba(160,69,69,.08)',border:`1px solid ${diff>0?'rgba(58,112,89,.2)':'rgba(160,69,69,.2)'}`,fontSize:11,color:diff>0?GYM_COLOR:'var(--rd)'}}>
                          {diff>0?'+':''}{diff}kg rispetto all'inizio
                        </div>}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>

            <div className="card card-2">
              <div className="label-xs" style={{marginBottom:12}}>storico sessioni palestra — {sessioni.filter(s=>s.completata).length}</div>
              {sessioni.filter(s=>s.completata).length===0
                ? <EmptyState message="Nessuna sessione completata"/>
                : [...sessioni].filter(s=>s.completata).reverse().slice(0,12).map(s=>{
                  const t=TIPI_GIORNO[s.tipo]||TIPI_GIORNO.riposo
                  return (
                    <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--bd)'}}>
                      <span style={{fontSize:18}}>{t.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500}}>{s.nome}</div>
                        <div style={{fontSize:11,color:'var(--t3)',fontFamily:"'DM Mono',monospace"}}>{formatShort(s.data)} · {s.esercizi?.length||0} esercizi · {s.durata_min}min</div>
                      </div>
                      <button className="btn-danger" style={{fontSize:11,padding:'2px 7px'}} onClick={()=>showConfirm('Eliminare questa sessione?',()=>deleteSessione(s.id))}>✕</button>
                    </div>
                  )
                })
              }
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <WeeklyCalendar scheda={scheda} sessioni={sessioni} todayDow={todayDow} schedulePalestra={palSched}/>
            <div className="card card-3">
              <div className="label-xs" style={{marginBottom:10}}>sessioni per tipo</div>
              {(()=>{
                const byTipo={}
                sessioni.filter(s=>s.completata).forEach(s=>{byTipo[s.tipo]=(byTipo[s.tipo]||0)+1})
                const total=sessioni.filter(s=>s.completata).length
                const data=Object.entries(byTipo).map(([tipo,count])=>({name:TIPI_GIORNO[tipo]?.label||tipo,count,fill:TIPI_GIORNO[tipo]?.color||'#888'}))
                return data.length===0?<EmptyState message="Nessun dato"/>:data.sort((a,b)=>b.count-a.count).map(d=>(
                  <div key={d.name} style={{marginBottom:9}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:12,color:'var(--t2)'}}>{d.name}</span>
                      <span style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:d.fill}}>{d.count}</span>
                    </div>
                    <div className="progress-track" style={{height:4}}>
                      <div className="progress-fill" style={{width:`${total>0?(d.count/total*100):0}%`,background:d.fill}}/>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecentSessions({sessioni}) {
  const recenti=[...sessioni].filter(s=>s.completata).reverse().slice(0,5)
  return (
    <div className="card card-6">
      <div className="label-xs" style={{marginBottom:10}}>sessioni recenti</div>
      {recenti.length===0?<EmptyState message="Nessuna sessione ancora"/>:recenti.map(s=>{
        const t=TIPI_GIORNO[s.tipo]||TIPI_GIORNO.riposo
        return (
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid var(--bd)'}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.nome}</div>
              <div style={{fontSize:10,color:'var(--t3)',fontFamily:"'DM Mono',monospace"}}>{formatShort(s.data)} · {s.durata_min}min</div>
            </div>
            <span style={{fontSize:10,color:GYM_COLOR,fontWeight:700,border:`1px solid ${GYM_COLOR}33`,borderRadius:8,padding:'2px 6px',flexShrink:0}}>✓</span>
          </div>
        )
      })}
    </div>
  )
}