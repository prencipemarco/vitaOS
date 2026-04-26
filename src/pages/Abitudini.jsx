import { useState } from 'react'
import { useHabits } from '../hooks/useHabits'
import { PageHeader, EmptyState, SectionHeader, showConfirm, showSuccess } from '../components/ui'
import { toDateStr } from '../utils/dateHelpers'

const COLORS = ['#E67E22', '#3498DB', '#2ECC71', '#9B59B6', '#F1C40F', '#E74C3C', '#1ABC9C']
const ICONS = ['💧', '📖', '🧘', '🚶', '🍎', '💤', '💻', '🎨', '🧹', '🌱', '✍️', '🏃']

export default function Abitudini() {
  const { habits, addHabit, removeHabit, toggleHabit, getStats, getTodayScore } = useHabits()
  const [isAdding, setIsAdding] = useState(false)
  const [newHabit, setNewHabit] = useState({ nome: '', icona: '✨', colore: COLORS[0] })

  const today = toDateStr(new Date())
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return toDateStr(d)
  })

  const handleAdd = () => {
    if (!newHabit.nome.trim()) return
    addHabit(newHabit)
    setNewHabit({ nome: '', icona: '✨', colore: COLORS[0] })
    setIsAdding(false)
    showSuccess('Abitudine aggiunta!')
  }

  const score = getTodayScore()

  return (
    <div style={{ padding: 28, animation: 'fadeUp .24s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <PageHeader label="consistenza quotidiana" title="Abitudini" />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4, textTransform: 'uppercase' }}>progresso oggi</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ac)', fontFamily: "'DM Mono',monospace" }}>{score}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div>
          <SectionHeader action={
            <button className="btn-accent" onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? 'Annulla' : '+ Nuova Abitudine'}
            </button>
          }>
            Le tue abitudini
          </SectionHeader>

          {isAdding && (
            <div className="card" style={{ marginBottom: 20, animation: 'slideDown .2s ease' }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input 
                  className="input-field" 
                  placeholder="Cosa vuoi tracciare? (es. Bere 2L acqua)" 
                  value={newHabit.nome}
                  onChange={e => setNewHabit({...newHabit, nome: e.target.value})}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="label-xs" style={{ marginBottom: 8 }}>Scegli un'icona</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ICONS.map(icon => (
                    <button 
                      key={icon}
                      onClick={() => setNewHabit({...newHabit, icona: icon})}
                      style={{ 
                        padding: 8, fontSize: 20, borderRadius: 8, border: '1px solid var(--bd)',
                        background: newHabit.icona === icon ? 'var(--sf2)' : 'transparent',
                        borderColor: newHabit.icona === icon ? 'var(--ac)' : 'var(--bd)',
                        cursor: 'pointer'
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="label-xs" style={{ marginBottom: 8 }}>Scegli un colore</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {COLORS.map(color => (
                    <button 
                      key={color}
                      onClick={() => setNewHabit({...newHabit, colore: color})}
                      style={{ 
                        width: 24, height: 24, borderRadius: '50%', border: '2px solid transparent',
                        background: color,
                        borderColor: newHabit.colore === color ? 'var(--t1)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <button className="btn-accent" style={{ width: '100%' }} onClick={handleAdd}>Salva Abitudine</button>
            </div>
          )}

          {habits.length === 0 ? (
            <EmptyState message="Nessuna abitudine impostata. Inizia ora per costruire la tua routine!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {habits.map(h => {
                const stats = getStats(h.id)
                return (
                  <div key={h.id} className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                      <div style={{ 
                        width: 48, height: 48, borderRadius: 12, background: h.colore + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                      }}>
                        {h.icona}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{h.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                          Streak: <span style={{ color: h.colore, fontWeight: 700 }}>{stats.streak} gg</span> · Totale: {stats.total}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 6 }}>
                        {last7Days.map(date => {
                          const isDone = h.completati[date]
                          const isToday = date === today
                          return (
                            <button
                              key={date}
                              onClick={() => toggleHabit(h.id, date)}
                              style={{
                                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bd)',
                                background: isDone ? h.colore : 'var(--sf)',
                                borderColor: isDone ? h.colore : (isToday ? 'var(--ac)' : 'var(--bd)'),
                                color: isDone ? '#fff' : 'var(--t3)',
                                fontSize: 10, cursor: 'pointer', transition: 'all .1s',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {isDone ? '✓' : date.split('-')[2]}
                            </button>
                          )
                        })}
                      </div>

                      <button className="btn-danger" style={{ padding: 8 }} onClick={() => showConfirm(`Eliminare "${h.nome}"?`, () => removeHabit(h.id))}>✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <SectionHeader>Analisi Settimanale</SectionHeader>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
              La costanza è più importante della perfezione. Cerca di non saltare mai due giorni di fila lo stesso impegno.
            </div>
            
            <div style={{ marginTop: 24 }}>
              <div className="label-xs" style={{ marginBottom:12 }}>intensità routine</div>
              <div style={{ height: 160, display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 20 }}>
                {last7Days.map(date => {
                  const dayDone = habits.filter(h => h.completati[date]).length
                  const pct = habits.length > 0 ? (dayDone / habits.length) * 100 : 0
                  return (
                    <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ 
                        width: '100%', background: 'var(--ac)', borderRadius: '4px 4px 0 0',
                        height: `${Math.max(5, pct)}%`, opacity: pct > 0 ? (pct/100) : 0.1,
                        transition: 'height .3s ease'
                      }} />
                      <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: "'DM Mono',monospace" }}>{date.split('-')[2]}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: 20, padding: '12px', background: 'var(--sf2)', borderRadius: 8, fontSize: 12 }}>
              💡 <strong>Consiglio:</strong> Associa una nuova abitudine a una già consolidata per aumentare le probabilità di successo.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
