'use client'

// src/components/toast.tsx

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'framer-motion'

import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'error' | 'success' | 'info'
type ToastInput = { kind: ToastKind; msg: string }
type Toast = ToastInput & { id: number }

const ToastCtx = createContext<(o: ToastInput) => void>(() => { })

const DUR = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef(new Map<number, number>())
  const prefersReducedMotion = useReducedMotion()
  const isTest = process.env.NODE_ENV === 'test'

  const remove = useCallback((id: number) => {
    setItems((v) => v.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (o: ToastInput) => {
      const id = Date.now() + Math.random()
      setItems((v) => [...v, { id, ...o }])
      timers.current.set(
        id,
        // @ts-expect-error Node vs DOM timer types
        setTimeout(() => remove(id), DUR)
      )
    },
    [remove]
  )

  // derive styles once
  const styles = useMemo(
    () => ({
      base:
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border text-sm text-card-foreground will-change-transform',
      row: 'flex items-center gap-3 px-4 py-3',
      msg: 'flex-1 font-medium leading-5 text-card-foreground',
      btn:
        'shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      accent: {
        error: 'bg-destructive',
        success: 'bg-emerald-500',
        info: 'bg-blue-500',
      } as Record<ToastKind, string>,
      iconColor: {
        error: 'text-destructive',
        success: 'text-emerald-500',
        info: 'text-blue-500',
      } as Record<ToastKind, string>,
      progress: {
        error: 'bg-destructive',
        success: 'bg-emerald-500',
        info: 'bg-blue-500',
      } as Record<ToastKind, string>,
    }),
    []
  )

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    info: Info,
  }

  const enterTransition: Transition = prefersReducedMotion
    ? { duration: 0.12, ease: 'easeOut' }
    : { type: 'spring', stiffness: 620, damping: 32, mass: 0.8 }
  const exitTransition: Transition = isTest
    ? { duration: 0 }
    : prefersReducedMotion
      ? { duration: 0.12, ease: 'easeInOut' }
      : { type: 'spring', stiffness: 520, damping: 36, mass: 0.8 }

  const renderToast = (t: Toast, animated: boolean) => {
    const Icon = icons[t.kind]

    const content = (
      <>
        <div className={`absolute top-0 left-0 right-0 h-1 ${styles.accent[t.kind]}`} />

        <div className={styles.row}>
          <Icon className={`h-5 w-5 ${styles.iconColor[t.kind]}`} />

          <p className={styles.msg} role={t.kind === 'error' ? 'alert' : 'status'}>
            {t.msg}
          </p>

          <button
            type="button"
            onClick={() => remove(t.id)}
            className={styles.btn}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </>
    )

    if (animated) {
      return (
        <motion.div
          key={t.id}
          layout
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96, transition: exitTransition }}
          transition={enterTransition}
          style={{ willChange: 'transform, opacity' }}
          className={styles.base}
        >
          {content}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <motion.div
              className={`h-full ${styles.progress[t.kind]}`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: DUR / 1000, ease: 'linear' as const }}
              style={{ willChange: 'width' } as CSSProperties}
            />
          </div>
        </motion.div>
      )
    }

    return (
      <div key={t.id} className={styles.base}>
        {content}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div className={`h-full ${styles.progress[t.kind]}`} />
        </div>
      </div>
    )
  }

  return (
    <ToastCtx.Provider value={push}>
      {children}

      {/* polite live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {items.length ? items[items.length - 1].msg : ''}
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100000] flex flex-col gap-3">
        {isTest ? (
          items.map(t => renderToast(t, false))
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map(t => renderToast(t, true))}
          </AnimatePresence>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
