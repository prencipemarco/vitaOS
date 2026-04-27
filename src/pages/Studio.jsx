import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useStudio, TIPI_CORSO, TIPI_TASK } from '../hooks/useStudio'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useCalendario } from '../hooks/useCalendario'
import { buildPromptMaestro, validateCorsoJSON, callAI } from '../utils/promptMaestro'
import { PageHeader, Badge, EmptyState, ProgressBar, SectionHeader, FormPanel, InputRow, showError, showConfirm, showSuccess, OnboardingModal } from '../components/ui'
import { formatShort } from '../utils/dateHelpers'

// ── Color maps ──────────────────────────────────────────────
const TC = { teoria:'#3A5F8A', esercizi:'#C46A3C', ripasso:'#3A7059', simulazione_esame:'#7A5FA0' }
const TL = { teoria:'Teoria', esercizi:'Esercizi', ripasso:'Ripasso', simulazione_esame:'Simulazione' }

// ── TaskChip ───────────────────────────────────────────────
function TaskChip({ task, onComplete, showDate, compact }) {
  const color = TC[task.tipo] || '#888'
  const today = new Date().toISOString().slice(0, 10)
  const isLate = task.dataPianificata && task.dataPianificata < today && !task.completato
  return (
    <div onClick={onComplete}
      style={{
        display:'flex', alignItems:'center', gap:8,
        padding: compact ? '5px 8px' : '8px 10px',
        border:`1px solid ${task.completato ? 'var(--bd)' : color+'33'}`,
        borderRadius:8, cursor:'pointer',
        background: task.completato ? 'transparent' : color+'08',
        opacity: task.completato ? 0.5 : 1,
        transition:'all .14s',
        marginBottom: compact ? 4 : 6,
      }}
      onMouseEnter={e => { if (!task.completato) e.currentTarget.style.background = color+'16' }}
      onMouseLeave={e => { if (!task.completato) e.currentTarget.style.background = color+'08' }}
    >
      <div style={{
        width:16, height:16, borderRadius:4,
        border:`1.5px solid ${task.completato ? color : 'var(--bd2)'}`,
        background: task.completato ? color : 'transparent',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, transition:'all .14s',
      }}>
        {task.completato && <span style={{ color:'#fff', fontSize:9, fontWeight:700 }}>✓</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{
          fontSize: compact ? 12 : 13,
          fontWeight: task.completato ? 400 : 500,
          color: task.completato ? 'var(--t3)' : 'var(--t1)',
          textDecoration: task.completato ? 'line-through' : 'none',
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>
          {task.titolo}
          {isLate && <span style={{ marginLeft:6, fontSize:10, color:'var(--rd)', fontWeight:600 }}>• ritardo</span>}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:1, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:10, color, fontWeight:600 }}>{TL[task.tipo] || task.tipo}</span>
          <span style={{ fontSize:10, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>{task.durata_minuti}min</span>
          {task.moduloTitolo && !compact && <span style={{ fontSize:10, color:'var(--t3)' }}>{task.moduloTitolo}</span>}
          {showDate && task.dataPianificata && (
            <span style={{ fontSize:10, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>{formatShort(task.dataPianificata)}</span>
          )}
        </div>
      </div>
      {task.oraPianificata && !task.completato && (
        <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:'var(--t3)', flexShrink:0 }}>{task.oraPianificata}</span>
      )}
    </div>
  )
}

// ── ExpandableModule ───────────────────────────────────────
function ExpandableModule({ modulo, tasks, onComplete }) {
  const [open, setOpen] = useState(false)
  const mTasks = tasks.filter(t => t.moduloId === modulo.id)
  const done = mTasks.filter(t => t.completato).length
  const pct = mTasks.length > 0 ? Math.round(done/mTasks.length*100) : 0
  const color = pct === 100 ? 'var(--go)' : pct > 0 ? 'var(--ac)' : 'var(--t3)'
  return (
    <div style={{ marginBottom:8, border:'1px solid var(--bd)', borderRadius:9, overflow:'hidden', transition:'border-color .16s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor='var(--bd2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='var(--bd)'}
    >
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', cursor:'pointer', background:'var(--sf)', userSelect:'none' }}>
        <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:'var(--t3)', minWidth:22 }}>{String(modulo.ordine).padStart(2,'0')}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500 }}>{modulo.titolo}</div>
          <div style={{ height:3, background:'var(--sf2)', borderRadius:2, marginTop:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'var(--go)':'var(--ac)', borderRadius:2, transition:'width .6s' }} />
          </div>
        </div>
        <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color }}>
          {done}/{mTasks.length}
        </span>
        {modulo.oreStimate && <span style={{ fontSize:10, color:'var(--t3)' }}>{modulo.oreStimate}h</span>}
        <span style={{ fontSize:12, color:'var(--t3)', transition:'transform .18s', display:'inline-block', transform:open?'rotate(180deg)':'rotate(0)' }}>⌄</span>
      </div>
      {open && mTasks.length > 0 && (
        <div style={{ padding:'8px 12px 10px', background:'var(--bg)', borderTop:'1px solid var(--bd)', animation:'slideDown .16s ease' }}>
          {mTasks.map(t => (
            <TaskChip key={t.id} task={t} onComplete={() => onComplete(t.id)} compact />
          ))}
        </div>
      )}
      {open && mTasks.length === 0 && (
        <div style={{ padding:'12px', textAlign:'center', color:'var(--t3)', fontSize:12, background:'var(--bg)', borderTop:'1px solid var(--bd)' }}>
          Nessun task pianificato — genera la pianificazione
        </div>
      )}
    </div>
  )
}

// ── AI Import Panel ────────────────────────────────────────
function AIImportPanel({ onImport, apiKey }) {
  const [step, setStep] = useState('input')
  const [syllabus, setSyllabus] = useState('')
  const [tipoCorso, setTipoCorso] = useState('universita')
  const [loading, setLoading] = useState(false)
  const [promptText, setPromptText] = useState('')
  const [jsonManual, setJsonManual] = useState('')
  const [parseError, setParseError] = useState('')

  const handleCallAI = async () => {
    if (!apiKey) { setPromptText(buildPromptMaestro(syllabus, tipoCorso)); setStep('reviewing'); return }
    setLoading(true)
    try {
      const raw = await callAI(buildPromptMaestro(syllabus, tipoCorso), apiKey)
      const result = validateCorsoJSON(raw)
      if (!result.valid) { setParseError(result.error); setJsonManual(raw); setStep('manual') }
      else { onImport(result.data); showSuccess('Corso importato!') }
    } catch(e) { setParseError(e.message); setStep('manual') }
    finally { setLoading(false) }
  }

  const copyClip = (t) => navigator.clipboard.writeText(t).then(() => showSuccess('Copiato!'))

  const handleManual = () => {
    setParseError('')
    const result = validateCorsoJSON(jsonManual)
    if (!result.valid) { setParseError(result.error); return }
    onImport(result.data)
    showSuccess('Corso importato!')
  }

  if (step === 'input') return (
    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
      <div style={{ display:'flex', gap:6 }}>
        {Object.entries(TIPI_CORSO).map(([k,v]) => (
          <button key={k} onClick={() => setTipoCorso(k)} style={{
            flex:1, padding:'7px', border:`1px solid ${tipoCorso===k?'var(--ac)':'var(--bd2)'}`,
            background:tipoCorso===k?'var(--ac-bg)':'transparent', borderRadius:8,
            color:tipoCorso===k?'var(--ac)':'var(--t2)', fontSize:12, cursor:'pointer',
            fontFamily:"'DM Sans',sans-serif", transition:'all .14s',
          }}>{v.icon} {v.label}</button>
        ))}
      </div>
      <div style={{ fontSize:11, color:'var(--t3)', lineHeight:1.6 }}>
        Incolla il programma del corso, indice del libro, o descrizione degli argomenti. L'AI genera moduli e task automaticamente.
      </div>
      <textarea value={syllabus} onChange={e => setSyllabus(e.target.value)}
        placeholder="Es: Capitolo 1: Introduzione alle reti. Cap 2: Modello OSI. Cap 3: TCP/IP..."
        className="input-field" style={{ minHeight:150, resize:'vertical', lineHeight:1.6 }} />
      <div style={{ display:'flex', gap:7 }}>
        <button className="btn-accent" onClick={handleCallAI}
          disabled={!syllabus.trim() || loading}
          style={{ flex:1, opacity:syllabus.trim()&&!loading?1:.5 }}>
          {loading ? '⏳ Generazione...' : apiKey ? '🤖 Genera con AI' : '📋 Genera prompt'}
        </button>
        <button className="btn-ghost" onClick={() => setStep('manual')} style={{ whiteSpace:'nowrap' }}>
          📝 JSON manuale
        </button>
      </div>
      {!apiKey && (
        <div style={{ fontSize:11, color:'var(--t3)', padding:'7px 10px', background:'var(--sf2)', borderRadius:7, lineHeight:1.6 }}>
          💡 Senza API key: il sistema genera il prompt → copialo in Claude.ai → incolla il JSON qui.
        </div>
      )}
    </div>
  )

  if (step === 'reviewing') return (
    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
      <div style={{ fontSize:13, fontWeight:500 }}>Prompt generato — copia e incolla in Claude.ai</div>
      <div style={{ position:'relative' }}>
        <textarea readOnly value={promptText} className="input-field"
          style={{ minHeight:180, fontFamily:"'DM Mono',monospace", fontSize:11, lineHeight:1.5, resize:'vertical' }} />
        <button className="btn-ghost" onClick={() => copyClip(promptText)}
          style={{ position:'absolute', top:8, right:8, fontSize:11, padding:'3px 8px' }}>📋 Copia</button>
      </div>
      <div style={{ fontSize:11, color:'var(--t3)', padding:'7px 10px', background:'var(--ac-bg)', borderRadius:7, lineHeight:1.6 }}>
        1. Copia → 2. Apri Claude.ai → 3. Incolla → 4. Copia la risposta → 5. Clicca sotto
      </div>
      <InputRow>
        <button className="btn-ghost" onClick={() => setStep('input')}>← Torna</button>
        <button className="btn-accent" onClick={() => setStep('manual')} style={{ flex:1 }}>→ Incolla il JSON</button>
      </InputRow>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
      <div style={{ fontSize:13, fontWeight:500 }}>Incolla il JSON generato</div>
      <textarea value={jsonManual} onChange={e => setJsonManual(e.target.value)}
        className="input-field" style={{ minHeight:200, fontFamily:"'DM Mono',monospace", fontSize:11, lineHeight:1.5, resize:'vertical' }} />
      {parseError && (
        <div style={{ fontSize:12, color:'var(--rd)', padding:'7px 10px', background:'rgba(160,69,69,.07)', borderRadius:7 }}>⚠ {parseError}</div>
      )}
      <InputRow>
        <button className="btn-ghost" onClick={() => setStep('input')}>← Torna</button>
        <button className="btn-accent" onClick={handleManual} style={{ flex:1 }}>✓ Importa corso</button>
      </InputRow>
    </div>
  )
}

// ── Manual Course Form ─────────────────────────────────────
function ManualForm({ onSave }) {
  const [f, setF] = useState({ nome:'', tipo:'universita', dataEsame:'', priorita:'media', difficoltaPercepita:3, oreTotaliStimate:'' })
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <input className="input-field" placeholder="Nome corso / materia" value={f.nome} onChange={e => setF(p => ({...p,nome:e.target.value}))} />
      <InputRow>
        <select className="input-field" value={f.tipo} onChange={e => setF(p => ({...p,tipo:e.target.value}))}>
          {Object.entries(TIPI_CORSO).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input-field" value={f.priorita} onChange={e => setF(p => ({...p,priorita:e.target.value}))}>
          <option value="alta">Alta priorità</option>
          <option value="media">Media priorità</option>
          <option value="bassa">Bassa priorità</option>
        </select>
      </InputRow>
      <InputRow>
        <input className="input-field" type="date" value={f.dataEsame} onChange={e => setF(p => ({...p,dataEsame:e.target.value}))} title="Data esame" />
        <input className="input-field" type="number" placeholder="Ore stimate totali" value={f.oreTotaliStimate} onChange={e => setF(p => ({...p,oreTotaliStimate:e.target.value}))} />
      </InputRow>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:12, color:'var(--t2)' }}>Difficoltà</span>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setF(p => ({...p,difficoltaPercepita:n}))}
            style={{ width:28, height:28, borderRadius:'50%',
              border:`1.5px solid ${n<=f.difficoltaPercepita?'var(--ac)':'var(--bd2)'}`,
              background:n<=f.difficoltaPercepita?'var(--ac-bg)':'transparent',
              color:n<=f.difficoltaPercepita?'var(--ac)':'var(--t3)',
              fontWeight:700, fontSize:12, cursor:'pointer', transition:'all .14s' }}>
            {n}
          </button>
        ))}
      </div>
      <button className="btn-accent" onClick={() => { if(!f.nome.trim()) return; onSave({ corso:{ ...f, oreTotaliStimate:parseInt(f.oreTotaliStimate)||40 }, moduli:[] }) }}>
        Crea corso
      </button>
    </div>
  )
}

// ── Main Studio Page ───────────────────────────────────────
export default function Studio() {
  const { corsi, addCorso, removeCorso, getTasksForCorso, completeTask,
          generateSchedule, generateAllSchedules, getStats,
          getTodayTasks, getTodayTasksCompleted, getLateTasksCount } = useStudio()
  const { settings, getScheduleStudio } = useImpostazioni()
  const { events } = useCalendario()

  const [tab, setTab] = useState('oggi')
  const [selectedId, setSelectedId] = useState(null)
  const [addMode, setAddMode] = useState(null)
  const [addSubMode, setAddSubMode] = useState('ai')
  const [scheduleResult, setScheduleResult] = useState(null)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [scheduleConfig, setScheduleConfig] = useState(null)

  const todayPending = getTodayTasks()
  const todayDone = getTodayTasksCompleted()
  const lateCount = getLateTasksCount()
  const selectedCorso = corsi.find(c => c.id === selectedId)
  const selectedTasks = selectedId ? getTasksForCorso(selectedId) : []
  const selectedStats = selectedId ? getStats(selectedId) : null

  // KPI: only pending today (not late, not done)
  const todayActual = todayPending.filter(t => !t.isLate)
  const pendingCount = todayActual.length + lateCount

  const handleAddCorso = (data) => {
    const id = addCorso(data)
    setSelectedId(id)
    setAddMode(null)
    setTab('corsi')
  }

  const handleScheduleSingle = () => {
    if (!selectedId) return
    const todayStr = new Date().toISOString().slice(0, 10)
    setScheduleConfig({ corsoId: selectedId, dataInizio: todayStr, modalita: 'bilanciato' })
  }

  const confirmSchedule = () => {
    const r = generateSchedule(scheduleConfig.corsoId, getScheduleStudio(), events, scheduleConfig)
    setScheduleResult(r)
    setScheduleConfig(null)
    if (r.error) showError(r.error)
    else {
      showSuccess(`Pianificazione completata! ${r.slotsCount} sessioni · ${r.oreDisponibili}h disponibili${!r.fattibile ? ' ⚠ ore insufficienti' : ''}`)
      setTab('roadmap')
    }
  }

  const handleScheduleAll = async () => {
    setGlobalLoading(true)
    const r = generateAllSchedules(getScheduleStudio(), events)
    setGlobalLoading(false)
    if (r.error) showError(r.error)
    else showSuccess(`Pianificazione globale: ${r.corsiPianificati} corsi su ${r.slotsCount} sessioni disponibili.`)
  }

  const handleRemoveCorso = (c) => showConfirm(`Eliminare "${c.nome}" e tutti i task?`, () => {
    removeCorso(c.id); if(selectedId === c.id) setSelectedId(null)
  })

  // Group today tasks by course for display
  const todayByCourse = {}
  todayPending.forEach(t => {
    if (!todayByCourse[t.corsoId]) todayByCourse[t.corsoId] = []
    todayByCourse[t.corsoId].push(t)
  })

  const oreStudioSett = Object.values(settings.scheduleStudio||{}).reduce((tot, s) => {
    if (!s.abilitato || !s.dalle || !s.alle) return tot
    const [hd,md] = s.dalle.split(':').map(Number)
    const [ha,ma] = s.alle.split(':').map(Number)
    return tot + Math.max(0, (ha*60+ma - hd*60-md) / 60)
  }, 0).toFixed(1)

  const chartData = selectedTasks.length > 0
    ? Object.entries(selectedTasks.reduce((acc, t) => { acc[t.tipo]=(acc[t.tipo]||0)+1; return acc }, {}))
        .map(([tipo, count]) => ({ name: TL[tipo]||tipo, count, fill: TC[tipo]||'#888' }))
    : []

  const TABS = [
    { id:'oggi',    label:'Oggi',   badge: pendingCount },
    { id:'corsi',   label:'Corsi',  badge: corsi.length },
    { id:'roadmap', label:'Roadmap',badge: null },
  ]

  return (
    <div style={{ padding:28, animation:'fadeUp .24s ease both' }}>
      <OnboardingModal 
        sectionId="studio"
        title="Gestione Studio"
        icon="🎓"
        description="Pianifica il tuo percorso di studio. Aggiungi i corsi, carica i task e monitora il progresso verso l'esame. Il sistema calcola automaticamente la tua velocità di studio e ti avvisa se sei in ritardo rispetto alla scadenza prefissata."
      />
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 }}>
        <PageHeader label="studio" title="Smart Study Planner" />
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {corsi.length > 0 && (
            <button className="btn-ghost" onClick={handleScheduleAll} disabled={globalLoading}
              style={{ display:'flex', alignItems:'center', gap:6, color:'var(--ac)', borderColor:'rgba(196,106,60,.3)' }}>
              {globalLoading ? '⏳' : '⚡'} Pianifica tutti i corsi
            </button>
          )}
          <button className="btn-ghost" onClick={() => { setAddMode('new'); setTab('corsi'); setSelectedId(null) }}>
            + Aggiungi corso
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--bd)', marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'9px 18px', border:'none', background:'transparent', cursor:'pointer',
              fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:500,
              color: tab===t.id ? 'var(--ac)' : 'var(--t2)',
              borderBottom: tab===t.id ? '2px solid var(--ac)' : '2px solid transparent',
              marginBottom:-1, transition:'all .16s', display:'flex', alignItems:'center', gap:6 }}>
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:'var(--ac)', color:'#fff', fontWeight:700 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB OGGI ── */}
      {tab === 'oggi' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            {[
              ['DA FARE OGGI', todayActual.length || '—', undefined, 'task pendenti'],
              ['IN RITARDO', lateCount || '—', lateCount>0?'var(--rd)':undefined, 'da recuperare'],
              ['COMPLETATI OGGI', todayDone.length || '—', todayDone.length>0?'var(--go)':undefined, 'questa sessione'],
              ['ORE STUDIO/SETT', `${oreStudioSett}h`, undefined, 'configurate'],
            ].map(([l,v,c,s],i) => (
              <div key={l} className={`card card-${i+1}`}>
                <div className="label-xs" style={{ marginBottom:7 }}>{l}</div>
                <div className="stat-val" style={c?{color:c}:{}}>{v}</div>
                <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{s}</div>
              </div>
            ))}
          </div>

          {todayPending.length === 0 && todayDone.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>◎</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Nessun task per oggi</div>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:16 }}>
                {corsi.length === 0 ? 'Aggiungi un corso per iniziare.' : 'Genera la pianificazione per vedere i task quotidiani.'}
              </div>
              {corsi.length > 0 && <button className="btn-accent" onClick={handleScheduleAll}>⚡ Pianifica tutti i corsi</button>}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {/* Pending tasks by course */}
              {Object.entries(todayByCourse).map(([corsoId, tasks]) => {
                const corso = corsi.find(c => c.id === corsoId)
                return (
                  <div key={corsoId} className="card">
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <span style={{ fontSize:18 }}>{TIPI_CORSO[corso?.tipo]?.icon || '📖'}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{corso?.nome || corsoId}</div>
                        <div style={{ fontSize:11, color:'var(--t3)' }}>
                          {tasks.filter(t=>!t.isLate).length} oggi · {tasks.filter(t=>t.isLate).length > 0 ? `${tasks.filter(t=>t.isLate).length} in ritardo · ` : ''}
                          {tasks.reduce((s,t)=>s+t.durata_minuti,0)}min totali
                        </div>
                      </div>
                    </div>
                    {tasks.map(t => (
                      <TaskChip key={t.id} task={t} onComplete={() => completeTask(corsoId, t.id)} showDate={t.isLate} />
                    ))}
                  </div>
                )
              })}

              {/* Completed today */}
              {todayDone.length > 0 && (
                <div className="card" style={{ opacity:.7 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--go)', marginBottom:10, letterSpacing:'.08em' }}>
                    COMPLETATI OGGI — {todayDone.length}
                  </div>
                  {todayDone.slice(0,6).map(t => (
                    <TaskChip key={t.id} task={{ ...t, completato:true }} onComplete={() => completeTask(t.corsoId, t.id)} compact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB CORSI ── */}
      {tab === 'corsi' && (
        <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:14 }}>
          {/* Course list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {corsi.map(corso => {
              const stats = getStats(corso.id)
              const sel = selectedId === corso.id && !addMode
              return (
                <div key={corso.id} onClick={() => { setSelectedId(corso.id); setAddMode(null) }}
                  className="card"
                  style={{ cursor:'pointer', borderColor:sel?'var(--ac)':'var(--bd)', background:sel?'var(--ac-bg)':'var(--sf)', transition:'all .15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                    <span style={{ fontSize:18, flexShrink:0 }}>{TIPI_CORSO[corso.tipo]?.icon||'📖'}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{corso.nome}</div>
                      <div style={{ fontSize:10, color:'var(--t3)' }}>{TIPI_CORSO[corso.tipo]?.label}</div>
                    </div>
                    <button className="btn-danger" style={{ fontSize:10, padding:'2px 5px' }}
                      onClick={e => { e.stopPropagation(); handleRemoveCorso(corso) }}>✕</button>
                  </div>
                  {stats.total > 0 && <ProgressBar value={stats.completati} max={stats.total} />}
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:10, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>
                    <span>{stats.completati}/{stats.total} task</span>
                    {corso.dataEsame && <span>📅 {formatShort(corso.dataEsame)}</span>}
                  </div>
                </div>
              )
            })}
            <button className="btn-ghost" onClick={() => { setAddMode('new'); setSelectedId(null) }}
              style={{ padding:'11px', borderStyle:'dashed', color:'var(--t2)', fontSize:12 }}>
              + Aggiungi corso
            </button>
          </div>

          {/* Right: add form or course detail */}
          {addMode === 'new' && !selectedId && (
            <div className="card card-1">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div className="label-xs" style={{ marginBottom:4 }}>nuovo corso</div>
                  <div style={{ fontSize:17, fontWeight:700 }}>Aggiungi corso</div>
                </div>
                <div style={{ display:'inline-flex', border:'1px solid var(--bd2)', borderRadius:7, overflow:'hidden' }}>
                  {[{id:'ai',l:'🤖 AI'},{id:'manual',l:'✏️ Manuale'}].map(t => (
                    <button key={t.id} onClick={() => setAddSubMode(t.id)}
                      style={{ padding:'5px 12px', border:'none', cursor:'pointer', fontSize:12,
                        fontFamily:"'DM Sans',sans-serif", transition:'all .15s',
                        background:addSubMode===t.id?'var(--ac)':'transparent',
                        color:addSubMode===t.id?'#fff':'var(--t2)' }}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>
              {addSubMode === 'ai' && <AIImportPanel onImport={handleAddCorso} apiKey={settings.anthropicApiKey} />}
              {addSubMode === 'manual' && <ManualForm onSave={handleAddCorso} />}
            </div>
          )}

          {selectedCorso && !addMode && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Header */}
              <div className="card card-1">
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:6 }}>
                      <span style={{ fontSize:26 }}>{TIPI_CORSO[selectedCorso.tipo]?.icon}</span>
                      <div>
                        <div style={{ fontSize:18, fontWeight:700, letterSpacing:'-.01em' }}>{selectedCorso.nome}</div>
                        <div style={{ fontSize:12, color:'var(--t2)' }}>{TIPI_CORSO[selectedCorso.tipo]?.label}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      {selectedCorso.dataEsame && <Badge color="var(--ac)">📅 {formatShort(selectedCorso.dataEsame)}</Badge>}
                      {selectedCorso.difficoltaPercepita && <Badge color="#7A5FA0">{'★'.repeat(selectedCorso.difficoltaPercepita)}{'☆'.repeat(5-selectedCorso.difficoltaPercepita)}</Badge>}
                      {selectedCorso.oreTotaliStimate && <Badge color="#3A5F8A">{selectedCorso.oreTotaliStimate}h stimate</Badge>}
                    </div>
                  </div>
                  <button className="btn-accent" onClick={handleScheduleSingle} style={{ whiteSpace:'nowrap', flexShrink:0 }}>
                    ⚡ Pianifica questo corso
                  </button>
                </div>

                {selectedStats && selectedStats.total > 0 && (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
                      {[
                        ['Completati', `${selectedStats.completati}/${selectedStats.total}`],
                        ['Progresso', `${selectedStats.pct}%`],
                        ['Ore fatte', `${selectedStats.oreCompletate}h`],
                        ['Ore totali', `${selectedStats.oreTotal}h`],
                      ].map(([l,v]) => (
                        <div key={l} style={{ textAlign:'center', padding:'9px 8px', background:'var(--sf2)', borderRadius:8 }}>
                          <div style={{ fontSize:10, color:'var(--t3)', marginBottom:4, letterSpacing:'.07em' }}>{l.toUpperCase()}</div>
                          <div style={{ fontSize:16, fontWeight:700, fontFamily:"'DM Mono',monospace", color:'var(--ac)' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <ProgressBar value={selectedStats.completati} max={selectedStats.total} />
                  </>
                )}
              </div>

              {/* Expandable modules */}
              {selectedCorso.moduli && selectedCorso.moduli.length > 0 && (
                <div className="card card-2">
                  <div className="label-xs" style={{ marginBottom:12 }}>
                    moduli — {selectedCorso.moduli.length}
                    <span style={{ fontWeight:400, color:'var(--t3)', marginLeft:8 }}>clicca per espandere i task</span>
                  </div>
                  {[...selectedCorso.moduli].sort((a,b) => a.ordine-b.ordine).map(m => (
                    <ExpandableModule key={m.id} modulo={m} tasks={selectedTasks}
                      onComplete={(taskId) => completeTask(selectedCorso.id, taskId)} />
                  ))}
                </div>
              )}

              {(!selectedCorso.moduli || selectedCorso.moduli.length === 0) && (
                <div className="card" style={{ textAlign:'center', padding:24 }}>
                  <div style={{ fontSize:13, color:'var(--t2)', marginBottom:10 }}>
                    Nessun modulo. Usa l'importazione AI per generare moduli e task dal programma.
                  </div>
                  <button className="btn-accent" onClick={() => { setSelectedId(null); setAddMode('new'); setAddSubMode('ai') }}>
                    🤖 Importa con AI
                  </button>
                </div>
              )}
            </div>
          )}

          {!selectedCorso && !addMode && (
            <div className="card" style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:36, marginBottom:12, opacity:.2 }}>◎</div>
              <div style={{ fontSize:13, color:'var(--t2)' }}>Seleziona un corso oppure aggiungine uno nuovo.</div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB ROADMAP ── */}
      {tab === 'roadmap' && (
        <div>
          {corsi.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:36, marginBottom:12, opacity:.2 }}>◇</div>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Nessun corso attivo</div>
              <button className="btn-accent" onClick={() => { setAddMode('new'); setTab('corsi') }}>+ Aggiungi corso</button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {/* Course selector */}
              <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                {corsi.map(c => (
                  <button key={c.id} onClick={() => setSelectedId(c.id)}
                    style={{ padding:'6px 13px', border:`1px solid ${selectedId===c.id?'var(--ac)':'var(--bd2)'}`,
                      background:selectedId===c.id?'var(--ac-bg)':'transparent', borderRadius:8,
                      cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif",
                      color:selectedId===c.id?'var(--ac)':'var(--t2)', transition:'all .14s' }}>
                    {TIPI_CORSO[c.tipo]?.icon} {c.nome}
                  </button>
                ))}
              </div>

              {selectedCorso && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:12 }}>
                  {/* Task timeline */}
                  <div className="card">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                      <div className="label-xs">timeline — {selectedTasks.length} task</div>
                      {selectedTasks.length === 0 && (
                        <button className="btn-accent btn-sm" onClick={handleScheduleSingle}>⚡ Genera</button>
                      )}
                    </div>
                    {selectedTasks.length === 0 ? (
                      <div style={{ textAlign:'center', padding:30, color:'var(--t3)', fontSize:13 }}>
                        Genera la pianificazione per vedere i task nella timeline.
                      </div>
                    ) : (
                      <div style={{ maxHeight:520, overflowY:'auto' }}>
                        {(() => {
                          const byDate = {}
                          selectedTasks.forEach(t => {
                            const k = t.dataPianificata || 'non pianificato'
                            if (!byDate[k]) byDate[k] = []
                            byDate[k].push(t)
                          })
                          const today2 = new Date().toISOString().slice(0,10)
                          return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, tasks]) => (
                            <div key={date} style={{ marginBottom:12 }}>
                              <div style={{ fontSize:11, fontWeight:600, color:'var(--t2)', fontFamily:"'DM Mono',monospace", marginBottom:6, padding:'4px 0', borderBottom:'1px solid var(--bd)', display:'flex', alignItems:'center', gap:8 }}>
                                {date === 'non pianificato' ? '— non pianificato' : formatShort(date)}
                                {date === today2 && <span style={{ color:'var(--ac)', fontSize:10 }}>● OGGI</span>}
                              </div>
                              {tasks.map(t => (
                                <TaskChip key={t.id} task={t} onComplete={() => completeTask(selectedCorso.id, t.id)} />
                              ))}
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Stats sidebar */}
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {/* Countdown */}
                    {selectedCorso.dataEsame && (() => {
                      const days = Math.ceil((new Date(selectedCorso.dataEsame+'T12:00') - new Date()) / (1000*60*60*24))
                      return (
                        <div className="card">
                          <div className="label-xs" style={{ marginBottom:8 }}>conto alla rovescia</div>
                          <div style={{ fontSize:34, fontFamily:"'DM Mono',monospace", fontWeight:500, letterSpacing:'-.02em',
                            color: days<7?'var(--rd)':days<30?'var(--ac)':'var(--go)' }}>
                            {days > 0 ? days : '—'}
                          </div>
                          <div style={{ fontSize:11, color:'var(--t3)', marginTop:4, fontFamily:"'DM Mono',monospace" }}>
                            {days > 0 ? "giorni all'esame" : 'data passata'}
                          </div>
                          <div style={{ marginTop:8, fontSize:11, color:'var(--t2)' }}>📅 {formatShort(selectedCorso.dataEsame)}</div>
                        </div>
                      )
                    })()}

                    {/* Task type distribution */}
                    {chartData.length > 0 && (
                      <div className="card">
                        <div className="label-xs" style={{ marginBottom:10 }}>distribuzione task</div>
                        <ResponsiveContainer width="100%" height={140}>
                          <BarChart data={chartData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                            <XAxis dataKey="name" tick={{ fontSize:9, fill:'var(--t2)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize:9, fill:'var(--t2)' }} axisLine={false} tickLine={false} width={18} />
                            <Tooltip formatter={(v) => [v, 'Task']}
                              contentStyle={{ background:'var(--sf)', border:'1px solid var(--bd2)', borderRadius:8, fontSize:12 }} />
                            <Bar dataKey="count" radius={[4,4,0,0]}>
                              {chartData.map((entry, i) => (
                                <rect key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 10px', marginTop:8 }}>
                          {chartData.map(d => (
                            <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--t2)' }}>
                              <span style={{ width:8, height:8, borderRadius:2, background:d.fill, display:'inline-block' }} />
                              {d.name} ({d.count})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Schedule feedback */}
                    {scheduleResult?.success && (
                      <div className="card" style={{
                        background: scheduleResult.fattibile?'rgba(58,112,89,.05)':'rgba(160,69,69,.05)',
                        border:`1px solid ${scheduleResult.fattibile?'rgba(58,112,89,.2)':'rgba(160,69,69,.2)'}`,
                      }}>
                        <div style={{ fontSize:12, fontWeight:600, color:scheduleResult.fattibile?'var(--go)':'var(--rd)', marginBottom:7 }}>
                          {scheduleResult.fattibile ? '✓ Piano fattibile' : '⚠ Ore insufficienti'}
                        </div>
                        <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.8 }}>
                          <div>Sessioni: {scheduleResult.slotsCount}</div>
                          <div>Disponibili: {scheduleResult.oreDisponibili}h</div>
                          <div>Necessarie: {scheduleResult.oreNecessarie}h</div>
                          {!scheduleResult.fattibile && (
                            <div style={{ color:'var(--rd)', marginTop:5 }}>
                              Aggiungi ore di studio in Configurazione o posticipa la data esame.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ── MODAL SCHEDULER ── */}
      {scheduleConfig && createPortal(
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.4)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}>
          <div className="card" style={{ width:'100%', maxWidth:380, animation:'slideUp .2s ease', boxShadow:'0 10px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Configura Pianificazione</div>
            
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, color:'var(--t2)', marginBottom:4 }}>Data di inizio studio</div>
              <input type="date" className="input-field" value={scheduleConfig.dataInizio} 
                onChange={e => setScheduleConfig(p => ({...p, dataInizio:e.target.value}))} />
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:'var(--t2)', marginBottom:4 }}>Modalità di spalmatura</div>
              <select className="input-field" value={scheduleConfig.modalita} 
                onChange={e => setScheduleConfig(p => ({...p, modalita:e.target.value}))}>
                <option value="bilanciato">Bilanciata (costante fino all'esame)</option>
                <option value="compresso">Compressa (il prima possibile)</option>
              </select>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn-ghost" onClick={() => setScheduleConfig(null)}>Annulla</button>
              <button className="btn-accent" onClick={confirmSchedule}>⚡ Genera Piano</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
