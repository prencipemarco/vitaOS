import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useFirme } from '../hooks/useFirme'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { PageHeader, StatCard, Grid, SectionHeader, InputRow, MonthNav, EmptyState, showError, showSuccess, showConfirm } from '../components/ui'
import { formatCurrency, formatDate, MESI } from '../utils/dateHelpers'

const Tip = ({ active, payload, label }) => !active||!payload?.length?null:(
  <div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
    <div style={{ color:'var(--t3)',marginBottom:4 }}>{label}</div>
    <div style={{ color:'var(--ac)',fontFamily:"'DM Mono',monospace" }}>{payload[0]?.value}h</div>
  </div>
)

export default function FoglioDiFirme() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { firme, addFirma, removeFirma, calcOre, totaleOre, hasDuplicate } = useFirme()
  const { settings, tariffaCalcolata, oreContrattualiMensili, getOrarioGiorno } = useImpostazioni()

  // Dynamic defaults from config based on selected date
  const todayStr = now.toISOString().slice(0, 10)
  const [selDate, setSelDate] = useState(todayStr)

  // Get schedule for selected date
  const selDow = new Date(selDate + 'T12:00').getDay()
  const selOrario = getOrarioGiorno(selDow)

  const [form, setForm] = useState({
    data: todayStr,
    entrata: selOrario?.dalle || '09:00',
    uscita: selOrario?.alle || '18:00',
    pausa: '0',
  })

  // Update form defaults when date changes
  useEffect(() => {
    const dow = new Date(form.data + 'T12:00').getDay()
    const orario = getOrarioGiorno(dow)
    if (orario?.abilitato) {
      setForm(f => ({
        ...f,
        entrata: orario.dalle || f.entrata,
        uscita: orario.alle || f.uscita,
        pausa: String(orario.pausa || 0),
      }))
    }
  }, [form.data])

  const monthFirme = firme.filter(f => {
    const d = new Date(f.data + 'T12:00')
    return d.getFullYear() === year && d.getMonth() === month
  }).sort((a, b) => b.data.localeCompare(a.data))

  const ore = totaleOre(year, month)
  const target = oreContrattualiMensili() || 0
  const rate = tariffaCalcolata()
  const stima = rate > 0 ? Math.round(ore * rate) : 0
  const pct = target > 0 ? Math.min(100, Math.round(ore / target * 100)) : 0

  const chartData = (() => {
    const weeks = {}
    monthFirme.forEach(f => {
      const d = new Date(f.data + 'T12:00')
      const w = `Sett.${Math.ceil(d.getDate() / 7)}`
      weeks[w] = (weeks[w] || 0) + calcOre(f)
    })
    return Object.entries(weeks).map(([name, ore]) => ({ name, ore: Math.round(ore * 10) / 10 }))
  })()

  const handleAdd = () => {
    if (hasDuplicate(form.data)) {
      showError(`Giornata già registrata per il ${new Date(form.data + 'T12:00').toLocaleDateString('it-IT', { day:'numeric', month:'long' })}`)
      return
    }
    const result = addFirma(form)
    if (result?.error) { showError(result.error); return }
    showSuccess('Giornata registrata.')
  }

  const handleRemove = (f) => {
    showConfirm(`Rimuovere la giornata del ${formatDate(f.data)}?`, () => removeFirma(f.id))
  }

  const previewOre = (() => {
    const [hi, mi] = form.entrata.split(':').map(Number)
    const [ho, mo] = form.uscita.split(':').map(Number)
    const net = (ho * 60 + mo) - (hi * 60 + mi) - Number(form.pausa)
    return Math.max(0, net / 60)
  })()

  return (
    <div style={{ padding:28, animation:'fadeUp .24s ease both' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:20 }}>
        <PageHeader label="foglio firme" title="Time Tracking" />
        <MonthNav year={year} month={month} onChange={(y,m)=>{ setYear(y); setMonth(m) }} />
      </div>

      <Grid cols={4} gap={10} style={{ marginBottom:12 }}>
        <div className="card card-1"><div className="label-xs" style={{ marginBottom:7 }}>ORE LAVORATE</div><div className="stat-val" style={{ color:'var(--ac)' }}>{ore>0?`${ore}h`:'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{target>0?`target ${target}h`:'configura orario'}</div></div>
        <div className="card card-2"><div className="label-xs" style={{ marginBottom:7 }}>AVANZAMENTO</div><div className="stat-val">{target>0?`${pct}%`:'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{target>0?`${Math.max(0,target-ore).toFixed(1)}h mancanti`:'—'}</div></div>
        <div className="card card-3"><div className="label-xs" style={{ marginBottom:7 }}>GIORNI REGISTRATI</div><div className="stat-val">{monthFirme.length||'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>questo mese</div></div>
        <div className="card card-4"><div className="label-xs" style={{ marginBottom:7 }}>STIMA STIPENDIO</div><div className="stat-val">{stima>0?formatCurrency(stima):'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{rate>0?`a ${formatCurrency(rate)}/h`:'imposta tariffa'}</div></div>
      </Grid>

      {target > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
            <span className="label-xs">progressione mensile</span>
            <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--ac)' }}>{ore}h / {target}h</span>
          </div>
          <div className="progress-track" style={{ height:8 }}>
            <div className="progress-fill" style={{ width:`${pct}%`, height:'100%' }} />
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:12 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {chartData.length > 0 && (
            <div className="card">
              <div className="label-xs" style={{ marginBottom:12 }}>ore per settimana</div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} margin={{ top:4,right:4,bottom:0,left:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="ore" fill="var(--ac)" radius={[4,4,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="card">
            <div className="label-xs" style={{ marginBottom:12 }}>registro presenze</div>
            {monthFirme.length === 0
              ? <EmptyState message="Nessuna presenza registrata" />
              : monthFirme.map(f => (
                <div key={f.id} className="row-item">
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{formatDate(f.data)}</div>
                    <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>
                      {f.entrata} → {f.uscita}
                      {f.pausa > 0 ? ` · pausa ${f.pausa}min` : ' · nessuna pausa'}
                    </div>
                  </div>
                  <span style={{ fontSize:14,fontFamily:"'DM Mono',monospace",color:'var(--ac)',fontWeight:600,marginRight:8 }}>
                    {calcOre(f).toFixed(1)}h
                  </span>
                  <button className="btn-danger" onClick={() => handleRemove(f)}>✕</button>
                </div>
              ))
            }
          </div>
        </div>

        {/* Form */}
        <div className="card" style={{ height:'fit-content' }}>
          <div className="label-xs" style={{ marginBottom:12 }}>inserisci giornata</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            <div>
              <div style={{ fontSize:11,color:'var(--t3)',marginBottom:4 }}>Data</div>
              <input className="input-field" type="date" value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
              {hasDuplicate(form.data) && (
                <div style={{ fontSize:11,color:'var(--rd)',marginTop:4,padding:'4px 8px',background:'rgba(160,69,69,.07)',borderRadius:6 }}>
                  ⚠ Giornata già registrata
                </div>
              )}
            </div>
            <InputRow>
              <div>
                <div style={{ fontSize:11,color:'var(--t3)',marginBottom:4 }}>Entrata</div>
                <input className="input-field" type="time" value={form.entrata}
                  onChange={e => setForm(f => ({ ...f, entrata: e.target.value }))} />
              </div>
              <div>
                <div style={{ fontSize:11,color:'var(--t3)',marginBottom:4 }}>Uscita</div>
                <input className="input-field" type="time" value={form.uscita}
                  onChange={e => setForm(f => ({ ...f, uscita: e.target.value }))} />
              </div>
            </InputRow>
            <div>
              <div style={{ fontSize:11,color:'var(--t3)',marginBottom:4 }}>Pausa pranzo</div>
              <select className="input-field" value={form.pausa}
                onChange={e => setForm(f => ({ ...f, pausa: e.target.value }))}>
                <option value="0">Nessuna pausa</option>
                <option value="30">30 minuti</option>
                <option value="60">60 minuti</option>
                <option value="90">90 minuti</option>
              </select>
            </div>

            {previewOre > 0 && (
              <div style={{ padding:'10px 12px',background:'var(--ac-bg)',borderRadius:8,transition:'all .2s' }}>
                <div style={{ fontSize:11,color:'var(--t2)' }}>Ore nette calcolate</div>
                <div style={{ fontSize:22,fontFamily:"'DM Mono',monospace",color:'var(--ac)',fontWeight:600,marginTop:2 }}>
                  {previewOre.toFixed(2)}h
                </div>
                {rate > 0 && (
                  <div style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>
                    ≈ {formatCurrency(previewOre * rate)}
                  </div>
                )}
              </div>
            )}

            <button className="btn-accent" onClick={handleAdd} style={{ marginTop:4 }}>
              Registra giornata
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
