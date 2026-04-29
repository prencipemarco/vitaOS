// src/App.jsx
import { useEffect, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import { useImpostazioni } from './hooks/useImpostazioni'
import { GlobalModal, SkeletonPage } from './components/ui'
import { useIsMobile } from './hooks/useMediaQuery'

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
  return <SkeletonPage />
}

// Hamburger button visibile solo su mobile
function HamburgerBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Apri menu"
      style={{
        position: 'fixed',
        top: 14,
        left: 14,
        zIndex: 97,
        width: 38,
        height: 38,
        borderRadius: 10,
        border: '1px solid var(--bd2)',
        background: 'var(--sf)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        boxShadow: '0 2px 8px rgba(0,0,0,.1)',
        transition: 'all .16s',
      }}
    >
      {[0,1,2].map(i => (
        <span key={i} style={{ display:'block', width:16, height:1.5, background:'var(--t1)', borderRadius:1 }} />
      ))}
    </button>
  )
}

function AppInner() {
  const { settings, update } = useImpostazioni()
  const theme = settings.theme || 'light'
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    <div style={{ minHeight: '100vh' }}>
      {/* Hamburger su mobile */}
      {isMobile && <HamburgerBtn onClick={() => setSidebarOpen(true)} />}

      <Sidebar
        theme={theme}
        onToggleTheme={toggleTheme}
        userName={settings.name}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <main style={{
        marginLeft: isMobile ? 0 : 200,
        minHeight: '100vh',
        overflowX: 'hidden',
      }}>
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