import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useCalendario, TIPI_EVENTO } from '../hooks/useCalendario'
import { useFinanze } from '../hooks/useFinanze'
import { useRisparmi } from '../hooks/useRisparmi'
import { useFirme } from '../hooks/useFirme'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useStudio, TIPI_TASK, TIPI_CORSO } from '../hooks/useStudio'
import { PageHeader, Grid, ProgressBar, Badge, Dot, EmptyState } from '../components/ui'
import { formatCurrency, todayStr, formatShort } from '../utils/dateHelpers'

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

  const { eventsForDate } = useCalendario()
  const { riepilogo, andamentoMesi, totalePrevisteMese } = useFinanze()
  const { goals, totaleRisparmi } = useRisparmi()
  const { totaleOre } = useFirme()
  const { settings, tariffaCalcolata, reddtitoMedioMensile } = useImpostazioni()
  const { corsi, getStats, getTodayTasks, getLateTasksCount, completeTask } = useStudio()

  const today = todayStr()
  const todayEvents = eventsForDate(today)
  const fin = riepilogo(year, month)
  const previste = totalePrevisteMese(year, month)
  const chartData = andamentoMesi()
  const ore = totaleOre(year, month)
  const rate = tariffaCalcolata()
  const stimato = rate > 0 ? Math.round(ore * rate) : null
  const redditoMedio = reddtitoMedioMensile()

  const studyToday = getTodayTasks()
  const lateCount = getLateTasksCount()

  // Unified agenda: calendar events + study tasks, sorted by time
  const agendaItems = [
    ...todayEvents.map(ev => ({
      type: 'event',
      ora: ev.ora || '00:00',
      titolo: ev.titolo,
      color: TIPI_EVENTO[ev.tipo]?.color || '#888',
      label: TIPI_EVENTO[ev.tipo]?.label,
      icon: null,
    })),
    ...studyToday.slice(0, 3).map(t => ({
      type: 'study',
      ora: t.oraPianificata || '08:00',
      titolo: `${t.titolo}`,
      color: TIPI_TASK[t.tipo]?.color || '#7A5FA0',
      label: t.corsoNome,
      icon: '◎',
      isLate: t.isLate,
      id: t.id,
      corsoId: t.corsoId,
    })),
  ].sort((a, b) => (a.ora || '').localeCompare(b.ora || ''))

  const dateLabel = now.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })
  const isConfigured = settings.stipendioNetto || settings.name

  return (
    <div style={{ padding:28, animation:'fadeUp .24s ease both' }}>
      <PageHeader label="dashboard" title={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} />

      {!isConfigured && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'var(--ac-bg)', border:'1px solid rgba(196,106,60,.2)', borderRadius:9, fontSize:13, color:'var(--t2)', lineHeight:1.7 }}>
          <strong style={{ color:'var(--ac)' }}>Benvenuto in vitaOS.</strong> Vai in <strong>Configurazione</strong> per impostare il tuo profilo e iniziare.
        </div>
      )}

      {(previste.uscite > 0 || previste.entrate > 0) && (
        <div style={{ marginBottom:12, padding:'9px 14px', background:'var(--sf2)', borderRadius:9, display:'flex', gap:16, alignItems:'center', fontSize:12 }}>
          <span style={{ color:'var(--t2)' }}>Transazioni previste:</span>
          {previste.entrate>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--go)',fontWeight:600 }}>+{formatCurrency(previste.entrate)}</span>}
          {previste.uscite>0&&<span style={{ fontFamily:"'DM Mono',monospace",color:'var(--rd)',fontWeight:600 }}>-{formatCurrency(previste.uscite)}</span>}
          <span style={{ color:'var(--t3)' }}>→ stimato <strong style={{ fontFamily:"'DM Mono',monospace" }}>{formatCurrency(fin.netto+previste.entrate-previste.uscite)}</strong></span>
        </div>
      )}

      <Grid cols={4} gap={10} style={{ marginBottom:12 }}>
        <div className="card card-1"><div className="label-xs" style={{ marginBottom:7 }}>SALDO NETTO</div><div className="stat-val" style={{ color:'var(--ac)' }}>{fin.entrate>0?formatCurrency(fin.netto):'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{fin.netto>=0?'↑ positivo':'↓ negativo'}</div></div>
        <div className="card card-2"><div className="label-xs" style={{ marginBottom:7 }}>ORE LAVORATE</div><div className="stat-val">{ore>0?`${ore}h`:'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{stimato?`≈ ${formatCurrency(stimato)}`:'imposta tariffa'}</div></div>
        <div className="card card-3"><div className="label-xs" style={{ marginBottom:7 }}>PATRIMONIO</div><div className="stat-val">{totaleRisparmi()>0?formatCurrency(totaleRisparmi()):'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{goals.length>0?`${goals.length} obiettivi`:'nessun obiettivo'}</div></div>
        <div className="card card-4"><div className="label-xs" style={{ marginBottom:7 }}>REDDITO MEDIO</div><div className="stat-val">{redditoMedio>0?formatCurrency(redditoMedio):'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{settings.tredicesima||settings.quattordicesima?'13ª/14ª incluse':'/mese'}</div></div>
      </Grid>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:10, marginBottom:12 }}>
        {/* Unified agenda */}
        <div className="card card-5">
          <div className="label-xs" style={{ marginBottom:10 }}>agenda unificata — oggi</div>
          {agendaItems.length === 0
            ? <EmptyState message="Nessun evento o task per oggi" />
            : agendaItems.map((item, i) => (
              <div key={i} className="row-item" style={{ gap:8, cursor:item.type==='study'?'pointer':'default' }}
                onClick={() => item.type==='study' && completeTask(item.corsoId, item.id)}>
                {item.type==='study'
                  ? <span style={{ fontSize:12, color:item.color, flexShrink:0 }}>◎</span>
                  : <Dot color={item.color} />
                }
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, textDecoration:item.done?'line-through':'none', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {item.titolo}
                    {item.isLate && <span style={{ marginLeft:6, fontSize:10, color:'var(--rd)', fontWeight:600 }}>in ritardo</span>}
                  </div>
                  {item.label && <div style={{ fontSize:10, color:'var(--t3)' }}>{item.label}</div>}
                </div>
                {item.ora && <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:'var(--t2)', flexShrink:0 }}>{item.ora}</span>}
                {item.type==='study' && <Badge color={item.color}>Studio</Badge>}
              </div>
            ))
          }
        </div>

        {/* Chart */}
        <div className="card card-6">
          <div className="label-xs" style={{ marginBottom:12 }}>andamento saldo — 6 mesi</div>
          {chartData.every(m => m.entrate === 0)
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

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {/* Goals */}
        <div className="card">
          <div className="label-xs" style={{ marginBottom:12 }}>obiettivi risparmio</div>
          {goals.length === 0
            ? <EmptyState message="Nessun obiettivo — vai in Risparmi per crearne uno" />
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
            ? <EmptyState message="Nessun corso attivo — vai in Studio per aggiungerne uno" />
            : corsi.map(corso => {
              const stats = getStats(corso.id)
              const now2 = new Date()
              const days = corso.dataEsame ? Math.ceil((new Date(corso.dataEsame+'T12:00')-now2)/(1000*60*60*24)) : null
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
                        {stats.taskInRitardo > 0 && <span style={{ color:'var(--rd)' }}>{stats.taskInRitardo} in ritardo</span>}
                      </div>
                    </>
                  )}
                  {stats.total === 0 && <div style={{ fontSize:11,color:'var(--t3)' }}>Nessun task — genera la pianificazione</div>}
                </div>
              )
            })
          }
          {studyToday.length > 0 && (
            <div style={{ fontSize:12,color:'var(--t2)',marginTop:4 }}>
              <strong style={{ color:'var(--ac)' }}>{studyToday.filter(t=>!t.isLate).length}</strong> task di studio programmati oggi
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
