import { useState, useEffect } from 'react'
import { useFirme } from '../../hooks/useFirme'
import { useImpostazioni } from '../../hooks/useImpostazioni'
import { Modal, showSuccess } from '../ui'
import { useLocalStorage } from '../../hooks/useLocalStorage'

export default function FirmeReminder() {
  const { firme, addFirma } = useFirme()
  const { getOrarioGiorno, settings } = useImpostazioni()
  const [reminderState, setReminderState] = useLocalStorage('wl_reminder_state', { date: '', action: '' })
  const [show, setShow] = useState(false)
  const [reasonMode, setReasonMode] = useState(false)

  const remSettings = settings.reminderFirme || { abilitato: true, oraTrigger: '18:00', minRitardoFineTurno: 30 }
  const motivazioni = settings.motivazioniAssenza || [
    { id: 'malattia', label: 'Malattia', icon: '🤒', colore: '#EF4444' },
    { id: 'ferie', label: 'Ferie', icon: '🏖️', colore: '#3B82F6' },
  ]

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentTimeMin = currentHour * 60 + currentMin

  useEffect(() => {
    if (!remSettings.abilitato) return

    const check = () => {
      const dow = now.getDay()
      const orario = getOrarioGiorno(dow)

      if (!orario?.abilitato || reminderState.date === todayStr) return

      const [trigH, trigM] = (remSettings.oraTrigger || "18:00").split(':').map(Number)
      const trigTimeMin = trigH * 60 + trigM

      const [endH, endM] = (orario.alle || "18:00").split(':').map(Number)
      const delayTimeMin = (endH * 60 + endM) + (remSettings.minRitardoFineTurno || 30)

      // Il reminder scatta se l'ora attuale ha superato SIA l'ora di trigger SIA l'ora di fine turno + ritardo
      const effectiveTriggerMin = Math.max(trigTimeMin, delayTimeMin)

      const alreadyLogged = firme.some(f => f.data === todayStr)

      if (currentTimeMin >= effectiveTriggerMin && !alreadyLogged) {
        setShow(true)
      }
    }

    check()
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [firme, reminderState, todayStr, currentTimeMin, remSettings, getOrarioGiorno])

  const handleStandard = () => {
    const dow = now.getDay()
    const orario = getOrarioGiorno(dow)
    addFirma({
      data: todayStr,
      entrata: orario.dalle,
      uscita: orario.alle,
      nota: 'Inserimento automatico (Reminder)'
    })
    setReminderState({ date: todayStr, action: 'confirmed' })
    setShow(false)
    showSuccess('Orario standard registrato.')
  }

  const handleSnooze = () => {
    setReminderState({ date: todayStr, action: 'snoozed' })
    setShow(false)
  }

  const handleNoWork = (reason) => {
    setReminderState({ date: todayStr, action: 'skipped', reason: reason.label })
    setShow(false)
    showSuccess(`Oggi segnato come assenza per: ${reason.label}`)
  }

  const dow = now.getDay()
  const orario = getOrarioGiorno(dow)

  return (
    <Modal open={show} title="Promemoria Orario" onClose={() => setShow(false)}>
      {!reasonMode ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ fontSize:14, color:'var(--t2)', lineHeight:1.5 }}>
            Ciao! Sono le <strong>{currentHour}:{String(currentMin).padStart(2,'0')}</strong> e non hai ancora registrato ore per oggi. 
            L'orario previsto era <strong>{orario?.dalle} – {orario?.alle}</strong>.
          </p>
          
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button className="btn-accent" onClick={handleStandard} style={{ padding:'12px' }}>
              Registra orario standard ({orario?.dalle}–{orario?.alle})
            </button>
            <button className="btn-ghost" onClick={() => setReasonMode(true)}>
              Oggi non ho lavorato...
            </button>
            <button className="btn-ghost" onClick={handleSnooze} style={{ border:'none', color:'var(--t3)', fontSize:12, marginTop:4 }}>
              Ricordamelo più tardi
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ fontSize:14, color:'var(--t2)' }}>Scegli il motivo dell'assenza:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {motivazioni.map(m => (
              <button key={m.id} className="btn-ghost" onClick={() => handleNoWork(m)} style={{ padding:'12px 10px', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{m.icon}</span>
                <span style={{ fontSize:13, fontWeight:500 }}>{m.label}</span>
              </button>
            ))}
          </div>
          <button className="btn-ghost" onClick={() => setReasonMode(false)} style={{ marginTop:10, fontSize:12 }}>
            ← Torna indietro
          </button>
        </div>
      )}
    </Modal>
  )
}
