import { formatCurrency, formatCurrencyDec, todayStr, formatShort, toDateStr } from '../../utils/dateHelpers'
import { ProgressBar, Badge, Dot, EmptyState } from '../ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis } from 'recharts'

const STUDIO_COLOR = '#7A5FA0'
const GYM_COLOR    = '#3A7059'

const ChTip = ({ active, payload, label }) => !active||!payload?.length?null:(
  <div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
    <div style={{ color:'var(--t3)',marginBottom:4 }}>{label}</div>
    {payload.map(p=><div key={p.name} style={{ color:p.color,fontFamily:"'DM Mono',monospace" }}>{p.name}: {formatCurrency(p.value)}</div>)}
  </div>
)

export const WIDGET_TYPES = {
  SALDO: 'saldo',
  AGENDA: 'agenda',
  BILANCIO_CHART: 'bilancio_chart',
  RADAR: 'radar',
  RISPARMI: 'risparmi',
  STUDIO: 'studio',
  SALUTE: 'salute',
  ABITUDINI: 'abitudini',
  NOTE: 'note',
  LAVORO: 'lavoro'
}

export const renderWidget = (type, size, data) => {
  const { 
    fin, ore, stimate, rate, goals, saluteStats, corsi, getStats, 
    agendaItems, balanceData, habits, toggleHabit, getTodayScore,
    notes, chartData, settings, completeTask, getTodayTasks, getLateTasksCount
  } = data

  const isSmall = size === 'S'
  const isLarge = size === 'L'

  switch (type) {
    case WIDGET_TYPES.SALDO:
      return (
        <div className="widget-card">
          <div className="label-xs" style={{ marginBottom:isSmall?4:10 }}>Saldo Netto</div>
          <div className="stat-val" style={{ color:'var(--ac)', fontSize:isSmall?20:24 }}>{fin.entrate>0?formatCurrency(fin.netto):'—'}</div>
          {!isSmall && <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{fin.netto>=0?'↑ positivo':'↓ negativo'}</div>}
        </div>
      )

    case WIDGET_TYPES.LAVORO:
      return (
        <div className="widget-card">
          <div className="label-xs" style={{ marginBottom:isSmall?4:10 }}>Lavoro</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div className="stat-val" style={{ fontSize:isSmall?20:24 }}>{ore}h</div>
            {isLarge && <div style={{ fontSize:11, color:'var(--t3)' }}>Tariffa: {formatCurrency(rate)}</div>}
          </div>
          {!isSmall && (
            <div style={{ marginTop:8 }}>
              <ProgressBar value={ore} max={settings.oreContrattualiMensili || 160} color="var(--ac)" />
              {isLarge && (
                <div style={{ marginTop:8, padding:'8px', background:'var(--sf2)', borderRadius:7, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:10, color:'var(--t3)' }}>STIMATO</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--go)', fontFamily:"'DM Mono',monospace" }}>{formatCurrency(stimate || 0)}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )

    case WIDGET_TYPES.AGENDA:
      return (
        <div className="widget-card" style={{ height:'100%' }}>
          <div className="label-xs" style={{ marginBottom:10 }}>Agenda Oggi</div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {agendaItems.length === 0 ? <EmptyState message="Nulla per oggi" /> : agendaItems.slice(0, isSmall?2:isLarge?10:5).map(item => (
               <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:7, background:item.color+'0D', border:`1px solid ${item.color}22` }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:item.color }} />
                  <div style={{ flex:1, fontSize:12, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.titolo}</div>
                  {!isSmall && <span style={{ fontSize:10, fontFamily:"'DM Mono',monospace", color:'var(--t3)' }}>{item.ora}</span>}
               </div>
            ))}
          </div>
        </div>
      )

    case WIDGET_TYPES.BILANCIO_CHART:
      return (
        <div className="widget-card">
          <div className="label-xs" style={{ marginBottom:12 }}>Andamento Saldo</div>
          <div style={{ flex:1, minHeight:0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
                {!isSmall && <XAxis dataKey="mese" tick={{ fontSize:10,fill:'var(--t2)' }} axisLine={false} tickLine={false} />}
                <Tooltip content={<ChTip />} />
                <Line type="monotone" dataKey="entrate" stroke="var(--go)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="uscite" stroke="var(--rd)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )

    case WIDGET_TYPES.RADAR:
      return (
        <div className="widget-card" style={{ alignItems:'center' }}>
          <div className="label-xs" style={{ width:'100%', marginBottom:4 }}>Life Balance</div>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={balanceData}>
              <PolarGrid stroke="var(--bd)" />
              {!isSmall && <PolarAngleAxis dataKey="subject" tick={{ fontSize:9, fill:'var(--t2)' }} />}
              <Radar name="Bilancio" dataKey="A" stroke="var(--ac)" fill="var(--ac)" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )

    case WIDGET_TYPES.ABITUDINI:
      return (
        <div className="widget-card">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div className="label-xs">Abitudini</div>
            <span style={{ fontSize:10, color:'var(--ac)', fontWeight:700 }}>{getTodayScore()}%</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {habits.slice(0, isSmall?4:isLarge?12:8).map(h => {
              const todayDone = h.completati[toDateStr(new Date())]
              return (
                <div key={h.id} 
                  onClick={() => toggleHabit(h.id, toDateStr(new Date()))}
                  style={{ 
                    width:isSmall?32:isLarge?100:40, height:isSmall?32:40, 
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: todayDone ? h.colore + '22' : 'var(--sf2)',
                    borderRadius:8, border:`1px solid ${todayDone ? h.colore + '40' : 'var(--bd)'}`,
                    cursor:'pointer', fontSize:isSmall?16:18
                  }}
                  title={h.nome}
                >
                  {h.icona}
                  {isLarge && <span style={{ fontSize:11, marginLeft:6, fontWeight:600 }}>{h.nome}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )

    case WIDGET_TYPES.STUDIO:
      return (
        <div className="widget-card">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <div className="label-xs">Studio</div>
            {getLateTasksCount() > 0 && <span style={{ fontSize:10, color:'var(--rd)', fontWeight:700 }}>⚠ {getLateTasksCount()} RITARDO</span>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {corsi.slice(0, isSmall?1:isLarge?4:2).map(c => {
              const stats = getStats(c.id)
              return (
                <div key={c.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ fontWeight:600 }}>{c.nome}</span>
                    <span style={{ color:'var(--t3)' }}>{stats.pct}%</span>
                  </div>
                  <ProgressBar value={stats.completati} max={stats.total} />
                </div>
              )
            })}
          </div>
        </div>
      )

    case WIDGET_TYPES.SALUTE:
      return (
        <div className="widget-card">
          <div className="label-xs" style={{ marginBottom:10 }}>Salute</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div className="stat-val" style={{ fontSize:isSmall?20:24 }}>{saluteStats.streak}🔥</div>
            {!isSmall && (
               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, flex:1 }}>
                  <div style={{ padding:4, background:'var(--sf2)', borderRadius:4, fontSize:9, textAlign:'center' }}>
                    <div style={{ color:'var(--t3)' }}>MESE</div>
                    <div style={{ fontWeight:700 }}>{saluteStats.thisMonth}</div>
                  </div>
                  <div style={{ padding:4, background:'var(--sf2)', borderRadius:4, fontSize:9, textAlign:'center' }}>
                    <div style={{ color:'var(--t3)' }}>MEDIA</div>
                    <div style={{ fontWeight:700 }}>{saluteStats.durataMedia}m</div>
                  </div>
               </div>
            )}
          </div>
        </div>
      )

    case WIDGET_TYPES.NOTE:
      return (
        <div className="widget-card">
          <div className="label-xs" style={{ marginBottom:10 }}>Note Recenti</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {notes.slice(0, isSmall?1:isLarge?4:2).map(n => (
              <div key={n.id} style={{ padding:'8px 10px', background:'var(--sf2)', borderRadius:8, border:'1px solid var(--bd)' }}>
                <div style={{ fontSize:12, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.titolo}</div>
                {!isSmall && <div style={{ fontSize:10, color:'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.contenuto}</div>}
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return <div className="widget-card"><EmptyState message="Widget non disponibile" /></div>
  }
}
