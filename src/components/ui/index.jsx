import { useState, useEffect } from 'react'

/* ─── StatCard ─── */
export function StatCard({ label, value, sub, accent, style }) {
  return (
    <div className="card" style={style}>
      <div className="label-xs" style={{ marginBottom:7 }}>{label}</div>
      <div className="stat-val" style={accent?{ color:'var(--ac)' }:{}}>{value}</div>
      {sub && <div style={{ fontSize:11,color:'var(--t3)',marginTop:5,fontFamily:"'DM Mono',monospace" }}>{sub}</div>}
    </div>
  )
}

/* ─── SectionHeader ─── */
export function SectionHeader({ children, action }) {
  return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
      <div className="label-xs" style={{ margin:0 }}>{children}</div>
      {action}
    </div>
  )
}

/* ─── FormPanel ─── */
export function FormPanel({ open, children }) {
  if (!open) return null
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:7,paddingTop:12,marginTop:10,borderTop:'1px solid var(--bd)',animation:'slideDown .18s ease both' }}>
      {children}
    </div>
  )
}

/* ─── InputRow ─── */
export function InputRow({ children }) {
  return <div style={{ display:'flex',gap:7 }}>{children}</div>
}

/* ─── ProgressBar ─── */
export function ProgressBar({ value, max, color }) {
  const pct = Math.min(100, max>0 ? Math.round((value/max)*100) : 0)
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width:`${pct}%`, ...(color?{ background:color }:{}) }} />
    </div>
  )
}

/* ─── RowItem ─── */
export function RowItem({ left, right, onDelete, style }) {
  return (
    <div className="row-item" style={style}>
      {left}
      <span style={{ flex:1 }} />
      {right}
      {onDelete && <button className="btn-danger" onClick={onDelete} style={{ padding:'2px 8px',fontSize:11 }}>✕</button>}
    </div>
  )
}

/* ─── Badge ─── */
export function Badge({ color='#888', children }) {
  return (
    <span style={{ fontSize:10,padding:'2px 8px',borderRadius:20,background:color+'22',color,fontWeight:600,letterSpacing:'.04em',whiteSpace:'nowrap' }}>
      {children}
    </span>
  )
}

/* ─── EmptyState ─── */
export function EmptyState({ message='Nessun dato' }) {
  return (
    <div style={{ textAlign:'center',padding:'24px 0',color:'var(--t3)',fontSize:13 }}>
      {message}
    </div>
  )
}

/* ─── Dot ─── */
export function Dot({ color }) {
  return <span className="dot-cat" style={{ background:color }} />
}

/* ─── Grid ─── */
export function Grid({ cols=3, gap=10, children, style }) {
  return (
    <div style={{ display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap,...style }}>
      {children}
    </div>
  )
}

/* ─── PageHeader ─── */
export function PageHeader({ label, title }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div className="label-xs" style={{ marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20,fontWeight:700,letterSpacing:'-.02em' }}>{title}</div>
    </div>
  )
}

/* ─── MonthNav ─── */
export function MonthNav({ year, month, onChange }) {
  const M = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
  const prev = () => month===0?onChange(year-1,11):onChange(year,month-1)
  const next = () => month===11?onChange(year+1,0):onChange(year,month+1)
  return (
    <div style={{ display:'flex',alignItems:'center',gap:6 }}>
      <button className="btn-ghost btn-sm" onClick={prev} style={{ padding:'4px 9px' }}>‹</button>
      <span style={{ fontSize:13,fontWeight:600,minWidth:80,textAlign:'center' }}>{M[month]} {year}</span>
      <button className="btn-ghost btn-sm" onClick={next} style={{ padding:'4px 9px' }}>›</button>
    </div>
  )
}

/* ─── Global Modal (error + confirm) ─── */
let _showModal = null
export function _registerModal(fn) { _showModal = fn }

export function showError(message) {
  if (_showModal) _showModal({ type:'error', message })
}
export function showConfirm(message, onConfirm, onCancel) {
  if (_showModal) _showModal({ type:'confirm', message, onConfirm, onCancel })
}
export function showSuccess(message) {
  if (_showModal) _showModal({ type:'success', message })
}

export function GlobalModal() {
  const [state, setState] = useState(null)

  useEffect(() => {
    _registerModal(s => setState(s))
    return () => _registerModal(null)
  }, [])

  if (!state) return null

  const close = () => setState(null)
  const isError   = state.type === 'error'
  const isSuccess = state.type === 'success'
  const isConfirm = state.type === 'confirm'

  const accentColor = isError ? 'var(--rd)' : isSuccess ? 'var(--go)' : 'var(--ac)'
  const icon = isError ? '⚠' : isSuccess ? '✓' : '?'

  return (
    <div
      onClick={e => { if(e.target===e.currentTarget){ if(isConfirm&&state.onCancel) state.onCancel(); close() } }}
      style={{
        position:'fixed',inset:0,zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',
        background:'rgba(0,0,0,.35)',
        animation:'fadeIn .16s ease',
        backdropFilter:'blur(3px)',
      }}
    >
      <div style={{
        background:'var(--sf)',border:'1px solid var(--bd2)',borderRadius:14,
        padding:'28px 32px',maxWidth:400,width:'90%',
        boxShadow:'0 20px 60px rgba(0,0,0,.2)',
        animation:'cardIn .2s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ textAlign:'center',marginBottom:20 }}>
          <div style={{ fontSize:32,marginBottom:12 }}>{icon}</div>
          <div style={{ fontSize:15,fontWeight:600,color:'var(--t1)',lineHeight:1.5 }}>{state.message}</div>
        </div>

        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          {isConfirm && (
            <>
              <button className="btn-ghost" onClick={() => { if(state.onCancel) state.onCancel(); close() }} style={{ minWidth:90 }}>
                Annulla
              </button>
              <button
                className="btn-accent"
                style={{ minWidth:90, ...(isError?{ background:'var(--rd)',borderColor:'var(--rd)' }:{}) }}
                onClick={() => { if(state.onConfirm) state.onConfirm(); close() }}
              >
                Conferma
              </button>
            </>
          )}
          {(isError || isSuccess) && (
            <button className="btn-accent" onClick={close} style={{ minWidth:110, background:accentColor, borderColor:accentColor }}>
              {isError ? 'Capito' : 'OK'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
