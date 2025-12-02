'use client'

import { useEffect, useMemo, useState } from 'react'

export function useLocalStorage<T>(key: string, initial: T) {
  const readValue = useMemo(() => {
    return () => {
      try {
        const raw = window.localStorage.getItem(key)
        return raw != null ? (JSON.parse(raw) as T) : initial
      } catch {
        return initial
      }
    }
  }, [initial, key])

  const [value, setValue] = useState<T>(() => readValue())

  useEffect(() => {
    setValue(readValue())
  }, [readValue])

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {}
  }, [key, value])

  return [value, setValue] as const
}
