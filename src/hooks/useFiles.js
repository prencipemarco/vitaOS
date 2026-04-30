import { get, set, del } from 'idb-keyval'
import { useState } from 'react'

/**
 * Hook per la gestione degli allegati (certificati, documenti, etc.)
 * I file vengono salvati come Blob in IndexedDB per massimizzare le performance.
 */
export function useFiles() {
  const [loading, setLoading] = useState(false)

  const saveFile = async (file) => {
    setLoading(true)
    try {
      const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      // Salviamo il file direttamente come Blob/File
      await set(id, file)
      return { id, name: file.name, type: file.type, size: file.size }
    } catch (err) {
      console.error('Errore nel salvataggio del file:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getFile = async (id) => {
    return await get(id)
  }

  const removeFile = async (id) => {
    await del(id)
  }

  const getFileUrl = async (id) => {
    const file = await get(id)
    if (!file) return null
    return URL.createObjectURL(file)
  }

  return { saveFile, getFile, removeFile, getFileUrl, loading }
}
