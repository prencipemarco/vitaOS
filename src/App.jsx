import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import { useImpostazioni } from './hooks/useImpostazioni'
import { GlobalModal } from './components/ui'

const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Calendario    = lazy(() => import('./pages/Calendario'))
const FoglioDiFirme = lazy(() => import('./pages/FoglioDiFirme'))
const Finanze       = lazy(() => import('./pages/Finanze'))
const Risparmi      = lazy(() => import('./pages/Risparmi'))
const Studio        = lazy(() => import('./pages/Studio'))
const Salute        = lazy(() => import('./pages/Salute'))
const Abitudini     = lazy(() => import('./pages/Abitudini'))
const Note          = lazy(() => import('./pages/Note'))
const Impostazioni  = lazy(() => import('./pages/Impostazioni'))

function Loader() {
  return (
    <div style={{
      display:'flex',alignItems:'center',justifyContent:'center',
      height:'60vh',color:'var(--t3)',fontFamily:"'DM Mono',monospace",fontSize:13
    }}>
      caricamento...
    </div>
  )
}

function AppInner() {
  const { settings, update } = useImpostazioni()
  const theme = settings.theme || 'light'

  useEffect(() => {
    const applyTheme = (t) => {
      const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }
    applyTheme(theme)
    
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = (e) => document.documentElement.classList.toggle('dark', e.matches)
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : (theme === 'dark' ? 'system' : 'light')
    update('theme', next)
  }

  return (
    <div style={{ minHeight:'100vh' }}>
      <Sidebar theme={theme} onToggleTheme={toggleTheme} userName={settings.name} />
      <main style={{ marginLeft:200,minHeight:'100vh',overflowX:'hidden' }}>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/calendario"    element={<Calendario />} />
            <Route path="/firme"         element={<FoglioDiFirme />} />
            <Route path="/finanze"       element={<Finanze />} />
            <Route path="/risparmi"      element={<Risparmi />} />
            <Route path="/studio"        element={<Studio />} />
            <Route path="/salute"        element={<Salute />} />
            <Route path="/abitudini"     element={<Abitudini />} />
            <Route path="/note"          element={<Note />} />
            <Route path="/impostazioni"  element={<Impostazioni />} />
          </Routes>
        </Suspense>
      </main>
      <GlobalModal />
    </div>
  )
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>
}
