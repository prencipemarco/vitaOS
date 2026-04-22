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
const Impostazioni  = lazy(() => import('./pages/Impostazioni'))
const Studio        = lazy(() => import('./pages/Studio'))

function Loader() {
  return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--t3)',fontFamily:"'DM Mono',monospace",fontSize:13 }}>caricamento...</div>
}

function AppInner() {
  const { settings, update } = useImpostazioni()
  const theme = settings.theme || 'light'
  useEffect(() => { document.documentElement.classList.toggle('dark', theme==='dark') }, [theme])
  const toggleTheme = () => update('theme', theme==='light'?'dark':'light')
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
