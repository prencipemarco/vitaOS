/**
 * algoritmoRisparmi.js
 * Core savings allocation engine.
 * Rule: never suggest more than 55% of available surplus for saving.
 * Always maintain a liquidity buffer for unexpected expenses.
 */
export const PRIORITA = { alta: 3, media: 2, bassa: 1 }
export const MAX_SAVINGS_RATIO = 0.55 // never exceed 55% of surplus

export function allocaSurplus(surplus, goals) {
  if (surplus <= 0 || !goals.length) return goals.map(g => ({ ...g, allocato: 0 }))
  const cappedSurplus = surplus * MAX_SAVINGS_RATIO
  const sorted = [...goals].sort((a, b) => PRIORITA[b.priorita] - PRIORITA[a.priorita])
  let remaining = cappedSurplus
  const result = sorted.map(g => ({ ...g, allocato: 0 }))
  const highPriority = result.filter(g => g.priorita === 'alta' && g.corrente < g.target)
  const phase1Cap = cappedSurplus * 0.5
  highPriority.forEach(g => {
    const needed = g.target - g.corrente
    const give = Math.min(needed, phase1Cap / Math.max(1, highPriority.length), remaining)
    g.allocato += give
    remaining -= give
  })
  const needsMore = result.filter(g => g.corrente + g.allocato < g.target)
  if (needsMore.length && remaining > 0) {
    const totalNeeded = needsMore.reduce((s, g) => s + (g.target - g.corrente - g.allocato), 0)
    needsMore.forEach(g => {
      const share = ((g.target - g.corrente - g.allocato) / totalNeeded) * remaining
      g.allocato += share
    })
  }
  return result.map(g => ({ ...g, allocato: Math.round(g.allocato * 100) / 100 }))
}

export function proiezioneAnnuale(correnteLibero, contributoMensile) {
  return Array.from({ length: 12 }, (_, i) => ({
    mese: i + 1,
    semplice: Math.round(correnteLibero + contributoMensile * (i + 1)),
  }))
}

// Compound growth formula: FV = P*(1+r)^n + PMT*((1+r)^n - 1)/r
export function proiezioneConInvestimento(correnteLibero, contributoMensile, tassoAnnuo) {
  const r = tassoAnnuo / 100 / 12
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const semplice = Math.round(correnteLibero + contributoMensile * n)
    const investito = r === 0
      ? semplice
      : Math.round(correnteLibero * Math.pow(1 + r, n) + (contributoMensile * (Math.pow(1 + r, n) - 1)) / r)
    return { mese: n, semplice, investito }
  })
}

export function mesiAlTraguardo(corrente, target, contributoMensile) {
  if (corrente >= target) return 0
  if (contributoMensile <= 0) return Infinity
  return Math.ceil((target - corrente) / contributoMensile)
}
