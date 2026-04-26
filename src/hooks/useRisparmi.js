import { useLocalStorage } from './useLocalStorage'
import { allocaSurplus, proiezioneConInvestimento, mesiAlTraguardo, MAX_SAVINGS_RATIO } from '../utils/algoritmoRisparmi'

export function useRisparmi() {
  const [goals, setGoals] = useLocalStorage('wl_risparmi_goals', [])
  const [salvadanaioLibero, setSalvadanaio] = useLocalStorage('wl_salvadanaio', 0)

  const addGoal = (goal) => {
    const id = Date.now()
    setGoals(prev => [...prev, {
      ...goal, id,
      corrente: Number(goal.corrente) || 0,
      target: Number(goal.target),
      scadenza: goal.scadenza || null, // YYYY-MM-DD
    }])
  }

  const removeGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id))

  const updateGoal = (id, patch) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))

  const depositaLibero = (importo) =>
    setSalvadanaio(prev => Math.round((prev + importo) * 100) / 100)

  const distribuisciSurplus = (surplus) => {
    const allocati = allocaSurplus(surplus, goals)
    setGoals(prev => prev.map(g => {
      const a = allocati.find(x => x.id === g.id)
      return a ? { ...g, corrente: Math.round((g.corrente + a.allocato)*100)/100 } : g
    }))
    const used = allocati.reduce((s, g) => s + g.allocato, 0)
    const resto = surplus - used
    if (resto > 0) setSalvadanaio(prev => Math.round((prev + resto)*100)/100)
    return allocati
  }

  const getProiezione = (contributoMensile, tasso = 0) =>
    proiezioneConInvestimento(salvadanaioLibero, contributoMensile, tasso)

  const getMesiAlTraguardo = (goalId, contributo) => {
    const g = goals.find(x => x.id === goalId)
    return g ? mesiAlTraguardo(g.corrente, g.target, contributo) : null
  }

  // Per goal con scadenza: calcola contributo mensile necessario
  const contributoNecessario = (goalId) => {
    const g = goals.find(x => x.id === goalId)
    if (!g || !g.scadenza) return null
    const now = new Date()
    const scad = new Date(g.scadenza + 'T12:00')
    const mesi = Math.max(1,
      (scad.getFullYear() - now.getFullYear()) * 12 + (scad.getMonth() - now.getMonth())
    )
    const mancante = Math.max(0, g.target - g.corrente)
    return { mesi, contributo: Math.round((mancante / mesi) * 100) / 100, mancante }
  }

  const totaleRisparmi = () =>
    goals.reduce((s, g) => s + g.corrente, 0) + salvadanaioLibero

  return {
    goals, salvadanaioLibero,
    addGoal, removeGoal, updateGoal,
    depositaLibero, distribuisciSurplus,
    getProiezione, getMesiAlTraguardo, contributoNecessario, totaleRisparmi,
    MAX_SAVINGS_RATIO,
  }
}
