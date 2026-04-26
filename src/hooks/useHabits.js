import { useLocalStorage } from './useLocalStorage'

/**
 * useHabits.js
 * Gestisce le abitudini quotidiane (Habit Tracker).
 * Struttura dati:
 * habits: [
 *   { id, nome, icona, colore, creatoIl, frequenza: 'giornaliera', completati: { 'YYYY-MM-DD': true } }
 * ]
 */

export function useHabits() {
  const [habits, setHabits] = useLocalStorage('wl_habits', [])

  const addHabit = (habit) => {
    const newHabit = {
      id: Date.now().toString(),
      nome: habit.nome || 'Nuova abitudine',
      icona: habit.icona || '✨',
      colore: habit.colore || 'var(--ac)',
      creatoIl: new Date().toISOString(),
      frequenza: 'giornaliera',
      completati: {}
    }
    setHabits([...habits, newHabit])
  }

  const removeHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id))
  }

  const toggleHabit = (id, dateStr) => {
    setHabits(habits.map(h => {
      if (h.id !== id) return h
      const newCompletati = { ...h.completati }
      if (newCompletati[dateStr]) {
        delete newCompletati[dateStr]
      } else {
        newCompletati[dateStr] = true
      }
      return { ...h, completati: newCompletati }
    }))
  }

  const getStats = (id) => {
    const h = habits.find(h => h.id === id)
    if (!h) return { total: 0, streak: 0 }
    
    const dates = Object.keys(h.completati).sort((a, b) => new Date(b) - new Date(a))
    let streak = 0
    let today = new Date().toISOString().split('T')[0]
    let yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    // Simple streak calculation
    let checkDate = h.completati[today] ? today : (h.completati[yesterday] ? yesterday : null)
    if (checkDate) {
      let current = new Date(checkDate)
      while (h.completati[current.toISOString().split('T')[0]]) {
        streak++
        current.setDate(current.getDate() - 1)
      }
    }

    return {
      total: dates.length,
      streak
    }
  }

  const getTodayScore = () => {
    if (habits.length === 0) return 0
    const today = new Date().toISOString().split('T')[0]
    const done = habits.filter(h => h.completati[today]).length
    return Math.round((done / habits.length) * 100)
  }

  return {
    habits,
    addHabit,
    removeHabit,
    toggleHabit,
    getStats,
    getTodayScore
  }
}
