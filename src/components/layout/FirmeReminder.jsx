import { useState, useEffect } from 'react'
import { useFirme } from '../../hooks/useFirme'
import { useImpostazioni } from '../../hooks/useImpostazioni'
import { Modal, showSuccess } from '../ui'
import { useLocalStorage } from '../../hooks/useLocalStorage'

export default function FirmeReminder() {
  const { firme, addFirma } = useFirme()
  const { getOrarioGiorno } = useImpostazioni()
  const [reminderState, setReminderState] = useLocalStorage('wl_reminder_state', { date: '', action: '' })
  const [show, setShow] = useState(false)
  const [reasonMode, setReasonMode] = useState(false)

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const currentHour = now.getHours()
  const currentMin = now.getMinutes()
  const currentTimeMin = currentHour * 60 + currentMin

  useEffect(() => {
    // Controllo ogni minuto (opzionale, basterebbe al caricamento e ogni tanto)
    const check = () => {
      const dow = now.getDay()
      const orario = getOrarioGiorno(dow)

      // Se non è un giorno lavorativo o abbiamo già gestito il reminder oggi, usciamo
      if (!orario?.abilitato || reminderState.date === todayStr) return

      // Calcoliamo quando triggerare il reminder: 
      // O alle 18:00 (default) o 30 min dopo la fine del turno previsto
      const [endH, endM] = (orario.alle || "18:00").split(':').map(Number)
      const triggerTimeMin = Math.max(18 * 60, (endH * 60 + endM) + 30)

      const alreadyLogged = firme.some(f => f.data === todayStr)

      if (currentTimeMin >= triggerTimeMin && !alreadyLogged) {
        setShow(true)
      }
    }

    check()
    const timer = setInterval(check, 60000)
    return () => clearInterval(timer)
  }, [firme, reminderState, todayStr, currentTimeMin])

  const handleStandard = () => {
    const dow = now.getDay()
    const orario = getOrarioGiorno(dow)
    addFirma({
      data: todayStr,
      entrata: orario.dalle,
      uscita: orario.alle,
      nota: 'Inserimento automatico'
    })
    setReminderState({ date: todayStr, action: 'confirmed' })
    setShow(false)
    showSuccess('Orario standard registrato con successo.')
  }

  const handleSnooze = () => {
    // Per oggi non rompermi più, riprova domani
    setReminderState({ date: todayStr, action: 'snoozed' })
    setShow(false)
  }

  const handleNoWork = (reason) => {
    // Possiamo scegliere di loggare un'entrata a 0 ore con nota o semplicemente ignorare
    // In questo caso, ignoriamo il reminder per oggi salvando lo stato
    setReminderState({ date: todayStr, action: 'skipped', reason })
    setShow(false)
    showSuccess(`Nota salvata: ${reason}. Oggi non verranno richieste firme.`)
  }

  const dow = now.getDay()
  const orario = getOrarioGiorno(dow)

  return (
    <Modal open={show} title="Promemoria Orario" onClose={() => setShow(false)}>
      {!reasonMode ? (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ fontSize:14, color:'var(--t2)', lineHeight:1.5 }}>
            Ciao! Sono le <strong>{currentHour}:{String(currentMin).padStart(2,'0')}</strong> e non hai ancora registrato ore per oggi. 
            Il tuo orario previsto era <strong>{orario?.dalle} – {orario?.alle}</strong>.
          </p>
          
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button className="btn-accent" onClick={handleStandard} style={{ padding:'12px' }}>
              Registra orario standard ({orario?.dalle}–{orario?.alle})
            </button>
            <button className="btn-ghost" onClick={() => setReasonMode(true)}>
              Oggi non ho lavorato...
            </button>
            <button className="btn-ghost" onClick={handleSnooze} style={{ border:'none', color:'var(--t3)', fontSize:12 }}>
              Ricordamelo più tardi
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <p style={{ fontSize:14, color:'var(--t2)' }}>Specifica il motivo dell'assenza:</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {['Malattia', 'Ferie', 'Permesso', 'Festività', 'Altro'].map(r => (
              <button key={r} className="btn-ghost" onClick={() => handleNoWork(r)} style={{ padding:'10px' }}>
                {r}
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
