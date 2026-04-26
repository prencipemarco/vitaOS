import { useLocalStorage } from './useLocalStorage'

/**
 * useNotes.js
 * Gestisce note rapide e progetti in Markdown.
 */

export function useNotes() {
  const [notes, setNotes] = useLocalStorage('wl_notes', [])

  const addNote = (note) => {
    const newNote = {
      id: Date.now().toString(),
      titolo: note.titolo || 'Senza titolo',
      contenuto: note.contenuto || '',
      colore: note.colore || 'var(--sf2)',
      tag: note.tag || [],
      fissata: false,
      ultimaModifica: new Date().toISOString()
    }
    setNotes([newNote, ...notes])
    return newNote
  }

  const updateNote = (id, patch) => {
    setNotes(notes.map(n => n.id === id ? { ...n, ...patch, ultimaModifica: new Date().toISOString() } : n))
  }

  const removeNote = (id) => {
    setNotes(notes.filter(n => n.id !== id))
  }

  const togglePin = (id) => {
    setNotes(notes.map(n => n.id === id ? { ...n, fissata: !n.fissata } : n))
  }

  return {
    notes,
    addNote,
    updateNote,
    removeNote,
    togglePin
  }
}
