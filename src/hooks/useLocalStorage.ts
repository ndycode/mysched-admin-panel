'use client'

import { useCallback, useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  // Always initialize with `initial` to avoid SSR/client hydration mismatch
  const [value, setValue] = useState<T>(initial)
  const [isHydrated, setIsHydrated] = useState(false)

  // Read from localStorage only on client after hydration
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) {
        setValue(JSON.parse(raw) as T)
      }
    } catch {
      // Ignore parse errors, keep initial value
    }
    setIsHydrated(true)
  }, [key])

  // Persist changes to localStorage after hydration
  useEffect(() => {
    if (!isHydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [key, value, isHydrated])

  const setValueSafe = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue)
  }, [])

  return [value, setValueSafe] as const
}
