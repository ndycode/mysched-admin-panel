'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion'
import { X } from 'lucide-react'
import { useLenis, ReactLenis } from 'lenis/react'

import { cn } from '@/components/ui'

const overlayMotion = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const dialogMotion = {
  hidden: { opacity: 0, scale: 0.96, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
}

const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => { },
})

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
  initialFocus?: React.RefObject<HTMLElement>
}

// ...

export const Dialog = React.forwardRef<HTMLDivElement, DialogProps>(
  ({ open, onOpenChange, children, className, initialFocus }, ref) => {
    const [mounted, setMounted] = React.useState(false)
    const prefersReducedMotion = useReducedMotion()
    const panelRef = React.useRef<HTMLDivElement | null>(null)

    const assignRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        panelRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          ; (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [ref],
    )

    React.useEffect(() => {
      setMounted(true)
      return () => setMounted(false)
    }, [])



    // ... (inside component)

    const lenis = useLenis()

    // Lock body scroll when open
    // Lock body scroll when open
    React.useEffect(() => {
      if (open) {
        document.body.style.setProperty('overflow', 'hidden', 'important')
        document.documentElement.classList.add('lenis-stopped')
        lenis?.stop()
      } else {
        document.body.style.removeProperty('overflow')
        document.documentElement.classList.remove('lenis-stopped')
        lenis?.start()
      }
      return () => {
        document.body.style.removeProperty('overflow')
        document.documentElement.classList.remove('lenis-stopped')
        lenis?.start()
      }
    }, [open, lenis])

    const overlayTransition: Transition = prefersReducedMotion
      ? { duration: 0.08, ease: 'easeOut' }
      : { duration: 0.12, ease: [0.33, 1, 0.68, 1] }

    const dialogTransition: Transition = prefersReducedMotion
      ? { duration: 0.12, ease: 'easeOut' }
      : { type: 'spring', stiffness: 620, damping: 32, mass: 0.8 }

    const hasFocused = React.useRef(false)

    // Basic focus trap + Escape handling
    React.useEffect(() => {
      if (!open) {
        hasFocused.current = false
        return
      }
      const getFocusable = () => {
        if (!panelRef.current) return []
        const selectors = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(',')
        return Array.from(panelRef.current.querySelectorAll<HTMLElement>(selectors)).filter(
          el => !el.hasAttribute('aria-hidden'),
        )
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onOpenChange(false)
          return
        }

        if (event.key === 'Tab') {
          const focusables = getFocusable()
          if (focusables.length === 0) return
          const first = focusables[0]
          const last = focusables[focusables.length - 1]
          const active = document.activeElement as HTMLElement | null
          if (event.shiftKey) {
            if (active === first || !panelRef.current?.contains(active)) {
              event.preventDefault()
              last.focus()
            }
          } else {
            if (active === last || !panelRef.current?.contains(active)) {
              event.preventDefault()
              first.focus()
            }
          }
        }
      }

      // Focus the provided initial ref or first focusable
      const focusInitial = () => {
        if (hasFocused.current) return
        const target = initialFocus?.current
        if (target) {
          target.focus()
          hasFocused.current = true
          return
        }
        const focusables = getFocusable()
        if (focusables.length > 0) {
          focusables[0].focus()
          hasFocused.current = true
        } else {
          panelRef.current?.focus()
        }
      }

      const timer = window.requestAnimationFrame(focusInitial)
      document.addEventListener('keydown', handleKeyDown, true)

      return () => {
        window.cancelAnimationFrame(timer)
        document.removeEventListener('keydown', handleKeyDown, true)
      }
    }, [open, onOpenChange, initialFocus])

    if (!mounted) return null

    return createPortal(
      <DialogContext.Provider value={{ open, onOpenChange }}>
        <AnimatePresence mode="wait" initial={false}>
          {open && (
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                key="dialog-overlay"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={overlayMotion}
                transition={overlayTransition}
                className="fixed inset-0 bg-black/45"
                aria-hidden="true"
                style={{ willChange: 'opacity' }}
                onClick={() => onOpenChange(false)}
              />
              <motion.div
                key="dialog-panel"
                ref={assignRef}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dialogMotion}
                transition={dialogTransition}
                className={cn(
                  'relative z-10 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl focus:outline-none flex flex-col max-h-[90vh]',
                  className
                )}
                style={{ willChange: 'transform, opacity' }}
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
              >
                {children}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </DialogContext.Provider>,
      document.body
    )
  }
)
Dialog.displayName = 'Dialog'

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const { onOpenChange } = React.useContext(DialogContext)
  return (
    <div className={cn('flex items-center justify-between border-b border-border px-6 py-4', className)}>
      <div className="flex-1">{children}</div>
      <motion.button
        onClick={() => onOpenChange(false)}
        className="ml-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      >
        <X className="h-5 w-5" />
      </motion.button>
    </div>
  )
}

export function DialogBody({ children, className, scrollable = true }: { children: React.ReactNode; className?: string; scrollable?: boolean }) {
  if (!scrollable) {
    return (
      <div className={cn('p-6 flex-1', className)}>
        {children}
      </div>
    )
  }

  return (
    <ReactLenis
      root={false}
      className={cn('p-6 overflow-y-auto flex-1', className)}
      options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}
    >
      {children as any}
    </ReactLenis>
  )
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4', className)}>
      {children}
    </div>
  )
}
