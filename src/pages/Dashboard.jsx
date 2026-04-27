import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { useCalendario, TIPI_EVENTO } from '../hooks/useCalendario'
import { useFinanze } from '../hooks/useFinanze'
import { useRisparmi } from '../hooks/useRisparmi'
import { useFirme } from '../hooks/useFirme'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useStudio, TIPI_CORSO } from '../hooks/useStudio'
import { useSalute, TIPI_GIORNO } from '../hooks/useSalute'
import { useHabits } from '../hooks/useHabits'
import { useNotes } from '../hooks/useNotes'
import { PageHeader, ProgressBar, Badge, Dot, EmptyState } from '../components/ui'
import { formatCurrency, todayStr, formatShort, toDateStr } from '../utils/dateHelpers'

const STUDIO_COLOR = '#7A5FA0'
const GYM_COLOR    = '#3A7059'

const ChTip = ({ active, payload, label }) => !active||!payload?.length?null:(
  <div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
    <div style={{ color:'var(--t3)',marginBottom:4 }}>{label}</div>
    {payload.map(p=><div key={p.name} style={{ color:p.color,fontFamily:"'DM Mono',monospace" }}>{p.name}: {formatCurrency(p.value)}</div>)}
  </div>
)

export default function Dashboard() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayDow = now.getDay()

  const { eventsForDate } = useCalendario()
  const { riepilogo, andamentoMesi, totalePrevisteMese } = useFinanze()
  const { goals, totaleRisparmi } = useRisparmi()
  const { totaleOre } = useFirme()
  const { settings, tariffaCalcolata, reddtitoMedioMensile, getPalestraBlockGiorno, oreContrattualiMensili } = useImpostazioni()
  const { corsi, getStats, getTodayTasks, getLateTasksCount, completeTask } = useStudio()
  const { scheda: schedaSalute, getSessioneOggi, getStatsGenerali: getSaluteStats, startSessione } = useSalute()
  const { habits, toggleHabit, getTodayScore } = useHabits()
  const { notes } = useNotes()

  const today = todayStr()
  const todayCalEvents = eventsForDate(today)
  const fin = riepilogo(year, month)
  const previste = totalePrevisteMese(year, month)
  const chartData = andamentoMesi()
  const ore = totaleOre(year, month)
  const rate = tariffaCalcolata()
  const stimato = rate > 0 ? Math.round(ore * rate * 100) / 100 : null
  const redditoMedio = reddtitoMedioMensile()
  const studyToday = getTodayTasks()
  const lateCount = getLateTasksCount()

  // Gym today
  const giornoSaluteOggi = schedaSalute[todayDow] || {}
  const gymBlock = getPalestraBlockGiorno(todayDow)
  const sessioneGymOggi = getSessioneOggi()
  const saluteStats = getSaluteStats()
  const isGymDay = gymBlock &&
    giornoSaluteOggi.tipo !== 'riposo' &&
    giornoSaluteOggi.tipo !== 'riposo_attivo'

  // Unified agenda
  const agendaItems = [
    ...todayCalEvents.map(ev => ({
      id: `ev-${ev.id}`, type:'event', ora:ev.ora||'', titolo:ev.titolo,
      color:TIPI_EVENTO[ev.tipo]?.color||'#888', label:TIPI_EVENTO[ev.tipo]?.label,
    })),
    ...studyToday.map(t => ({
      id:`st-${t.id}`, type:'study', ora:t.oraPianificata||'',
      titolo:t.titolo, color:STUDIO_COLOR, label:t.corsoNome,
      isLate:t.isLate, taskId:t.id, corsoId:t.corsoId,
    })),
    ...(isGymDay ? [{
      id:'gym-today', type:'gym', ora:gymBlock.dalle,
      titolo: giornoSaluteOggi.nome || 'Allenamento',
      color:GYM_COLOR, label: TIPI_GIORNO[giornoSaluteOggi.tipo]?.label || 'Palestra',
      completed: !!sessioneGymOggi?.completata,
      dalleConBuffer: gymBlock.dalleConBuffer,
      alleConBuffer: gymBlock.alleConBuffer,
    }] : []),
  ].sort((a,b) => a.ora.localeCompare(b.ora))

  // Life Balance Scores
  const balanceData = [
    { subject: 'Lavoro', A: Math.min(100, ore > 0 ? (ore / (oreContrattualiMensili() || 160) * 100) : 0), fullMark: 100 },
    { subject: 'Salute', A: Math.min(100, (saluteStats.thisMonth / 12) * 100), fullMark: 100 },
    { subject: 'Studio', A: (() => {
      const allStats = corsi.map(c => getStats(c.id))
      const total = allStats.reduce((acc, s) => acc + s.total, 0)
      const done = allStats.reduce((acc, s) => acc + s.completati, 0)
      return total > 0 ? (done / total * 100) : 0
    })(), fullMark: 100 },
    { subject: 'Finanze', A: Math.min(100, redditoMedio > 0 ? (Math.max(0, fin.netto) / redditoMedio * 100) : 0), fullMark: 100 },
    { subject: 'Abitudini', A: getTodayScore(), fullMark: 100 },
  ]

  const isConfigured = settings.stipendioNetto || settings.name
  const dateLabel = now.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{ padding:28, animation:'fadeUp .24s ease both' }}>
      <PageHeader label="dashboard" title={dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)} />

      {!isConfigured && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--ac-bg)', border:'1px solid rgba(196,106,60,.2)', borderRadius:9, fontSize:13, color:'var(--t2)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--ac)' }}>Benvenuto in vitaOS.</strong> Vai in <strong>Configurazione</strong> per impostare il profilo e iniziare.
        </div>
      )}

      {(previste.uscite>0||previste.entrate>0) && (
        <div style={{ marginBottom:12, padding:'9px 14px', background:'var(--sf2)', borderRadius:9, display:'flex', gap:16, alignItems:'center', fontSize:12 }}>
          <span style={{ color:'var(--t2)' }}>Previste:</span>
          {previste.entrate>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--go)',fontWeight:600 }}>+{formatCurrency(previste.entrate)}</span>}
          {previste.uscite>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--rd)',fontWeight:600 }}>-{formatCurrency(previste.uscite)}</span>}
          <span style={{ color:'var(--t3)' }}>→ stimato <strong style={{ fontFamily:"'DM Mono',monospace" }}>{formatCurrency(fin.netto+previste.entrate-previste.uscite)}</strong></span>
        </div>
      )}

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:12 }}>
        {[
          ['SALDO NETTO', fin.entrate>0?formatCurrency(fin.netto):'—', 'var(--ac)', fin.netto>=0?'↑ positivo':'↓ negativo'],
          ['ORE LAVORATE', ore>0?`${ore}h`:'—', undefined, stimato?`≈ ${formatCurrency(stimato)}`:'imposta tariffa'],
          ['PATRIMONIO', totaleRisparmi()>0?formatCurrency(totaleRisparmi()):'—', undefined, goals.length>0?`${goals.length} obiettivi`:'nessun obiettivo'],
          ['REDDITO MEDIO', redditoMedio>0?formatCurrency(redditoMedio):'—', undefined, settings.tredicesima||settings.quattordicesima?'13ª/14ª incluse':'/mese'],
        ].map(([l,v,c,s],i) => (
          <div key={l} className={`card card-${i+1}`}>
            <div className="label-xs" style={{ marginBottom:7 }}>{l}</div>
            <div className="stat-val" style={c?{color:c}:{}}>{v}</div>
            <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:10, marginBottom:12 }}>
        {/* Unified agenda */}
        <div className="card card-5" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div className="label-xs" style={{ margin:0 }}>agenda oggi</div>
            {lateCount > 0 && (
              <span style={{ fontSize:10, color:'var(--rd)', fontWeight:600 }}>⚠ {lateCount} in ritardo</span>
            )}
          </div>
          <div style={{ overflowY:'auto', maxHeight:220, display:'flex', flexDirection:'column', gap:4 }}>
            {agendaItems.length === 0
              ? <EmptyState message="Nessun evento o task per oggi" />
              : agendaItems.map(item => (
                <div key={item.id}
                  onClick={() => item.type==='study' && completeTask(item.corsoId, item.taskId)}
                  style={{
                    display:'flex', alignItems:'center', gap:8,
                    padding:'7px 9px', borderRadius:7,
                    background:item.color+'0D',
                    border:`1px solid ${item.color}22`,
                    cursor:item.type==='study'?'pointer':'default',
                    transition:'background .13s', flexShrink:0,
                    opacity: item.type==='gym' && item.completed ? .55 : 1,
                  }}
                  onMouseEnter={e => { if(item.type==='study') e.currentTarget.style.background=item.color+'1A' }}
                  onMouseLeave={e => { if(item.type==='study') e.currentTarget.style.background=item.color+'0D' }}
                >
                  <div style={{ width:7, height:7, borderRadius:'50%', background:item.color, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.type==='gym' ? '🏋️ ' : ''}{item.titolo}
                      {item.isLate && <span style={{ marginLeft:6, fontSize:10, color:'var(--rd)', fontWeight:600 }}>ritardo</span>}
                      {item.type==='gym' && item.completed && <span style={{ marginLeft:6, fontSize:10, color:GYM_COLOR }}>✓</span>}
                    </div>
                    {item.type==='gym'
                      ? <div style={{ fontSize:10, color:'var(--t3)' }}>{item.dalleConBuffer}–{item.alleConBuffer} (viaggio incluso)</div>
                      : item.label && <div style={{ fontSize:10, color:'var(--t3)' }}>{item.label}</div>
                    }
                  </div>
                  {item.ora && (
                    <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:'var(--t2)', flexShrink:0 }}>{item.ora}</span>
                  )}
                  {item.type==='study' && (
                    <span style={{ fontSize:9, color:item.color, fontWeight:600, border:`1px solid ${item.color}33`, borderRadius:10, padding:'1px 6px', flexShrink:0 }}>studio</span>
                  )}
                  {item.type==='gym' && (
                    <span style={{ fontSize:9, color:GYM_COLOR, fontWeight:600, border:`1px solid ${GYM_COLOR}33`, borderRadius:10, padding:'1px 6px', flexShrink:0 }}>gym</span>
                  )}
                </div>
              ))
            }
          </div>
        </div>

        {/* Balance chart */}
        <div className="card card-6">
          <div className="label-xs" style={{ marginBottom:12 }}>andamento saldo — 6 mesi</div>
          {chartData.every(m=>m.entrate===0)
            ? <EmptyState message="Nessuna transazione registrata" />
            : <ResponsiveContainer width="100%" height={170}>
              <LineChart data={chartData} margin={{ top:4,right:4,bottom:0,left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                <XAxis dataKey="mese" tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip content={<ChTip />} />
                <Line type="monotone" dataKey="entrate" stroke="var(--go)" strokeWidth={1.5} dot={{ r:2 }} name="Entrate" />
                <Line type="monotone" dataKey="uscite" stroke="var(--rd)" strokeWidth={1.5} dot={{ r:2 }} name="Uscite" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          }
        </div>
        {/* Life Balance Radar */}
        <div className="card card-5" style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div className="label-xs" style={{ width:'100%', marginBottom:4 }}>life balance radar</div>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={balanceData}>
              <PolarGrid stroke="var(--bd)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:9, fill:'var(--t2)', fontWeight:500 }} />
              <Radar name="Bilancio" dataKey="A" stroke="var(--ac)" fill="var(--ac)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:10 }}>
        {/* Goals */}
        <div className="card">
          <div className="label-xs" style={{ marginBottom:12 }}>obiettivi risparmio</div>
          {goals.length === 0
            ? <EmptyState message="Nessun obiettivo — vai in Risparmi" />
            : goals.map(g => {
              const pct = Math.min(100, Math.round(g.corrente/g.target*100))
              return (
                <div key={g.id} style={{ marginBottom:11 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{g.nome}</span>
                    <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--ac)',fontWeight:600 }}>{pct}%</span>
                  </div>
                  <ProgressBar value={g.corrente} max={g.target} />
                </div>
              )
            })
          }
        </div>

        {/* Study summary */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">stato studio</div>
            {lateCount > 0 && <span style={{ fontSize:11,color:'var(--rd)',fontWeight:600 }}>⚠ {lateCount} in ritardo</span>}
          </div>
          {corsi.length === 0
            ? <EmptyState message="Nessun corso — vai in Studio" />
            : corsi.map(corso => {
              const stats = getStats(corso.id)
              const days = corso.dataEsame
                ? Math.ceil((new Date(corso.dataEsame+'T12:00')-now)/(1000*60*60*24)) : null
              return (
                <div key={corso.id} style={{ marginBottom:12, paddingBottom:12, borderBottom:'1px solid var(--bd)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                    <span style={{ fontSize:14 }}>{TIPI_CORSO[corso.tipo]?.icon}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{corso.nome}</span>
                    {days !== null && (
                      <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:days<7?'var(--rd)':days<30?'var(--ac)':'var(--t3)',fontWeight:600 }}>
                        {days>0?`${days}g`:'passato'}
                      </span>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <>
                      <ProgressBar value={stats.completati} max={stats.total} />
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:11, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>
                        <span>{stats.completati}/{stats.total} task · {stats.pct}%</span>
                        {stats.taskInRitardo>0&&<span style={{ color:'var(--rd)' }}>{stats.taskInRitardo} ritardo</span>}
                      </div>
                    </>
                  )}
                </div>
              )
            })
          }
        </div>

        {/* Fitness summary */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">stato fitness</div>
            {saluteStats.streak > 0 && (
              <span style={{ fontSize:11, color:'var(--ac)', fontWeight:600 }}>{saluteStats.streak}🔥</span>
            )}
          </div>
          {/* Today gym */}
          {isGymDay ? (
            <div style={{
              padding:'10px 12px', borderRadius:9, marginBottom:10,
              background: sessioneGymOggi?.completata ? 'rgba(58,112,89,.08)' : 'rgba(58,112,89,.04)',
              border:`1px solid ${sessioneGymOggi?.completata ? 'rgba(58,112,89,.25)' : 'rgba(58,112,89,.15)'}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:18 }}>{TIPI_GIORNO[giornoSaluteOggi.tipo]?.icon || '💪'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:GYM_COLOR }}>
                    {sessioneGymOggi?.completata ? '✓ Completato oggi' : 'Allenamento oggi'}
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>
                    {giornoSaluteOggi.nome || 'Allenamento'} · {gymBlock.dalle}–{gymBlock.alle}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding:'8px 10px', borderRadius:8, background:'var(--sf2)', marginBottom:10, fontSize:12, color:'var(--t2)' }}>
              {giornoSaluteOggi.tipo === 'riposo_attivo' ? '🚶 Riposo attivo' :
               giornoSaluteOggi.tipo === 'riposo' ? '😴 Giorno di riposo' : '— Nessun allenamento configurato'}
            </div>
          )}
          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[
              ['Sessioni mese', saluteStats.thisMonth || '—'],
              ['Sessioni totali', saluteStats.total || '—'],
              ['Durata media', saluteStats.durataMedia > 0 ? `${saluteStats.durataMedia}min` : '—'],
              ['Streak', saluteStats.streak > 0 ? `${saluteStats.streak}gg` : '—'],
            ].map(([l,v]) => (
              <div key={l} style={{ padding:'7px 9px', background:'var(--sf2)', borderRadius:7, textAlign:'center' }}>
                <div style={{ fontSize:9, color:'var(--t3)', marginBottom:3, letterSpacing:'.06em' }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:14, fontFamily:"'DM Mono',monospace", fontWeight:600, color:GYM_COLOR }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Habits Widget */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">abitudini oggi</div>
            <span style={{ fontSize:11, color:'var(--ac)', fontWeight:700 }}>{getTodayScore()}%</span>
          </div>
          {habits.length === 0 ? (
            <EmptyState message="Nessuna abitudine impostata" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {habits.map(h => {
                const todayDone = h.completati[toDateStr(now)]
                return (
                  <div key={h.id} 
                    onClick={() => toggleHabit(h.id, toDateStr(now))}
                    style={{ 
                      display:'flex', alignItems:'center', gap:10, padding:'8px 10px', 
                      background: todayDone ? h.colore + '15' : 'var(--sf2)',
                      borderRadius:8, border:`1px solid ${todayDone ? h.colore + '40' : 'var(--bd)'}`,
                      cursor:'pointer', transition:'all .14s'
                    }}
                  >
                    <span style={{ fontSize:18 }}>{h.icona}</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:500, color: todayDone ? h.colore : 'var(--t1)' }}>{h.nome}</span>
                    <div style={{ 
                      width:18, height:18, borderRadius:4, border:`1.5px solid ${todayDone ? h.colore : 'var(--bd2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: todayDone ? h.colore : 'transparent', color:'#fff', fontSize:10
                    }}>
                      {todayDone && '✓'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Notes Widget */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">note recenti</div>
            <span style={{ fontSize:10, color:'var(--t3)' }}>{notes.length} totali</span>
          </div>
          {notes.length === 0 ? (
            <EmptyState message="Nessuna nota — vai in Note" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {notes.filter(n => n.fissata).slice(0, 2).concat(notes.filter(n => !n.fissata).slice(0, 3)).slice(0, 4).map(n => (
                <div key={n.id} style={{ 
                  padding:'8px 10px', background:'var(--sf2)', borderRadius:7,
                  borderLeft:`3px solid ${n.fissata ? 'var(--ac)' : 'transparent'}`,
                  transition:'background .12s'
                }}>
                  <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {n.fissata && '📌 '}{n.titolo}
                  </div>
                  <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginTop:2 }}>
                    {n.contenuto || 'Senza contenuto'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Insights / Balance Widget */}
        <div className="card" style={{ background:'var(--ac-bg)', border:'1px solid rgba(196,106,60,.1)' }}>
          <div className="label-xs" style={{ marginBottom:12, color:'var(--ac)' }}>insight finanziario</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ fontSize:13, lineHeight:1.5 }}>
              Hai pianificato <strong style={{ color:'var(--ac)' }}>{formatCurrency(previste.uscite)}</strong> di spese fisse per questo mese.
            </div>
            <div style={{ fontSize:11, color:'var(--t2)', background:'var(--sf)', padding:'8px 10px', borderRadius:7, border:'1px solid var(--bd)' }}>
              Proiezione saldo: <strong style={{ fontFamily:"'DM Mono',monospace" }}>{formatCurrency(fin.netto + previste.entrate - previste.uscite)}</strong>
            </div>
            {totaleRisparmi() > 0 && (
              <div style={{ fontSize:11, color:'var(--t3)' }}>
                Il tuo patrimonio è cresciuto del <strong style={{ color:'var(--go)' }}>{Math.round((fin.netto / (totaleRisparmi() || 1)) * 100)}%</strong> questo mese.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
