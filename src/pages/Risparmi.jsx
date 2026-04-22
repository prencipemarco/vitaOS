import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useRisparmi } from '../hooks/useRisparmi'
import { useFinanze } from '../hooks/useFinanze'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { PageHeader, SectionHeader, FormPanel, InputRow, ProgressBar, Badge, EmptyState, showError, showConfirm, showSuccess } from '../components/ui'
import { formatCurrency, todayStr } from '../utils/dateHelpers'
import { mesiAlTraguardo, proiezioneConInvestimento, MAX_SAVINGS_RATIO } from '../utils/algoritmoRisparmi'

const PRIO_C = { alta:'#A04545', media:'#C46A3C', bassa:'#3A7059' }
const PRIO_L = { alta:'Alta', media:'Media', bassa:'Bassa' }
const PIE_C = ['#C46A3C','#3A5F8A','#3A7059','#7A5FA0','#888']

const AreaTip = ({ active,payload,label }) => !active||!payload?.length?null:(
  <div style={{ background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:8,padding:'8px 12px',fontSize:12 }}>
    <div style={{ color:'var(--t3)',marginBottom:5 }}>Mese {label}</div>
    {payload.map(p=><div key={p.name} style={{ color:p.color,fontFamily:"'DM Mono',monospace",marginBottom:2 }}>{p.name}: {formatCurrency(p.value)}</div>)}
  </div>
)

const TYPE_S = {
  danger: { bg:'rgba(160,69,69,.07)',border:'rgba(160,69,69,.22)',color:'var(--rd)' },
  warning:{ bg:'rgba(196,106,60,.07)',border:'rgba(196,106,60,.22)',color:'var(--ac)' },
  success:{ bg:'rgba(58,112,89,.07)', border:'rgba(58,112,89,.22)', color:'var(--go)' },
  info:   { bg:'var(--sf2)',          border:'var(--bd)',           color:'var(--t2)' },
  action: { bg:'var(--ac-bg)',        border:'rgba(196,106,60,.2)',color:'var(--ac)' },
}

function buildSuggestions({ fin6,fin,goals,salv,settings,contributoNecessario }) {
  const S=[], { netto,entrate,uscite } = fin
  const maxA = Math.round(netto*MAX_SAVINGS_RATIO)
  const buf = netto - maxA
  const stip = parseFloat(settings.stipendioNetto)||0

  if(entrate>0){
    const r=netto/entrate
    if(r<0.10) S.push({ type:'danger',icon:'⚠',titolo:'Risparmio critico',testo:`Solo ${Math.round(r*100)}% delle entrate risparmiato. Obiettivo minimo: 20%.` })
    else if(r>=0.30) S.push({ type:'success',icon:'✓',titolo:'Ottimo tasso di risparmio',testo:`${Math.round(r*100)}% risparmiato. Suggerisco: max ${formatCurrency(maxA)} al risparmio, ${formatCurrency(buf)} liquidi per imprevisti.` })
    else S.push({ type:'info',icon:'→',titolo:'Ottimizza il risparmio',testo:`Tasso attuale: ${Math.round(r*100)}%. Considera ${formatCurrency(maxA)} al risparmio (${Math.round(MAX_SAVINGS_RATIO*100)}%), tenendo ${formatCurrency(buf)} come riserva.` })
  }
  if(settings.tredicesima&&stip>0){ const m=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][settings.meseTredicesima??11]; S.push({ type:'info',icon:'🗓',titolo:`Tredicesima a ${m}`,testo:`Circa ${formatCurrency(stip)} in arrivo. Momento ideale per obiettivi ad alta priorità.` }) }
  if(settings.quattordicesima&&stip>0){ const m=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'][settings.meseQuattordicesima??6]; S.push({ type:'info',icon:'🗓',titolo:`Quattordicesima a ${m}`,testo:`Circa ${formatCurrency(stip)} previsti. Pianifica in anticipo l'allocazione.` }) }
  const fe=goals.find(g=>g.nome.toLowerCase().includes('emergenza'))
  if(!fe&&uscite>0) S.push({ type:'danger',icon:'!',titolo:'Fondo emergenza assente',testo:`Crea prima un fondo emergenza: min ${formatCurrency(uscite*3)} (3 mesi), ideale ${formatCurrency(uscite*6)}.` })
  else if(fe&&uscite>0&&fe.corrente<uscite*3) S.push({ type:'warning',icon:'△',titolo:'Fondo emergenza insufficiente',testo:`Copre ${Math.round(fe.corrente/Math.max(1,uscite))} mesi. Target: 3 mesi (${formatCurrency(uscite*3)}).` })
  const ap=goals.filter(g=>g.priorita==='alta'&&g.corrente<g.target)
  if(ap.length>0&&netto>0){ const g=ap[0]; const cn=contributoNecessario(g.id); const mesi=cn?cn.mesi:mesiAlTraguardo(g.corrente,g.target,maxA); S.push({ type:'action',icon:'⊕',titolo:`Focus: ${g.nome}`,testo:cn?`Con scadenza tra ${cn.mesi} mesi, servono ${formatCurrency(cn.contributo)}/mese per raggiungerlo.`:`Allocando ${formatCurrency(maxA)}/mese, ci vogliono ~${mesi} mesi.` }) }
  if(fin6.length>=3){ const ul=fin6.slice(-3).map(m=>m.netto); if(ul[ul.length-1]>ul[0]) S.push({ type:'success',icon:'↑',titolo:'Tendenza positiva',testo:'Saldo netto in crescita. Valuta di aumentare il contributo mensile.' }); else if(ul[0]>0) S.push({ type:'warning',icon:'↓',titolo:'Tendenza in calo',testo:'Saldo netto in diminuzione. Rivedi le categorie di spesa.' }) }
  if(salv>500) S.push({ type:'action',icon:'◈',titolo:'Considera un investimento',testo:`Con ${formatCurrency(salv)} nel salvadanaio, usa il simulatore per vedere la crescita composta.` })
  return S.slice(0,6)
}

export default function Risparmi() {
  const now = new Date()
  const { goals,salvadanaioLibero,addGoal,removeGoal,updateGoal,depositaLibero,distribuisciSurplus,totaleRisparmi,contributoNecessario } = useRisparmi()
  const { riepilogo,andamentoMesi,addTransazione,getSaldoDisponibile } = useFinanze()
  const { settings } = useImpostazioni()

  const fin = riepilogo(now.getFullYear(), now.getMonth())
  const fin6 = andamentoMesi()
  const totale = totaleRisparmi()
  const saldoDisp = getSaldoDisponibile()
  const maxCons = Math.round(Math.max(0,fin.netto)*MAX_SAVINGS_RATIO)

  const [contributo, setContributo] = useState(200)
  const [invOpen, setInvOpen] = useState(false)
  const [tasso, setTasso] = useState(5)
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [goalForm, setGoalForm] = useState({ nome:'',target:'',corrente:'',priorita:'media',scadenza:'' })
  const [depositFormOpen, setDepositFormOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [distFormOpen, setDistFormOpen] = useState(false)
  const [distSurplus, setDistSurplus] = useState('')
  const [lastAlloc, setLastAlloc] = useState(null)

  const proiezione = useMemo(()=>
    proiezioneConInvestimento(salvadanaioLibero,contributo,invOpen?tasso:0),
    [salvadanaioLibero,contributo,invOpen,tasso]
  )
  const suggestions = useMemo(()=>
    buildSuggestions({ fin6,fin,goals,salv:salvadanaioLibero,settings,contributoNecessario }),
    [fin.netto,fin.uscite,fin.entrate,goals.length,salvadanaioLibero,settings.tredicesima,settings.quattordicesima]
  )

  const handleAddGoal = () => {
    if(!goalForm.nome.trim()||!goalForm.target) return
    addGoal(goalForm)
    setGoalForm({ nome:'',target:'',corrente:'',priorita:'media',scadenza:'' })
    setGoalFormOpen(false)
    showSuccess('Obiettivo aggiunto.')
  }

  const handleDeposit = () => {
    const n = parseFloat(depositAmount)
    if(!n||n<=0) return
    if(n>saldoDisp) { showError(`Saldo insufficiente.\nDisponibile: ${formatCurrency(saldoDisp)}\nRichiesto: ${formatCurrency(n)}`); return }
    depositaLibero(n)
    addTransazione({ desc:'Versamento salvadanaio libero',importo:n,tipo:'uscita',cat:'Risparmio',data:todayStr() })
    setDepositAmount('')
    setDepositFormOpen(false)
    showSuccess(`+${formatCurrency(n)} nel salvadanaio.`)
  }

  const handleDistribuisci = () => {
    const n = parseFloat(distSurplus)||maxCons
    if(n<=0) return
    if(n>saldoDisp) { showError(`Saldo insufficiente.\nDisponibile: ${formatCurrency(saldoDisp)}\nRichiesto: ${formatCurrency(n)}`); return }
    const alloc = distribuisciSurplus(n)
    addTransazione({ desc:'Distribuzione obiettivi risparmio',importo:n,tipo:'uscita',cat:'Risparmio',data:todayStr() })
    setLastAlloc(alloc)
    setDistFormOpen(false)
    setDistSurplus('')
    showSuccess(`${formatCurrency(n)} distribuiti agli obiettivi.`)
  }

  const handleRemoveGoal = (g) => {
    showConfirm(`Eliminare l'obiettivo "${g.nome}"?`, ()=>removeGoal(g.id))
  }

  // Investment scenario presets
  const SCENARIOS = [
    { label:'Conservativo',tasso:2.5,colore:'#3A7059' },
    { label:'Moderato',tasso:5,colore:'#C46A3C' },
    { label:'Aggressivo',tasso:8,colore:'#3A5F8A' },
  ]

  return (
    <div style={{ padding:28,animation:'fadeUp .24s ease both' }}>
      <PageHeader label="risparmi" title="Gestione Patrimonio" />

      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:12 }}>
        <div className="card card-1"><div className="label-xs" style={{ marginBottom:7 }}>TOTALE PATRIMONIO</div><div className="stat-val" style={{ color:'var(--ac)' }}>{totale>0?formatCurrency(totale):'—'}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>obiettivi + libero</div></div>
        <div className="card card-2"><div className="label-xs" style={{ marginBottom:7 }}>SALVADANAIO LIBERO</div><div className="stat-val">{formatCurrency(salvadanaioLibero)}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>non vincolato</div></div>
        <div className="card card-3"><div className="label-xs" style={{ marginBottom:7 }}>SALDO DISPONIBILE</div><div className="stat-val" style={{ color:saldoDisp>=0?'var(--go)':'var(--rd)' }}>{formatCurrency(saldoDisp)}</div><div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{fin.netto>0?`max ${formatCurrency(maxCons)} al risparmio`:'da finanze'}</div></div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1.9fr 1fr',gap:12,alignItems:'start' }}>
        {/* LEFT */}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {/* Projection */}
          <div className="card card-4">
            <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,gap:10 }}>
              <div>
                <div className="label-xs">proiezione salvadanaio libero — 12 mesi</div>
                <div style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>base {formatCurrency(salvadanaioLibero)}</div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                  <input type="number" value={contributo} min="0" step="50"
                    onChange={e=>setContributo(Math.max(0,parseInt(e.target.value)||0))}
                    style={{ width:68,padding:'4px 6px',border:'1px solid var(--bd2)',borderRadius:6,fontSize:13,background:'var(--bg)',color:'var(--t1)',fontFamily:"'DM Mono',monospace",outline:'none' }} />
                  <span style={{ fontSize:11,color:'var(--t2)' }}>€/m</span>
                </div>
                <button className="tip-chip" onClick={()=>setInvOpen(v=>!v)}
                  style={{ background:invOpen?'var(--ac)':'var(--ac-bg)',color:invOpen?'#fff':'var(--ac)',transition:'all .18s' }}>
                  {invOpen?'▲ chiudi':'◈ investimento'}
                </button>
              </div>
            </div>

            {invOpen&&(
              <div style={{ padding:'12px 14px',background:'var(--sf2)',borderRadius:9,marginBottom:12,border:'1px solid var(--bd)',animation:'slideDown .2s ease' }}>
                <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:10,flexWrap:'wrap' }}>
                  <span style={{ fontSize:12,fontWeight:600,color:'var(--t1)' }}>Simulatore investimento</span>
                  <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                    <span style={{ fontSize:12,color:'var(--t2)' }}>Tasso annuo</span>
                    <input type="number" value={tasso} min="0" max="30" step="0.5"
                      onChange={e=>setTasso(Math.max(0,parseFloat(e.target.value)||0))}
                      style={{ width:58,padding:'4px 6px',border:'1px solid var(--bd2)',borderRadius:6,fontSize:13,background:'var(--bg)',color:'var(--t1)',fontFamily:"'DM Mono',monospace",outline:'none' }} />
                    <span style={{ fontSize:12,color:'var(--t2)' }}>%/anno</span>
                  </div>
                </div>
                {/* Scenario shortcuts */}
                <div style={{ display:'flex',gap:6,marginBottom:10 }}>
                  {SCENARIOS.map(s=>(
                    <button key={s.label} onClick={()=>setTasso(s.tasso)}
                      style={{ padding:'4px 10px',border:`1px solid ${s.colore}22`,borderRadius:6,background:tasso===s.tasso?s.colore+'22':'transparent',color:s.colore,fontSize:11,cursor:'pointer',transition:'all .14s',fontFamily:"'DM Sans',sans-serif" }}>
                      {s.label} ({s.tasso}%)
                    </button>
                  ))}
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                  {[3,6,12].map(n=>{
                    const semplice = salvadanaioLibero + contributo*n
                    const r = tasso/100/12
                    const inv = r===0?semplice:Math.round(salvadanaioLibero*Math.pow(1+r,n)+(contributo*(Math.pow(1+r,n)-1))/r)
                    const extra = inv-semplice
                    return (
                      <div key={n} style={{ padding:'8px 10px',background:'var(--bg)',borderRadius:8,border:'1px solid var(--bd)' }}>
                        <div style={{ fontSize:10,color:'var(--t3)',marginBottom:4,letterSpacing:'.06em' }}>{n} MESI</div>
                        <div style={{ fontSize:14,fontFamily:"'DM Mono',monospace",fontWeight:600,color:'var(--go)' }}>{formatCurrency(inv)}</div>
                        <div style={{ fontSize:11,color:'var(--t3)',marginTop:2 }}>+{formatCurrency(extra)} vs senza</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={145}>
              <AreaChart data={proiezione} margin={{ top:4,right:4,bottom:0,left:0 }}>
                <defs>
                  <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--ac)" stopOpacity={0.14}/><stop offset="100%" stopColor="var(--ac)" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="gI2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--go)" stopOpacity={0.16}/><stop offset="100%" stopColor="var(--go)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" />
                <XAxis dataKey="mese" tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11,fill:'var(--t2)',fontFamily:"'DM Mono'" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`} width={36} />
                <Tooltip content={<AreaTip />} />
                <Area type="monotone" dataKey="semplice" stroke="var(--ac)" strokeWidth={1.5} fill="url(#gS2)" name="Accumulo semplice" />
                {invOpen&&<Area type="monotone" dataKey="investito" stroke="var(--go)" strokeWidth={1.5} fill="url(#gI2)" name={`Con ${tasso}%/anno`} />}
              </AreaChart>
            </ResponsiveContainer>
            {invOpen&&(
              <div style={{ display:'flex',gap:16,marginTop:8 }}>
                <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--t2)' }}><span style={{ width:14,height:2,background:'var(--ac)',display:'inline-block',borderRadius:1 }}/>Accumulo semplice</div>
                <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--t2)' }}><span style={{ width:14,height:2,background:'var(--go)',display:'inline-block',borderRadius:1 }}/>Con {tasso}%/anno</div>
              </div>
            )}
          </div>

          {/* Goals */}
          <div className="card card-5">
            <SectionHeader action={
              <div style={{ display:'flex',gap:6 }}>
                <button className="btn-ghost btn-sm" onClick={()=>setDistFormOpen(f=>!f)}>↗ distribuisci</button>
                <button className="btn-ghost btn-sm" onClick={()=>setGoalFormOpen(f=>!f)}>+ obiettivo</button>
              </div>
            }>obiettivi vincolati — {goals.length}</SectionHeader>

            <FormPanel open={distFormOpen}>
              <div style={{ fontSize:12,color:'var(--t2)',padding:'8px 10px',background:'var(--sf2)',borderRadius:7,lineHeight:1.7 }}>
                Alloca max il <strong>{Math.round(MAX_SAVINGS_RATIO*100)}%</strong> del surplus ({formatCurrency(maxCons)}), mantenendo liquidità. Il versamento diventa spesa.
              </div>
              <InputRow>
                <input className="input-field" type="number" placeholder={`Importo (consigliato: ${formatCurrency(maxCons)})`} value={distSurplus} onChange={e=>setDistSurplus(e.target.value)} />
                <button className="btn-accent" onClick={handleDistribuisci}>Distribuisci</button>
              </InputRow>
            </FormPanel>

            <FormPanel open={goalFormOpen}>
              <input className="input-field" placeholder="Nome obiettivo" value={goalForm.nome} onChange={e=>setGoalForm(f=>({...f,nome:e.target.value}))} />
              <InputRow>
                <input className="input-field" type="number" placeholder="Target €" value={goalForm.target} onChange={e=>setGoalForm(f=>({...f,target:e.target.value}))} />
                <input className="input-field" type="number" placeholder="Attuale €" value={goalForm.corrente} onChange={e=>setGoalForm(f=>({...f,corrente:e.target.value}))} />
              </InputRow>
              <InputRow>
                <select className="input-field" value={goalForm.priorita} onChange={e=>setGoalForm(f=>({...f,priorita:e.target.value}))}>
                  <option value="alta">Alta priorità</option>
                  <option value="media">Media priorità</option>
                  <option value="bassa">Bassa priorità</option>
                </select>
                <input className="input-field" type="date" value={goalForm.scadenza||''} onChange={e=>setGoalForm(f=>({...f,scadenza:e.target.value}))}
                  title="Scadenza (opzionale)" />
              </InputRow>
              <div style={{ fontSize:11,color:'var(--t3)' }}>📅 La scadenza verrà mostrata sul calendario</div>
              <InputRow>
                <button className="btn-ghost" onClick={()=>setGoalFormOpen(false)}>Annulla</button>
                <button className="btn-accent" onClick={handleAddGoal}>Salva</button>
              </InputRow>
            </FormPanel>

            {lastAlloc&&(
              <div style={{ padding:'8px 10px',background:'var(--ac-bg)',borderRadius:7,marginBottom:10,fontSize:12,animation:'slideDown .2s ease' }}>
                <div style={{ fontWeight:600,color:'var(--ac)',marginBottom:3 }}>Distribuzione applicata</div>
                {lastAlloc.map(g=>g.allocato>0&&<div key={g.id} style={{ color:'var(--t2)' }}>→ {g.nome}: <strong style={{ fontFamily:"'DM Mono',monospace" }}>+{formatCurrency(g.allocato)}</strong></div>)}
              </div>
            )}

            {goals.length===0?<EmptyState message="Nessun obiettivo. Creane uno per iniziare." />
            :goals.map(g=>{
              const pct = Math.min(100,Math.round(g.corrente/g.target*100))
              const cn = contributoNecessario(g.id)
              const mesi = cn?cn.mesi:mesiAlTraguardo(g.corrente,g.target,Math.max(1,maxCons))
              return (
                <div key={g.id} style={{ marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--bd)' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                    <span style={{ flex:1,fontSize:13,fontWeight:500 }}>{g.nome}</span>
                    {g.scadenza&&<span style={{ fontSize:10,color:'var(--t3)',fontFamily:"'DM Mono',monospace" }}>📅 {g.scadenza}</span>}
                    <Badge color={PRIO_C[g.priorita]}>{PRIO_L[g.priorita]}</Badge>
                    <button className="btn-danger" onClick={()=>handleRemoveGoal(g)}>✕</button>
                  </div>
                  <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                    <span style={{ fontSize:11,color:'var(--t3)' }}>
                      {pct>=100?'✓ raggiunto':cn?`${formatCurrency(cn.contributo)}/mese × ${cn.mesi}m`:`~${mesi===Infinity?'∞':mesi} mesi`}
                    </span>
                    <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--t2)' }}>
                      {formatCurrency(g.corrente)} / {formatCurrency(g.target)} · <span style={{ color:'var(--ac)',fontWeight:600 }}>{pct}%</span>
                    </span>
                  </div>
                  <ProgressBar value={g.corrente} max={g.target} />
                  <div style={{ display:'flex',gap:6,marginTop:7 }}>
                    <input className="input-field" type="number" placeholder="Aggiorna importo €"
                      style={{ fontSize:12,padding:'4px 8px' }}
                      onKeyDown={e=>{ if(e.key==='Enter'){const v=parseFloat(e.target.value);if(!isNaN(v)){updateGoal(g.id,{corrente:v});e.target.value='';showSuccess('Importo aggiornato.')} }}} />
                    <span style={{ fontSize:10,color:'var(--t3)',alignSelf:'center',whiteSpace:'nowrap' }}>↵ salva</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div className="card card-2">
            <div className="label-xs" style={{ marginBottom:10 }}>salvadanaio libero</div>
            <div style={{ fontSize:30,fontFamily:"'DM Mono',monospace",fontWeight:500,letterSpacing:'-.03em',color:'var(--ac)',marginBottom:4 }}>{formatCurrency(salvadanaioLibero)}</div>
            <div style={{ fontSize:11,color:'var(--t3)',marginBottom:14,fontFamily:"'DM Mono',monospace" }}>non vincolato · saldo: {formatCurrency(saldoDisp)}</div>
            <SectionHeader action={<button className="btn-ghost btn-sm" onClick={()=>setDepositFormOpen(f=>!f)}>+ deposita</button>}>deposito</SectionHeader>
            <FormPanel open={depositFormOpen}>
              <div style={{ fontSize:11,color:'var(--t2)',lineHeight:1.6,padding:'5px 8px',background:'var(--sf2)',borderRadius:6 }}>
                Il versamento sarà registrato come spesa (categoria Risparmio) in Finanze.
              </div>
              <InputRow>
                <input className="input-field" type="number" placeholder={`Max ${formatCurrency(saldoDisp)}`} value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} />
                <button className="btn-accent" onClick={handleDeposit}>Deposita</button>
              </InputRow>
            </FormPanel>
            {totale>0&&(
              <div style={{ marginTop:14,paddingTop:12,borderTop:'1px solid var(--bd)' }}>
                <div className="label-xs" style={{ marginBottom:8 }}>ripartizione</div>
                {[...goals,{ id:'libero',nome:'Libero',corrente:salvadanaioLibero }].map((g,i)=>{
                  const pct=totale>0?Math.round(g.corrente/totale*100):0
                  return (
                    <div key={g.id} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:3 }}>
                        <span style={{ fontSize:11,color:'var(--t2)' }}>{g.nome}</span>
                        <span style={{ fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--t2)' }}>{pct}%</span>
                      </div>
                      <div className="progress-track" style={{ height:4 }}>
                        <div className="progress-fill" style={{ width:`${pct}%`,background:PIE_C[i%PIE_C.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card card-3">
            <div className="label-xs" style={{ marginBottom:12 }}>consigli personalizzati</div>
            {suggestions.length===0?<div style={{ textAlign:'center',padding:'20px 0' }}><div style={{ fontSize:24,marginBottom:8,opacity:.3 }}>◎</div><div style={{ fontSize:12,color:'var(--t3)',lineHeight:1.7 }}>Inserisci dati in Finanze e Impostazioni per ricevere consigli calibrati.</div></div>
            :suggestions.map((s,i)=>{
              const st=TYPE_S[s.type]||TYPE_S.info
              return (
                <div key={i} className="suggestion" style={{ background:st.bg,border:`1px solid ${st.border}`,animationDelay:`${i*0.06}s`,transition:'transform .16s,box-shadow .16s' }}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,.06)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='' }}>
                  <div style={{ display:'flex',gap:8 }}>
                    <span style={{ fontSize:13,flexShrink:0,lineHeight:1.4 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:12,fontWeight:600,color:st.color,marginBottom:3 }}>{s.titolo}</div>
                      <div style={{ fontSize:11,color:'var(--t2)',lineHeight:1.65 }}>{s.testo}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
