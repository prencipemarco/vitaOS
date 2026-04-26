import { useState } from 'react'
import { useNotes } from '../hooks/useNotes'
import { PageHeader, EmptyState, SectionHeader, showConfirm } from '../components/ui'

export default function Note() {
  const { notes, addNote, updateNote, removeNote, togglePin } = useNotes()
  const [selectedId, setSelectedId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ titolo: '', contenuto: '' })

  const selectedNote = notes.find(n => n.id === selectedId)

  const handleNew = () => {
    const n = addNote({ titolo: 'Nuova nota', contenuto: '' })
    setSelectedId(n.id)
    setEditForm({ titolo: n.titolo, contenuto: n.contenuto })
    setIsEditing(true)
  }

  const handleSelect = (n) => {
    setSelectedId(n.id)
    setEditForm({ titolo: n.titolo, contenuto: n.contenuto })
    setIsEditing(false)
  }

  const handleSave = () => {
    updateNote(selectedId, editForm)
    setIsEditing(false)
  }

  return (
    <div style={{ padding: 28, height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', animation: 'fadeUp .24s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader label="second brain" title="Note & Progetti" />
        <button className="btn-accent" onClick={handleNew}>+ Nuova Nota</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, flex: 1, minHeight: 0 }}>
        {/* Sidebar Note */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', fontSize: 12, fontWeight: 600, color: 'var(--t3)' }}>
            TUTTE LE NOTE ({notes.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {notes.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>Nessuna nota</div>
            ) : (
              notes.sort((a,b) => (b.fissata?1:0) - (a.fissata?1:0)).map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleSelect(n)}
                  style={{ 
                    padding: '12px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                    background: selectedId === n.id ? 'var(--ac-bg)' : 'transparent',
                    border: `1px solid ${selectedId === n.id ? 'var(--ac)40' : 'transparent'}`,
                    transition: 'all .1s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {n.fissata && <span style={{ fontSize: 10 }}>📌</span>}
                    <div style={{ fontSize: 13, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.titolo}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.contenuto || 'Nessun contenuto'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor Area */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {selectedNote ? (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: "'DM Mono',monospace" }}>
                  Ultima modifica: {new Date(selectedNote.ultimaModifica).toLocaleString('it-IT')}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => togglePin(selectedId)}>
                    {selectedNote.fissata ? 'Rimuovi Pin' : 'Fissa nota'}
                  </button>
                  <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => {
                    showConfirm('Eliminare questa nota?', () => {
                      removeNote(selectedId)
                      setSelectedId(null)
                    })
                  }}>Elimina</button>
                </div>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto' }}>
                {isEditing ? (
                  <>
                    <input 
                      className="input-field" 
                      value={editForm.titolo} 
                      onChange={e => setEditForm({...editForm, titolo: e.target.value})}
                      style={{ fontSize: 24, fontWeight: 700, border: 'none', background: 'transparent', padding: 0, marginBottom: 16, width: '100%' }}
                      placeholder="Titolo nota..."
                    />
                    <textarea 
                      className="input-field"
                      value={editForm.contenuto}
                      onChange={e => setEditForm({...editForm, contenuto: e.target.value})}
                      style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, resize: 'none', fontSize: 14, lineHeight: 1.6, width: '100%' }}
                      placeholder="Inizia a scrivere qui..."
                    />
                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button className="btn-ghost" onClick={() => setIsEditing(false)}>Annulla</button>
                      <button className="btn-accent" onClick={handleSave}>Salva Modifiche</button>
                    </div>
                  </>
                ) : (
                  <div onClick={() => setIsEditing(true)} style={{ cursor: 'text', height: '100%' }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>{selectedNote.titolo}</h1>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, color: 'var(--t2)' }}>
                      {selectedNote.contenuto || <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>Clicca per aggiungere contenuto...</span>}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState message="Seleziona una nota o creane una nuova per iniziare." />
          )}
        </div>
      </div>
    </div>
  )
}
