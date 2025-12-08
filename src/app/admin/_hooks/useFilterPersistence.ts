import { useEffect, useRef } from 'react'

export function useFilterPersistence<T extends Record<string, unknown>>(
    key: string,
    currentState: T,
    setters: { [K in keyof T]?: (value: T[K]) => void },
    onLoad?: (saved: Partial<T>) => void
) {
    const isLoaded = useRef(false)

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(key)
            if (raw) {
                const saved = JSON.parse(raw) as Partial<T>
                Object.keys(saved).forEach((k) => {
                    const key = k as keyof T
                    const value = saved[key]
                    if (value !== undefined && setters[key]) {
                        setters[key]!(value as T[keyof T])
                    }
                })
                if (onLoad) {
                    onLoad(saved)
                }
            }
        } catch (error) {
            console.error('Failed to load persisted filters:', error)
        } finally {
            isLoaded.current = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!isLoaded.current) return
        try {
            sessionStorage.setItem(key, JSON.stringify(currentState))
        } catch {
            // ignore write errors
        }
    }, [key, JSON.stringify(currentState)])
}
