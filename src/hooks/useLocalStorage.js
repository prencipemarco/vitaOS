import { useState, useEffect, useCallback } from 'react'
import { get, set } from 'idb-keyval'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue)
  const [isReady, setIsReady] = useState(false)

  // 1. Hydrate from IndexedDB OR migrate from localStorage
  useEffect(() => {
    get(key).then(idbVal => {
      if (idbVal !== undefined) {
        setValue(idbVal)
        setIsReady(true)
      } else {
        // Migration from localStorage
        const lsVal = window.localStorage.getItem(key)
        let finalVal = initialValue
        if (lsVal) {
          try {
            finalVal = JSON.parse(lsVal)
          } catch (e) {
            console.error('Migration parse error', e)
          }
        }
        setValue(finalVal)
        setIsReady(true)
        // Store in IDB
        set(key, finalVal).catch(console.error)
      }
    }).catch(err => {
      console.error('IDB get error', err)
      setValue(initialValue)
      setIsReady(true)
    })
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Persist changes to IndexedDB
  const setValueWrapped = useCallback((newValue) => {
    setValue(prev => {
      const val = newValue instanceof Function ? newValue(prev) : newValue;
      set(key, val).catch(console.error);
      return val;
    })
  }, [key])

  return [value, setValueWrapped, isReady]
}
