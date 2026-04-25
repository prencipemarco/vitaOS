import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const Svg = ({ d, size=14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink:0 }}>
    <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const ICONS = {
  overview: "M1.5 1.5h4v4h-4zM8.5 1.5h4v4h-4zM1.5 8.5h4v4h-4zM8.5 8.5h4v4h-4z",
  calendar: "M1 4.5h12M4 1v2.5M10 1v2.5M2.5 2h9A1.5 1.5 0 0113 3.5v8A1.5 1.5 0 0111.5 13h-9A1.5 1.5 0 011 11.5v-8A1.5 1.5 0 012.5 2z",
  clock:    "M7 1a6 6 0 100 12A6 6 0 007 1zM7 4v3.5l2.5 1.5",
  wallet:   "M1.5 3.5h11A.5.5 0 0113 4v7.5A1.5 1.5 0 0111.5 13h-9A1.5 1.5 0 011 11.5V4a.5.5 0 01.5-.5zM1 7h12M10 10h.5",
  savings:  "M7 1a6 6 0 100 12A6 6 0 007 1zM7 3.5v.5M7 10v.5M9.5 5.5C9.5 4.4 8.4 4 7 4S4.5 4.7 4.5 5.5 5.6 7 7 7s2.5.7 2.5 1.5S8.4 10 7 10s-2.5-.7-2.5-1.5",
  study:    "M1 3l6-2 6 2v5c0 2.5-2.5 4.5-6 5-3.5-.5-6-2.5-6-5V3zM7 6v3M5.5 7.5h3",
  health:   "M7 12.5S1.5 9 1.5 5a2.5 2.5 0 015-0c.3-.7 1-1.2 1.5-1.2.5 0 1.2.5 1.5 1.2a2.5 2.5 0 015 0c0 4-5.5 7.5-5.5 7.5z",
  settings: "M7 5a2 2 0 100 4 2 2 0 000-4zM7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M11.4 2.6l-1 1M3.6 10.4l-1 1",
}

const NAV = [
  { to:'/',             label:'Overview',      icon:'overview', end:true },
  { to:'/calendario',   label:'Calendario',    icon:'calendar'       },
  { to:'/firme',        label:'Foglio Firme',  icon:'clock'          },
  { to:'/finanze',      label:'Finanze',       icon:'wallet'         },
  { to:'/risparmi',     label:'Risparmi',      icon:'savings'        },
  { to:'/studio',       label:'Studio',        icon:'study'          },
  { to:'/salute',       label:'Salute',        icon:'health'         },
]

export default function Sidebar({ theme, onToggleTheme, userName }) {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
  const dateStr = time.toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'short' })

  return (
    <aside style={{
      position:'fixed',left:0,top:0,height:'100vh',width:200,
      background:'var(--sf)',borderRight:'1px solid var(--bd)',
      display:'flex',flexDirection:'column',zIndex:100,
      transition:'background .22s,border-color .22s',
    }}>
      {/* Brand + clock + theme toggle */}
      <div style={{ padding:'18px 18px 16px', borderBottom:'1px solid var(--bd)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
          <span style={{ fontSize:15,fontWeight:700,letterSpacing:'-.03em',color:'var(--t1)' }}>
            vita<span style={{ color:'var(--ac)' }}>OS</span>
          </span>
          <button onClick={onToggleTheme} title="Cambia tema"
            style={{ width:34,height:19,borderRadius:10,border:'1px solid var(--bd2)',background:'var(--sf2)',cursor:'pointer',position:'relative',padding:0,transition:'background .2s' }}>
            <span style={{ position:'absolute',left:2,top:2,width:13,height:13,background:'var(--ac)',borderRadius:'50%',transition:'transform .22s cubic-bezier(.4,0,.2,1)',display:'block',transform:theme==='dark'?'translateX(15px)':'translateX(0)' }} />
          </button>
        </div>
        <div style={{ fontFamily:"'DM Mono',monospace" }}>
          <div style={{ fontSize:17,fontWeight:500,color:'var(--t1)',letterSpacing:'-.01em',lineHeight:1 }}>{timeStr}</div>
          <div style={{ fontSize:11,color:'var(--t2)',marginTop:3 }}>{dateStr}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:'10px 0',flex:1,overflowY:'auto' }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => `nav-link${isActive?' active':''}`}
          >
            <Svg d={ICONS[item.icon]} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user info + settings gear */}
      <div style={{ borderTop:'1px solid var(--bd)', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:11,color:'var(--t2)',fontFamily:"'DM Mono',monospace",lineHeight:1.7 }}>
          <div style={{ color:'var(--t1)',fontWeight:500,fontSize:12 }}>{userName||'vitaOS'}</div>
          <span style={{ color:'var(--ac)',fontSize:10 }}>● attivo</span>
        </div>
        <NavLink to="/impostazioni"
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
          style={{ padding:'7px',borderRadius:8,border:'1px solid var(--bd)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--t2)',textDecoration:'none' }}
          title="Impostazioni"
        >
          <Svg d={ICONS.settings} size={14} />
        </NavLink>
      </div>
    </aside>
  )
}
