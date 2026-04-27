import { useState, useEffect, useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import '/node_modules/react-grid-layout/css/styles.css'
import '/node_modules/react-resizable/css/styles.css'
import { useCalendario, TIPI_EVENTO } from '../hooks/useCalendario'
import { useFinanze } from '../hooks/useFinanze'
import { useRisparmi } from '../hooks/useRisparmi'
import { useFirme } from '../hooks/useFirme'
import { useImpostazioni } from '../hooks/useImpostazioni'
import { useStudio, TIPI_CORSO } from '../hooks/useStudio'
import { useSalute, TIPI_GIORNO } from '../hooks/useSalute'
import { useHabits } from '../hooks/useHabits'
import { useNotes } from '../hooks/useNotes'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { PageHeader, showConfirm, showSuccess } from '../components/ui'
import { todayStr } from '../utils/dateHelpers'
import { WIDGET_TYPES, renderWidget } from '../components/dashboard/WidgetRegistry'

const ResponsiveGridLayout = WidthProvider(Responsive)

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'saldo', x: 0, y: 0, w: 3, h: 2 },
    { i: 'lavoro', x: 3, y: 0, w: 3, h: 2 },
    { i: 'agenda', x: 6, y: 0, w: 3, h: 4 },
    { i: 'bilancio_chart', x: 0, y: 2, w: 6, h: 4 },
    { i: 'radar', x: 9, y: 0, w: 3, h: 4 },
    { i: 'abitudini', x: 0, y: 6, w: 4, h: 3 },
    { i: 'note', x: 4, y: 6, w: 4, h: 3 },
  ]
}

export default function Dashboard() {
  const [layouts, setLayouts] = useLocalStorage('wl_dashboard_layout', DEFAULT_LAYOUTS)
  const [editMode, setEditMode] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Data fetching (all modules)
  const { eventsForDate } = useCalendario()
  const { riepilogo, andamentoMesi, totalePrevisteMese } = useFinanze()
  const { goals, totaleRisparmi } = useRisparmi()
  const { totaleOre } = useFirme()
  const { settings, tariffaCalcolata, reddtitoMedioMensile, getPalestraBlockGiorno, oreContrattualiMensili } = useImpostazioni()
  const { corsi, getStats, getTodayTasks, getLateTasksCount, completeTask } = useStudio()
  const { scheda: schedaSalute, getSessioneOggi, getStatsGenerali: getSaluteStats } = useSalute()
  const { habits, toggleHabit, getTodayScore } = useHabits()
  const { notes } = useNotes()

  const now = new Date()
  const today = todayStr()
  const todayCalEvents = eventsForDate(today)
  const fin = riepilogo(now.getFullYear(), now.getMonth())
  const previste = totalePrevisteMese(now.getFullYear(), now.getMonth())
  const chartData = andamentoMesi()
  const ore = totaleOre(now.getFullYear(), now.getMonth())
  const rate = tariffaCalcolata()
  const stimate = rate > 0 ? Math.round(ore * rate * 100) / 100 : 0
  const redditoMedio = reddtitoMedioMensile()
  const studyToday = getTodayTasks()
  const lateCount = getLateTasksCount()
  const saluteStats = getSaluteStats()

  // Unified agenda
  const agendaItems = useMemo(() => [
    ...todayCalEvents.map(ev => ({ id: `ev-${ev.id}`, title: ev.titolo, color: TIPI_EVENTO[ev.tipo]?.color || '#888', ora: ev.ora || '' })),
    ...studyToday.map(t => ({ id: `st-${t.id}`, title: t.titolo, color: '#7A5FA0', ora: t.oraPianificata || '' })),
  ], [todayCalEvents, studyToday])

  const balanceData = [
    { subject: 'Lavoro', A: Math.min(100, ore > 0 ? (ore / (oreContrattualiMensili() || 160) * 100) : 0) },
    { subject: 'Salute', A: Math.min(100, (saluteStats.thisMonth / 12) * 100) },
    { subject: 'Studio', A: 70 }, // Placeholder for brevity
    { subject: 'Finanze', A: Math.min(100, redditoMedio > 0 ? (Math.max(0, fin.netto) / redditoMedio * 100) : 0) },
    { subject: 'Abitudini', A: getTodayScore() },
  ]

  const widgetData = {
    fin, ore, stimate, rate, goals, saluteStats, corsi, getStats, 
    agendaItems, balanceData, habits, toggleHabit, getTodayScore,
    notes, chartData, settings, completeTask, getTodayTasks, getLateTasksCount
  }

  const handleLayoutChange = (current, all) => {
    if (!editMode) return
    const filtered = {}
    Object.keys(all).forEach(bp => {
      filtered[bp] = all[bp].filter(w => w.i !== 'add_button')
    })
    setLayouts(filtered)
  }

  const removeWidget = (id) => {
    const newLayouts = {}
    Object.keys(layouts).forEach(bp => {
      newLayouts[bp] = layouts[bp].filter(w => w.i !== id)
    })
    setLayouts(newLayouts)
  }

  const addWidget = (type) => {
    const id = `${type}_${Date.now()}`
    const newItem = { i: id, x: 0, y: Infinity, w: 3, h: 2 }
    const newLayouts = { ...layouts }
    Object.keys(layouts).forEach(bp => {
      newLayouts[bp] = [...layouts[bp], newItem]
    })
    setLayouts(newLayouts)
    setIsAdding(false)
    showSuccess('Widget aggiunto')
  }

  const getSizeLabel = (w, h) => {
    if (w >= 6) return 'L'
    if (w >= 3) return 'M'
    return 'S'
  }

  const dateLabel = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  const currentLayouts = useMemo(() => {
    if (!editMode) return layouts
    const newL = { ...layouts }
    Object.keys(newL).forEach(bp => {
      newL[bp] = [...newL[bp], { i: 'add_button', x: 0, y: Infinity, w: 2, h: 2, static: false }]
    })
    return newL
  }, [layouts, editMode])

  return (
    <div style={{ padding: 28, animation: 'fadeUp .24s ease both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <PageHeader label="dashboard" title={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn-ghost ${editMode ? 'active' : ''}`} onClick={() => setEditMode(!editMode)}>
            {editMode ? '💾 Salva Layout' : '⚙ Personalizza'}
          </button>
        </div>
      </div>

      <ResponsiveGridLayout
        className={`layout ${editMode ? 'edit-mode-active' : ''}`}
        layouts={currentLayouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={40}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={handleLayoutChange}
        isDraggable={editMode}
        isResizable={editMode}
        margin={[12, 12]}
      >
        {currentLayouts.lg.map(w => (
          w.i === 'add_button' ? (
            <div key="add_button" className="card" 
              style={{ 
                display:'flex', alignItems:'center', justifyContent:'center', 
                border:'2px dashed var(--ac)', background:'var(--ac-bg)', cursor:'pointer' 
              }}
              onClick={() => setIsAdding(true)}
            >
              <div style={{ fontSize:32, color:'var(--ac)' }}>+</div>
            </div>
          ) : (
            <div key={w.i} className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column' }}>
              {editMode && (
                <div className="widget-actions">
                  <div className="widget-drag-handle" style={{ cursor: 'grab', padding: '2px 6px', background: 'var(--sf2)', borderRadius: 4, fontSize: 10 }}>Drag</div>
                  <button onClick={() => removeWidget(w.i)} style={{ border: 'none', background: 'var(--rd)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>✕</button>
                </div>
              )}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {renderWidget(w.i.split('_')[0], getSizeLabel(w.w, w.h), widgetData)}
              </div>
            </div>
          )
        ))}
      </ResponsiveGridLayout>

      {/* Add Widget Modal */}
      {isAdding && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: 400, padding: 24 }}>
            <div className="label-xs" style={{ marginBottom:16 }}>Scegli Widget</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(WIDGET_TYPES).map(([key, type]) => (
                <button key={type} className="btn-ghost" onClick={() => addWidget(type)} style={{ textAlign: 'left', padding: 12 }}>
                  {key.replace('_', ' ')}
                </button>
              ))}
            </div>
            <button className="btn-accent" onClick={() => setIsAdding(false)} style={{ marginTop: 20, width: '100%' }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
