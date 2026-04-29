// src/pages/Dashboard.jsx
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
import { PageHeader, ProgressBar, Badge, Dot, EmptyState, OnboardingModal } from '../components/ui'
import { formatCurrency, todayStr, formatShort, toDateStr } from '../utils/dateHelpers'
import { useIsMobile } from '../hooks/useMediaQuery'

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
  const isMobile = useIsMobile()

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

  const giornoSaluteOggi = schedaSalute[todayDow] || {}
  const gymBlock = getPalestraBlockGiorno(todayDow)
  const sessioneGymOggi = getSessioneOggi()
  const saluteStats = getSaluteStats()
  const isGymDay = gymBlock &&
    giornoSaluteOggi.tipo !== 'riposo' &&
    giornoSaluteOggi.tipo !== 'riposo_attivo'

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
    <div className="page-pad" style={{ animation:'fadeUp .24s ease both' }}>
      <OnboardingModal 
        sectionId="dashboard"
        title="Dashboard Overview"
        icon="🚀"
        description="Benvenuto nel centro di controllo di vitaOS. Qui puoi monitorare il tuo saldo, le ore lavorate, i tuoi obiettivi di risparmio e l'agenda del giorno."
      />
      {/* Spacer per hamburger su mobile */}
      {isMobile && <div style={{ height: 28 }} />}
      <PageHeader label="dashboard" title={dateLabel.charAt(0).toUpperCase()+dateLabel.slice(1)} />

      {!isConfigured && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--ac-bg)', border:'1px solid rgba(196,106,60,.2)', borderRadius:9, fontSize:13, color:'var(--t2)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--ac)' }}>Benvenuto in vitaOS.</strong> Vai in <strong>Configurazione</strong> per impostare il profilo.
        </div>
      )}

      {(previste.uscite>0||previste.entrate>0) && (
        <div style={{ marginBottom:12, padding:'9px 14px', background:'var(--sf2)', borderRadius:9, display:'flex', gap:16, alignItems:'center', fontSize:12, flexWrap:'wrap' }}>
          <span style={{ color:'var(--t2)' }}>Previste:</span>
          {previste.entrate>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--go)',fontWeight:600 }}>+{formatCurrency(previste.entrate)}</span>}
          {previste.uscite>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--rd)',fontWeight:600 }}>-{formatCurrency(previste.uscite)}</span>}
        </div>
      )}

      {/* KPI 4 colonne → 2 su mobile */}
      <div className="grid-kpi">
        {[
          ['SALDO NETTO', fin.entrate>0?formatCurrency(fin.netto):'—', 'var(--ac)', fin.netto>=0?'↑ positivo':'↓ negativo'],
          ['ORE LAVORATE', ore>0?`${ore}h`:'—', undefined, stimato?`≈ ${formatCurrency(stimato)}`:'imposta tariffa'],
          ['PATRIMONIO', totaleRisparmi()>0?formatCurrency(totaleRisparmi()):'—', undefined, goals.length>0?`${goals.length} obiettivi`:'nessun obiettivo'],
          ['REDDITO MEDIO', redditoMedio>0?formatCurrency(redditoMedio):'—', undefined, '/mese'],
        ].map(([l,v,c,s],i) => (
          <div key={l} className={`card card-${i+1}`}>
            <div className="label-xs" style={{ marginBottom:7 }}>{l}</div>
            <div className="stat-val" style={c?{color:c}:{}}>{v}</div>
            <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Agenda + Grafico */}
      <div className="grid-2col" style={{ marginBottom:12 }}>
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
                >
                  <div style={{ width:7, height:7, borderRadius:'50%', background:item.color, flexShrink:0 }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {item.type==='gym' ? '🏋️ ' : ''}{item.titolo}
                      {item.isLate && <span style={{ marginLeft:6, fontSize:10, color:'var(--rd)', fontWeight:600 }}>ritardo</span>}
                    </div>
                    {item.label && <div style={{ fontSize:10, color:'var(--t3)' }}>{item.label}</div>}
                  </div>
                  {item.ora && (
                    <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:'var(--t2)', flexShrink:0 }}>{item.ora}</span>
                  )}
                </div>
              ))
            }
          </div>
        </div>

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
      </div>

      {/* Radar + Note */}
      <div className="grid-2col-equal" style={{ marginBottom:12 }}>
        <div className="card" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <div className="label-xs" style={{ width:'100%', marginBottom:4 }}>life balance radar</div>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={balanceData}>
              <PolarGrid stroke="var(--bd)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:9, fill:'var(--t2)', fontWeight:500 }} />
              <Radar name="Bilancio" dataKey="A" stroke="var(--ac)" fill="var(--ac)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">note recenti</div>
            <span style={{ fontSize:10, color:'var(--t3)' }}>{notes.length} totali</span>
          </div>
          {notes.length === 0 ? (
            <EmptyState message="Nessuna nota — vai in Note" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {notes.filter(n => n.fissata).slice(0, 2).concat(notes.filter(n => !n.fissata).slice(0, 3)).slice(0, 3).map(n => (
                <div key={n.id} style={{ 
                  padding:'8px 10px', background:'var(--sf2)', borderRadius:7,
                  borderLeft:`3px solid ${n.fissata ? 'var(--ac)' : 'transparent'}`,
                }}>
                  <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {n.fissata && '📌 '}{n.titolo}
                  </div>
                  <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {n.contenuto || 'Senza contenuto'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom widgets: 4 colonne → 2 su mobile */}
      <div className="grid-kpi">
        {/* Goals */}
        <div className="card">
          <div className="label-xs" style={{ marginBottom:12 }}>obiettivi risparmio</div>
          {goals.length === 0
            ? <EmptyState message="Nessun obiettivo" />
            : goals.slice(0, isMobile ? 2 : goals.length).map(g => {
              const pct = Math.min(100, Math.round(g.corrente/g.target*100))
              return (
                <div key={g.id} style={{ marginBottom:11 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'70%' }}>{g.nome}</span>
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
            <div className="label-xs">studio</div>
            {lateCount > 0 && <span style={{ fontSize:10,color:'var(--rd)',fontWeight:600 }}>⚠ {lateCount}</span>}
          </div>
          {corsi.length === 0
            ? <EmptyState message="Nessun corso" />
            : corsi.slice(0, isMobile ? 1 : corsi.length).map(corso => {
              const stats = getStats(corso.id)
              const days = corso.dataEsame
                ? Math.ceil((new Date(corso.dataEsame+'T12:00')-now)/(1000*60*60*24)) : null
              return (
                <div key={corso.id} style={{ marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--bd)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
                    <span style={{ fontSize:14 }}>{TIPI_CORSO[corso.tipo]?.icon}</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{corso.nome}</span>
                    {days !== null && (
                      <span style={{ fontSize:10,color:days<7?'var(--rd)':days<30?'var(--ac)':'var(--t3)',fontWeight:600 }}>
                        {days>0?`${days}g`:'past'}
                      </span>
                    )}
                  </div>
                  {stats.total > 0 && (
                    <>
                      <ProgressBar value={stats.completati} max={stats.total} />
                      <div style={{ fontSize:10, color:'var(--t3)', marginTop:3, fontFamily:"'DM Mono',monospace" }}>
                        {stats.pct}%
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
            <div className="label-xs">fitness</div>
            {saluteStats.streak > 0 && (
              <span style={{ fontSize:11, color:'var(--ac)', fontWeight:600 }}>{saluteStats.streak}🔥</span>
            )}
          </div>
          {isGymDay ? (
            <div style={{
              padding:'8px 10px', borderRadius:8, marginBottom:8,
              background: sessioneGymOggi?.completata ? 'rgba(58,112,89,.08)' : 'rgba(58,112,89,.04)',
              border:`1px solid rgba(58,112,89,.15)`,
            }}>
              <div style={{ fontSize:12, fontWeight:600, color:GYM_COLOR }}>
                {sessioneGymOggi?.completata ? '✓ Completato' : 'Oggi: ' + (giornoSaluteOggi.nome || 'Allenamento')}
              </div>
              <div style={{ fontSize:10, color:'var(--t3)', fontFamily:"'DM Mono',monospace" }}>
                {gymBlock.dalle}–{gymBlock.alle}
              </div>
            </div>
          ) : (
            <div style={{ padding:'7px 8px', borderRadius:7, background:'var(--sf2)', marginBottom:8, fontSize:11, color:'var(--t2)' }}>
              {giornoSaluteOggi.tipo === 'riposo_attivo' ? '🚶 Riposo attivo' : '😴 Riposo'}
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              ['Mese', saluteStats.thisMonth || '—'],
              ['Streak', saluteStats.streak > 0 ? `${saluteStats.streak}gg` : '—'],
            ].map(([l,v]) => (
              <div key={l} style={{ padding:'6px 8px', background:'var(--sf2)', borderRadius:7, textAlign:'center' }}>
                <div style={{ fontSize:9, color:'var(--t3)', marginBottom:2 }}>{l.toUpperCase()}</div>
                <div style={{ fontSize:14, fontFamily:"'DM Mono',monospace", fontWeight:600, color:GYM_COLOR }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Habits Widget */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="label-xs">abitudini</div>
            <span style={{ fontSize:11, color:'var(--ac)', fontWeight:700 }}>{getTodayScore()}%</span>
          </div>
          {habits.length === 0 ? (
            <EmptyState message="Nessuna abitudine" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {habits.slice(0, isMobile ? 3 : habits.length).map(h => {
                const todayDone = h.completati[toDateStr(now)]
                return (
                  <div key={h.id} 
                    onClick={() => toggleHabit(h.id, toDateStr(now))}
                    style={{ 
                      display:'flex', alignItems:'center', gap:8, padding:'7px 9px', 
                      background: todayDone ? h.colore + '15' : 'var(--sf2)',
                      borderRadius:8, border:`1px solid ${todayDone ? h.colore + '40' : 'var(--bd)'}`,
                      cursor:'pointer', transition:'all .14s'
                    }}
                  >
                    <span style={{ fontSize:16 }}>{h.icona}</span>
                    <span style={{ flex:1, fontSize:12, fontWeight:500, color: todayDone ? h.colore : 'var(--t1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{h.nome}</span>
                    <div style={{ 
                      width:16, height:16, borderRadius:4, border:`1.5px solid ${todayDone ? h.colore : 'var(--bd2)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: todayDone ? h.colore : 'transparent', color:'#fff', fontSize:9, flexShrink:0
                    }}>
                      {todayDone && '✓'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}