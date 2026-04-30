import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useFinanze, CATEGORIE_USCITE, CATEGORIE_ENTRATE } from '../hooks/useFinanze'
import { PageHeader, Grid, SectionHeader, FormPanel, InputRow, Dot, MonthNav, EmptyState, showError, showConfirm, showSuccess, OnboardingModal, Modal } from '../components/ui'
import { formatCurrency, formatCurrencyDec, formatShort } from '../utils/dateHelpers'

const COLORS = ['#C46A3C','#3A5F8A','#3A7059','#7A5FA0','#B07040','#A04545','#5A8A6A','#888']
const PieTip = ({ active,payload }) => !active||!payload?.length?null:<div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--t2)',marginBottom:3 }}>{payload[0].name}</div><div style={{ color:'var(--ac)',fontFamily:"'DM Mono',monospace",fontWeight:600 }}>{formatCurrency(payload[0].value)}</div></div>
const LineTip = ({ active,payload,label }) => !active||!payload?.length?null:<div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}><div style={{ color:'var(--t3)',marginBottom:4 }}>{label}</div>{payload.map(p=><div key={p.name} style={{ color:p.color,fontFamily:"'DM Mono',monospace" }}>{p.name}: {formatCurrency(p.value)}</div>)}</div>

const Svg = ({ d, size=14, style }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0, ...style }}>
    <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ICONS = {
  bank:   "M1.5 12.5h11M1.5 5.5l5.5-4 5.5 4M3 12.5V5.5M11 12.5V5.5M7 12.5V5.5M5 12.5V5.5M9 12.5V5.5",
  cash:   "M1 4h12a1 1 0 011 1v4a1 1 0 01-1 1H1a1 1 0 01-1-1V5a1 1 0 011-1zM7 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  edit:   "M1 10.5v2.5h2.5l7-7-2.5-2.5-7 7zM11 3.5l1.5 1.5",
  trash:  "M2 3.5h10M4 3.5v-1a1 1 0 011-1h4a1 1 0 011 1v1M5 6v4M9 6v4M2.5 3.5l1 9a1 1 0 001 1h5a1 1 0 001-1l1-9",
  check:  "M1.5 7.5l3.5 3.5 7.5-8.5",
  close:  "M2 2l10 10M12 2L2 12",
  config: "M7 5a2 2 0 100 4 2 2 0 000-4zM7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M11.4 2.6l-1 1M3.6 10.4l-1 1",
}

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
  const [splitOpen, setSplitOpen] = useState(false)
  const [form, setForm] = useState({ desc:'',importo:'',tipo:'uscita',cat:'Altro',data:now.toISOString().slice(0,10), account: 'bank' })
  const [prevForm, setPrevForm] = useState({ desc:'',importo:'',tipo:'uscita',cat:'Altro',ricorrente:false,mese:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, account: 'bank' })
  const [splitForm, setSplitForm] = useState({ cash: '', bank: '' })

  const { transazioni,addTransazione,removeTransazione,updateTransazione,forMonth,riepilogo,perCategoria,andamentoMesi,
    getSaldoDisponibile,getSaldoDettagliato,distribuisciSaldo,previste,addPrevista,removePrevista,updatePrevista,confirmPrevista,previsteDelMese,totalePrevisteMese } = useFinanze()

  const [editingTxId, setEditingTxId] = useState(null)
  const [editTxForm, setEditTxForm] = useState(null)
  const [editingPrevId, setEditingPrevId] = useState(null)
  const [editPrevForm, setEditPrevForm] = useState(null)
  const [confirmingPrevId, setConfirmingPrevId] = useState(null)
  const [confirmPrevForm, setConfirmPrevForm] = useState(null)

  const handleEditPrev = (p) => {
    setEditingPrevId(p.id)
    setEditPrevForm({ ...p })
    setConfirmingPrevId(null)
  }

  const handleConfirmStart = (p) => {
    setConfirmingPrevId(p.id)
    setConfirmPrevForm({ ...p })
    setEditingPrevId(null)
  }

  const handleSaveEditPrev = () => {
    updatePrevista(editingPrevId, editPrevForm)
    setEditingPrevId(null)
    setEditPrevForm(null)
    showSuccess('Previsione aggiornata.')
  }

  const handleFinalConfirm = () => {
    confirmPrevista(confirmingPrevId, null, confirmPrevForm)
    setConfirmingPrevId(null)
    setConfirmPrevForm(null)
    showSuccess(`Confermata: ${confirmPrevForm.desc}`)
  }

  const handleEditTx = (tx) => {
    setEditingTxId(tx.id)
    setEditTxForm({ ...tx })
  }

  const handleSaveEditTx = () => {
    updateTransazione(editingTxId, editTxForm)
    setEditingTxId(null)
    setEditTxForm(null)
    showSuccess('Transazione aggiornata.')
  }

  const fin = riepilogo(year, month)
  const catData = perCategoria(year, month)
  const andamento = andamentoMesi()
  const monthTx = forMonth(year, month).sort((a,b)=>b.data.localeCompare(a.data))
  const monthPrev = previsteDelMese(year, month)
  const totPrev = totalePrevisteMese(year, month)
  const saldi = getSaldoDettagliato()
  const saldoDisponibile = saldi.totale
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
    setForm({ desc:'',importo:'',tipo:'uscita',cat:'Altro',data:now.toISOString().slice(0,10), account: 'bank' })
    setTxOpen(false)
  }

  const handleOpenSplit = () => {
    setSplitForm({ cash: saldi.cash, bank: saldi.bank })
    setSplitOpen(true)
  }

  const handleSaveSplit = () => {
    distribuisciSaldo(parseFloat(splitForm.cash)||0, parseFloat(splitForm.bank)||0)
    setSplitOpen(false)
    showSuccess('Liquidità suddivisa correttamente.')
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
      <OnboardingModal 
        sectionId="finanze"
        title="Gestione Finanze"
        icon="💰"
        description="Qui puoi tracciare entrate e uscite. Inserisci le 'Transazioni' per registrare movimenti reali, e usa le 'Transazioni Previste' per pianificare spese fisse o entrate future. Il saldo disponibile calcola quanto puoi spendere in sicurezza."
      />
      <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20 }}>
        <PageHeader label="finanze" title="Gestione Economica" />
        <div style={{ display:'flex',alignItems:'center',gap:12,paddingBottom:2 }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            <div style={{ fontSize:10,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.05em' }}>saldo disponibile</div>
            <div style={{ fontSize:16, fontWeight:700, color:saldoDisponibile>=0?'var(--go)':'var(--rd)', fontFamily:"'DM Mono',monospace" }}>
              {formatCurrency(saldoDisponibile)}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:2 }}>
              <div style={{ fontSize:10, color:'var(--t2)' }}>Conto: <span style={{ fontWeight:600 }}>{formatCurrency(saldi.bank)}</span></div>
              <div style={{ fontSize:10, color:'var(--t2)' }}>Contanti: <span style={{ fontWeight:600 }}>{formatCurrency(saldi.cash)}</span></div>
              <button onClick={handleOpenSplit} style={{ fontSize:10, color:'var(--ac)', background:'none', border:'none', padding:0, cursor:'pointer', fontWeight:600 }}>[ Dividi ]</button>
            </div>
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
              <select className="input-field" value={form.account} onChange={e=>setForm(f=>({...f,account:e.target.value}))} style={{ flex:0.4 }}>
                <option value="bank">Conto</option>
                <option value="cash">Contanti</option>
              </select>
              <select className="input-field" value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                {cats.map(c=><option key={c}>{c}</option>)}
              </select>
              <input className="input-field" type="date" value={form.data}
                onChange={e=>setForm(f=>({...f,data:e.target.value}))} style={{ maxWidth:120 }} />
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
            :monthTx.map(tx=>{
              const isEditing = editingTxId === tx.id
              const editCats = editTxForm?.tipo === 'entrata' ? CATEGORIE_ENTRATE : CATEGORIE_USCITE

              if (isEditing) return (
                <div key={tx.id} className="row-item" style={{ flexDirection:'column', alignItems:'stretch', gap:8, background:'var(--ac-bg)', borderRadius:8, padding:10, marginBottom:8 }}>
                  <TipoSwitch value={editTxForm.tipo} onChange={v=>setEditTxForm(f=>({...f,tipo:v,cat:'Altro'}))} />
                  <InputRow>
                    <input className="input-field" value={editTxForm.desc} onChange={e=>setEditTxForm({...editTxForm, desc:e.target.value})} />
                    <input className="input-field" type="number" value={editTxForm.importo} onChange={e=>setEditTxForm({...editTxForm, importo:e.target.value})} style={{ maxWidth:80 }} />
                  </InputRow>
                  <InputRow>
                    <select className="input-field" value={editTxForm.account} onChange={e=>setEditTxForm({...editTxForm, account:e.target.value})} style={{ flex:0.4 }}>
                      <option value="bank">Conto</option>
                      <option value="cash">Contanti</option>
                    </select>
                    <select className="input-field" value={editTxForm.cat} onChange={e=>setEditTxForm({...editTxForm, cat:e.target.value})}>
                      {editCats.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </InputRow>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button className="btn-ghost" onClick={() => setEditingTxId(null)}>Annulla</button>
                    <button className="btn-accent" onClick={handleSaveEditTx}>Salva</button>
                  </div>
                </div>
              )

              return (
                <div key={tx.id} className="row-item">
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:500 }}>{tx.desc}</div>
                    <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>{tx.cat} · {formatShort(tx.data)}</div>
                  </div>
                  <span style={{ fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:600,marginRight:8,color:tx.tipo==='entrata'?'var(--go)':'var(--rd)' }}>
                    {tx.tipo==='entrata'?'+':'-'}{formatCurrencyDec(tx.importo)}
                  </span>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <div title={tx.account==='cash'?'Contanti':'Conto'} style={{ color:'var(--t3)', display:'flex' }}>
                      <Svg d={tx.account==='cash'?ICONS.cash:ICONS.bank} size={14} />
                    </div>
                    <button className="btn-ghost" title="Modifica" style={{ padding:4, opacity:0.6 }} onClick={() => handleEditTx(tx)}>
                      <Svg d={ICONS.edit} size={13} />
                    </button>
                    <button className="btn-danger" style={{ padding:4 }} onClick={()=>handleRemoveTx(tx)}>
                      <Svg d={ICONS.close} size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
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
            :monthPrev.map(p=>{
              const isEditing = editingPrevId === p.id
              const isConfirming = confirmingPrevId === p.id
              const editCats = editPrevForm?.tipo === 'uscita' ? CATEGORIE_USCITE : CATEGORIE_ENTRATE

              if (isEditing) return (
                <div key={p.id} className="row-item" style={{ flexDirection:'column', alignItems:'stretch', gap:8, background:'var(--ac-bg)', borderRadius:8, padding:10 }}>
                  <InputRow>
                    <input className="input-field" value={editPrevForm.desc} onChange={e=>setEditPrevForm({...editPrevForm, desc:e.target.value})} />
                    <input className="input-field" type="number" value={editPrevForm.importo} onChange={e=>setEditPrevForm({...editPrevForm, importo:e.target.value})} style={{ maxWidth:80 }} />
                  </InputRow>
                  <InputRow>
                    <select className="input-field" value={editPrevForm.cat} onChange={e=>setEditPrevForm({...editPrevForm, cat:e.target.value})}>
                      {editCats.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn-ghost" onClick={() => setEditingPrevId(null)}>Annulla</button>
                      <button className="btn-accent" onClick={handleSaveEditPrev}>Salva</button>
                    </div>
                  </InputRow>
                </div>
              )

              if (isConfirming) return (
                <div key={p.id} className="row-item" style={{ background:'var(--ac-bg)', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ flex:1 }}>
                    <div className="label-xs" style={{ marginBottom:6 }}>Conferma importo finale</div>
                    <InputRow>
                      <input className="input-field" value={confirmPrevForm.desc} onChange={e=>setConfirmPrevForm({...confirmPrevForm, desc:e.target.value})} style={{ fontSize:12 }} />
                      <input className="input-field" type="number" value={confirmPrevForm.importo} onChange={e=>setConfirmPrevForm({...confirmPrevForm, importo:e.target.value})} style={{ maxWidth:80, fontFamily:"'DM Mono',monospace" }} />
                    </InputRow>
                  </div>
                  <div style={{ display:'flex', gap:6, marginLeft:10 }}>
                    <button className="btn-ghost" onClick={() => setConfirmingPrevId(null)}>✕</button>
                    <button className="btn-accent" onClick={handleFinalConfirm} style={{ padding:'6px 12px' }}>✓ Conferma</button>
                  </div>
                </div>
              )

              return (
                <div key={p.id} className="row-item">
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:500 }}>{p.desc}</div>
                    <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace" }}>{p.cat}{p.ricorrente?' · ricorrente':''}</div>
                  </div>
                  <span style={{ fontSize:13,fontFamily:"'DM Mono',monospace",fontWeight:600,marginRight:8,color:p.tipo==='entrata'?'var(--go)':'var(--rd)' }}>
                    {p.tipo==='entrata'?'+':'-'}{formatCurrency(p.importo)}
                  </span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn-ghost" title="Modifica"
                      style={{ padding:'4px 7px', opacity:0.7 }}
                      onClick={() => handleEditPrev(p)}>
                      <Svg d={ICONS.config} size={12} />
                    </button>
                    <button className="btn-ghost" title="Conferma come transazione effettiva"
                      style={{ padding:'4px 7px', borderColor:'var(--go)', color:'var(--go)' }}
                      onClick={() => handleConfirmStart(p)}>
                      <Svg d={ICONS.check} size={12} />
                    </button>
                    <button className="btn-danger" style={{ padding:'4px 7px' }} onClick={()=>handleRemovePrev(p)}>
                      <Svg d={ICONS.close} size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Modal open={splitOpen} title="Suddividi Liquidità" onClose={() => setSplitOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ padding:'12px', background:'var(--sf2)', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--t3)', textTransform:'uppercase', marginBottom:4 }}>Totale Attuale</div>
            <div style={{ fontSize:24, fontWeight:700, fontFamily:"'DM Mono',monospace" }}>{formatCurrency(saldoDisponibile)}</div>
          </div>
          
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--t2)', display:'block', marginBottom:6 }}>Soldi sul Conto</label>
              <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <Svg d={ICONS.bank} style={{ position:'absolute', left:10, color:'var(--t3)' }} />
                <input 
                  className="input-field" 
                  type="number" 
                  value={splitForm.bank} 
                  onChange={e => setSplitForm({ ...splitForm, bank: e.target.value })} 
                  placeholder="0.00"
                  style={{ paddingLeft:32 }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--t2)', display:'block', marginBottom:6 }}>Contanti</label>
              <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <Svg d={ICONS.cash} style={{ position:'absolute', left:10, color:'var(--t3)' }} />
                <input 
                  className="input-field" 
                  type="number" 
                  value={splitForm.cash} 
                  onChange={e => setSplitForm({ ...splitForm, cash: e.target.value })} 
                  placeholder="0.00"
                  style={{ paddingLeft:32 }}
                />
              </div>
            </div>
          </div>

          <div style={{ fontSize:11, color:Math.abs(saldoDisponibile - ((parseFloat(splitForm.cash)||0) + (parseFloat(splitForm.bank)||0))) > 0.01 ? 'var(--rd)' : 'var(--go)', textAlign:'center', marginTop:4 }}>
            Somma inserita: {formatCurrency((parseFloat(splitForm.cash)||0) + (parseFloat(splitForm.bank)||0))}
          </div>

          <div style={{ display:'flex', gap:10, marginTop:10 }}>
            <button className="btn-ghost" style={{ flex:1 }} onClick={() => setSplitOpen(false)}>Annulla</button>
            <button className="btn-accent" style={{ flex:1 }} onClick={handleSaveSplit}>Salva Divisione</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
