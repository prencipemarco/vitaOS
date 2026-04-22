import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useFinanze, CATEGORIE_USCITE, CATEGORIE_ENTRATE } from '../hooks/useFinanze'
import { PageHeader, Grid, SectionHeader, FormPanel, InputRow, Dot, MonthNav, EmptyState, showError, showConfirm, showSuccess } from '../components/ui'
import { formatCurrency, formatCurrencyDec, formatShort } from '../utils/dateHelpers'

const COLORS = ['#C46A3C','#3A5F8A','#3A7059','#7A5FA0','#B07040','#A04545','#5A8A6A','#888']
const PieTip = ({ active,payload }) => !active||!payload?.length?null:<div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--t2)',marginBottom:3 }}>{payload[0].name}</div><div style={{ color:'var(--ac)',fontFamily:"'DM Mono',monospace",fontWeight:600 }}>{formatCurrency(payload[0].value)}</div></div>
const LineTip = ({ active,payload,label }) => !active||!payload?.length?null:<div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--t3)',marginBottom:4 }}>{label}</div>{payload.map(p=><div key={p.name} style={{ color:p.color,fontFamily:"'DM Mono',monospace" }}>{p.name}: {formatCurrency(p.value)}</div>)}</div>

function TipoSwitch({ value, onChange }) {
  return (
    <div className="tipo-switch">
      <button className={`tipo-btn${value==='entrata'?' active-in':''}`} onClick={()=>onChange('entrata')}>+ Entrata</button>
      <button className={`tipo-btn${value==='uscita'?' active-out':''}`} onClick={()=>onChange('uscita')} style={{ borderLeft:'1px solid var(--bd2)' }}>− Spesa</button>
    </div>
  )
}

function TxFormBox({ tipo, open, children }) {
  if (!open) return null
  const tint = tipo==='entrata'?'rgba(58,112,89,.05)':tipo==='uscita'?'rgba(160,69,69,.05)':'transparent'
  const border = tipo==='entrata'?'rgba(58,112,89,.18)':tipo==='uscita'?'rgba(160,69,69,.18)':'var(--bd)'
  return (
    <div style={{ padding:'12px',background:tint,border:`1px solid ${border}`,borderRadius:9,display:'flex',flexDirection:'column',gap:8,animation:'slideDown .18s ease',marginTop:10 }}>
      {children}
    </div>
  )
}

export default function Finanze() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [txOpen, setTxOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)
  const [form, setForm] = useState({ desc:'',importo:'',tipo:'uscita',cat:'Altro',data:now.toISOString().slice(0,10) })
  const [prevForm, setPrevForm] = useState({ desc:'',importo:'',tipo:'uscita',cat:'Altro',ricorrente:false,mese:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}` })

  const { transazioni,addTransazione,removeTransazione,forMonth,riepilogo,perCategoria,andamentoMesi,
    getSaldoDisponibile,previste,addPrevista,removePrevista,previsteDelMese,totalePrevisteMese } = useFinanze()

  const fin = riepilogo(year, month)
  const catData = perCategoria(year, month)
  const andamento = andamentoMesi()
  const monthTx = forMonth(year, month).sort((a,b)=>b.data.localeCompare(a.data))
  const monthPrev = previsteDelMese(year, month)
  const totPrev = totalePrevisteMese(year, month)
  const saldoDisponibile = getSaldoDisponibile()
  const nettoConPreviste = fin.netto + totPrev.entrate - totPrev.uscite

  const cats = form.tipo==='uscita'?CATEGORIE_USCITE:CATEGORIE_ENTRATE
  const prevCats = prevForm.tipo==='uscita'?CATEGORIE_USCITE:CATEGORIE_ENTRATE

  const handleAddTx = () => {
    const importo = parseFloat(form.importo)
    if(!form.desc.trim()||isNaN(importo)||importo<=0) return
    // Balance check for uscite
    if(form.tipo==='uscita' && importo > saldoDisponibile) {
      showError(`Saldo insufficiente.\nDisponibile: ${formatCurrency(saldoDisponibile)}\nRichiesto: ${formatCurrency(importo)}`)
      return
    }
    addTransazione(form)
    showSuccess(`Transazione aggiunta: ${form.tipo==='entrata'?'+':'-'}${formatCurrency(importo)}`)
    setForm({ desc:'',importo:'',tipo:'uscita',cat:'Altro',data:now.toISOString().slice(0,10) })
    setTxOpen(false)
  }

  const handleRemoveTx = (tx) => {
    showConfirm(`Eliminare "${tx.desc}" (${formatCurrency(tx.importo)})?`, () => {
      removeTransazione(tx.id)
    })
  }

  const handleAddPrev = () => {
    if(!prevForm.desc.trim()||!prevForm.importo) return
    addPrevista({ ...prevForm, mese:prevForm.ricorrente?null:prevForm.mese })
    setPrevForm({ desc:'',importo:'',tipo:'uscita',cat:'Altro',ricorrente:false,mese:`${year}-${String(month+1).padStart(2,'0')}` })
    setPrevOpen(false)
    showSuccess('Transazione prevista aggiunta.')
  }

  const handleRemovePrev = (p) => {
    showConfirm(`Rimuovere "${p.desc}" dalle previste?`, ()=>removePrevista(p.id))
  }

  return (
    <div style={{ padding:28,animation:'fadeUp .24s ease both' }}>
      <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20 }}>
        <PageHeader label="finanze" title="Gestione Economica" />
        <div style={{ display:'flex',alignItems:'center',gap:12,paddingBottom:2 }}>
          <div style={{ fontSize:12,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>
            saldo disponibile: <span style={{ color:saldoDisponibile>=0?'var(--go)':'var(--rd)',fontWeight:600 }}>{formatCurrency(saldoDisponibile)}</span>
          </div>
          <MonthNav year={year} month={month} onChange={(y,m)=>{ setYear(y);setMonth(m) }} />
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:12 }}>
        {[
          ['ENTRATE',fin.entrate>0?formatCurrency(fin.entrate):'—','var(--go)','questo mese'],
          ['USCITE',fin.uscite>0?formatCurrency(fin.uscite):'—','var(--rd)','questo mese'],
          ['SALDO NETTO',fin.entrate>0?formatCurrency(fin.netto):'—','var(--ac)',fin.netto>=0?'↑ positivo':'↓ negativo'],
          ['CON PREVISTE',(fin.entrate>0||totPrev.uscite>0)?formatCurrency(nettoConPreviste):'—',undefined,'saldo stimato'],
        ].map(([l,v,c,s],i)=>(
          <div key={l} className={`card card-${i+1}`}>
            <div className="label-xs" style={{ marginBottom:7 }}>{l}</div>
            <div className="stat-val" style={c?{ color:c }:{}}>{v}</div>
            <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:12,marginBottom:12 }}>
        <div className="card card-5">
          <div className="label-xs" style={{ marginBottom:12 }}>spese per categoria</div>
          {catData.length===0?<EmptyState message="Nessuna spesa registrata" />:(
            <>
              <ResponsiveContainer width="100%" height={148}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={64} dataKey="value" paddingAngle={2}>
                    {catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex',flexDirection:'column',gap:4,marginTop:6 }}>
                {catData.map((c,i)=>(
                  <div key={c.name} style={{ display:'flex',alignItems:'center',gap:7,padding:'2px 3px',borderRadius:5,transition:'background .12s' }}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--sf2)'}
                    onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <Dot color={COLORS[i%COLORS.length]} />
                    <span style={{ flex:1,fontSize:12 }}>{c.name}</span>
                    <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace",color:'var(--t2)' }}>{formatCurrency(c.value)}</span>
                    <span style={{ fontSize:10,color:'var(--t3)',minWidth:26,textAlign:'right' }}>{fin.uscite?Math.round(c.value/fin.uscite*100):0}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card card-6">
          <div className="label-xs" style={{ marginBottom:12 }}>andamento 6 mesi</div>
          <ResponsiveContainer width="100%" height={218}>
            <LineChart data={andamento} margin={{ top:4,right:8,bottom:0,left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
              <XAxis dataKey="mese" tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`} width={36} />
              <Tooltip content={<LineTip />} />
              <Line type="monotone" dataKey="entrate" stroke="var(--go)" strokeWidth={1.5} dot={{ r:2 }} name="Entrate" />
              <Line type="monotone" dataKey="uscite" stroke="var(--rd)" strokeWidth={1.5} dot={{ r:2 }} name="Uscite" strokeDasharray="4 2" />
              <Line type="monotone" dataKey="netto" stroke="var(--ac)" strokeWidth={1.5} dot={{ r:2 }} name="Netto" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
        {/* Transazioni effettive */}
        <div className="card">
          <SectionHeader action={
            <button className="btn-ghost btn-sm" onClick={()=>setTxOpen(f=>!f)}>
              {txOpen?'✕ chiudi':'+ aggiungi'}
            </button>
          }>
            transazioni — {monthTx.length}
          </SectionHeader>
          <TxFormBox tipo={form.tipo} open={txOpen}>
            <TipoSwitch value={form.tipo} onChange={v=>setForm(f=>({...f,tipo:v,cat:'Altro'}))} />
            <InputRow>
              <input className="input-field" placeholder="Descrizione" value={form.desc}
                onChange={e=>setForm(f=>({...f,desc:e.target.value}))} />
              <input className="input-field" type="number" placeholder="€" value={form.importo}
                onChange={e=>setForm(f=>({...f,importo:e.target.value}))} style={{ maxWidth:90 }} />
            </InputRow>
            <InputRow>
              <select className="input-field" value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
              <input className="input-field" type="date" value={form.data}
                onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={{ maxWidth:140 }} />
            </InputRow>
            {form.tipo==='uscita'&&saldoDisponibile<(parseFloat(form.importo)||0)&&(parseFloat(form.importo)||0)>0&&(
              <div style={{ fontSize:11,color:'var(--rd)',padding:'5px 8px',background:'rgba(160,69,69,.07)',borderRadius:6 }}>
                ⚠ Saldo disponibile: {formatCurrency(saldoDisponibile)}
              </div>
            )}
            <InputRow>
              <button className="btn-ghost" onClick={()=>setTxOpen(false)}>Annulla</button>
              <button className="btn-accent" onClick={handleAddTx}>Salva</button>
            </InputRow>
          </TxFormBox>
          <div style={{ maxHeight:340,overflowY:'auto',marginTop:txOpen?8:0 }}>
            {monthTx.length===0&&!txOpen?<EmptyState message="Nessuna transazione" />
            :monthTx.map(tx=>(
              <div key={tx.id} className="row-item">
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500 }}>{tx.desc}</div>
                  <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>{tx.cat} · {formatShort(tx.data)}</div>
                </div>
                <span style={{ fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:600,marginRight:8,color:tx.tipo==='entrata'?'var(--go)':'var(--rd)' }}>
                  {tx.tipo==='entrata'?'+':'-'}{formatCurrencyDec(tx.importo)}
                </span>
                <button className="btn-danger" onClick={()=>handleRemoveTx(tx)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Previste */}
        <div className="card">
          <SectionHeader action={
            <button className="btn-ghost btn-sm" onClick={()=>setPrevOpen(f=>!f)}>
              {prevOpen?'✕ chiudi':'+ prevedi'}
            </button>
          }>
            transazioni previste
          </SectionHeader>
          {(totPrev.uscite>0||totPrev.entrate>0)&&(
            <div style={{ display:'flex',gap:8,marginBottom:10,padding:'8px 10px',background:'var(--sf2)',borderRadius:8 }}>
              {totPrev.entrate>0&&<div style={{ flex:1 }}><div style={{ color:'var(--t3)',fontSize:10 }}>Entrate</div><div style={{ fontFamily:"'DM Mono',monospace",color:'var(--go)',fontWeight:600 }}>+{formatCurrency(totPrev.entrate)}</div></div>}
              {totPrev.uscite>0&&<div style={{ flex:1 }}><div style={{ color:'var(--t3)',fontSize:10 }}>Uscite</div><div style={{ fontFamily:"'DM Mono',monospace",color:'var(--rd)',fontWeight:600 }}>-{formatCurrency(totPrev.uscite)}</div></div>}
            </div>
          )}
          <TxFormBox tipo={prevForm.tipo} open={prevOpen}>
            <TipoSwitch value={prevForm.tipo} onChange={v=>setPrevForm(f=>({...f,tipo:v,cat:'Altro'}))} />
            <InputRow>
              <input className="input-field" placeholder="Descrizione" value={prevForm.desc}
                onChange={e=>setPrevForm(f=>({...f,desc:e.target.value}))} />
              <input className="input-field" type="number" placeholder="€" value={prevForm.importo}
                onChange={e=>setPrevForm(f=>({...f,importo:e.target.value}))} style={{ maxWidth:90 }} />
            </InputRow>
            <select className="input-field" value={prevForm.cat} onChange={e=>setPrevForm(f=>({...f,cat:e.target.value}))}>
              {prevCats.map(c=><option key={c}>{c}</option>)}
            </select>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <input type="checkbox" id="ric" checked={prevForm.ricorrente} onChange={e=>setPrevForm(f=>({...f,ricorrente:e.target.checked}))} />
              <label htmlFor="ric" style={{ fontSize:12,color:'var(--t2)',cursor:'pointer' }}>Ricorrente ogni mese</label>
            </div>
            {!prevForm.ricorrente&&<input className="input-field" type="month" value={prevForm.mese} onChange={e=>setPrevForm(f=>({...f,mese:e.target.value}))} />}
            <InputRow>
              <button className="btn-ghost" onClick={()=>setPrevOpen(false)}>Annulla</button>
              <button className="btn-accent" onClick={handleAddPrev}>Salva</button>
            </InputRow>
          </TxFormBox>
          <div style={{ maxHeight:340,overflowY:'auto',marginTop:prevOpen?8:0 }}>
            {monthPrev.length===0&&!prevOpen?<EmptyState message="Nessuna transazione prevista" />
            :monthPrev.map(p=>(
              <div key={p.id} className="row-item">
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500 }}>{p.desc}</div>
                  <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>{p.cat}{p.ricorrente?' · ricorrente':''}</div>
                </div>
                <span style={{ fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:600,marginRight:8,color:p.tipo==='entrata'?'var(--go)':'var(--rd)' }}>
                  {p.tipo==='entrata'?'+':'-'}{formatCurrency(p.importo)}
                </span>
                <button className="btn-danger" onClick={()=>handleRemovePrev(p)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
