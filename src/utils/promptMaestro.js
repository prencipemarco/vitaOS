/**
 * promptMaestro.js
 * Generates the AI prompt for course decomposition.
 * Returns STRICT JSON schema — no free text, no markdown.
 */

export const CORSO_SCHEMA_EXAMPLE = {
  corso: {
    nome: "Analisi Matematica II",
    tipo: "universita",
    dataEsame: "2026-06-15",
    priorita: "alta",
    difficoltaPercepita: 4,
    oreTotaliStimate: 80,
    note: "Esame scritto + orale"
  },
  moduli: [
    {
      id: "m1",
      titolo: "Limiti e Continuità",
      ordine: 1,
      dipendeDa: [],
      oreStimate: 10,
      task: [
        { id: "t1_1", titolo: "Teoria: definizione ε-δ di limite", tipo: "teoria", durata_minuti: 60 },
        { id: "t1_2", titolo: "Esercizi: calcolo limiti notevoli", tipo: "esercizi", durata_minuti: 90 },
        { id: "t1_3", titolo: "Ripasso e autovalutazione modulo", tipo: "ripasso", durata_minuti: 30 }
      ]
    }
  ]
}

export function buildPromptMaestro(testoSyllabus, tipoCorso = 'universita') {
  return `Sei un esperto pianificatore di studio. Analizza il seguente programma di corso e restituisci ESCLUSIVAMENTE un oggetto JSON valido, senza nessun testo aggiuntivo, senza markdown, senza backtick.

TIPO DI CORSO: ${tipoCorso === 'universita' ? 'Esame universitario' : tipoCorso === 'certificazione' ? 'Certificazione professionale' : 'Studio libero'}

PROGRAMMA DEL CORSO:
${testoSyllabus}

ISTRUZIONI PRECISE:
1. Decompondi il programma in moduli logici (massimo 12, minimo 2), ognuno con task specifici.
2. Per ogni task indica: titolo chiaro, tipo (teoria/esercizi/ripasso/simulazione_esame), durata stimata in minuti (25-120).
3. Stima le ore totali in modo REALISTICO considerando la complessità del materiale.
4. Il campo "dipendeDa" deve contenere gli id dei moduli prerequisito (array vuoto se nessuno).
5. L'ordine dei moduli deve rispettare la progressione logica di apprendimento.
6. difficoltaPercepita: da 1 (molto facile) a 5 (molto difficile).
7. Se la data dell'esame è menzionata nel testo, estraila in formato YYYY-MM-DD; altrimenti usa null.
8. Aggiungi SEMPRE un task finale di tipo "simulazione_esame" nell'ultimo modulo.

SCHEMA JSON DA RISPETTARE ESATTAMENTE:
${JSON.stringify({
  corso: {
    nome: "string",
    tipo: tipoCorso,
    dataEsame: "YYYY-MM-DD o null",
    priorita: "alta",
    difficoltaPercepita: "1-5",
    oreTotaliStimate: "number",
    note: "string opzionale"
  },
  moduli: [{
    id: "m1",
    titolo: "string",
    ordine: 1,
    dipendeDa: [],
    oreStimate: "number",
    task: [{
      id: "t1_1",
      titolo: "string",
      tipo: "teoria|esercizi|ripasso|simulazione_esame",
      durata_minuti: "number"
    }]
  }]
}, null, 2)}

Rispondi SOLO con il JSON. Nessun testo prima o dopo.`
}

export function validateCorsoJSON(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed.corso || !parsed.moduli || !Array.isArray(parsed.moduli))
      throw new Error('Struttura JSON non valida: mancano corso o moduli')
    if (!parsed.corso.nome) throw new Error('Nome corso mancante')
    if (parsed.moduli.length === 0) throw new Error('Nessun modulo trovato')
    parsed.moduli.forEach((m, i) => {
      if (!m.id || !m.titolo) throw new Error(`Modulo ${i+1}: id o titolo mancante`)
      if (!Array.isArray(m.task) || m.task.length === 0) throw new Error(`Modulo ${m.titolo}: nessun task`)
    })
    return { valid: true, data: parsed }
  } catch(e) {
    return { valid: false, error: e.message }
  }
}

// Direct Anthropic API call (requires user's API key in settings)
export async function callAI(prompt, apiKey) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.content[0]?.text || ''
}
