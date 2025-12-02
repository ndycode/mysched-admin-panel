'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { Dialog } from '@/components/ui'

export type ComingSoonOptions = {
  title: string
  description?: string
  highlights?: string[]
  learnMoreLabel?: string
  learnMoreUrl?: string
}

type ComingSoonContextValue = (options: ComingSoonOptions) => void

const ComingSoonContext = createContext<ComingSoonContextValue>(() => { })

const FALLBACK_MESSAGE =
  'This capability is still in development. Check back soon for updates as we finish the experience.'

type ComingSoonDialogProps = {
  open: boolean
  options: ComingSoonOptions | null
  onClose: () => void
}

function ComingSoonDialog({ open, options, onClose }: ComingSoonDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (open && closeRef.current) {
      closeRef.current.focus()
    }
  }, [open])

  if (!open || !options) {
    return null
  }

  const { title, description, highlights, learnMoreLabel, learnMoreUrl } = options
  const summary = description?.trim().length ? description : FALLBACK_MESSAGE
  const bullets = (highlights ?? []).filter((item) => Boolean(item && item.trim().length))

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!val) onClose()
      }}
      className="max-w-md border-white/60 bg-white/70 shadow-[0_40px_80px_-45px_rgba(15,23,42,0.85)] backdrop-blur"
    >
      <motion.button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-2xl p-1.5 text-[var(--muted-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
        whileHover={{ backgroundColor: "rgba(255,255,255,0.6)", scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Close dialog"
      >
        <X className="h-4 w-4" aria-hidden />
      </motion.button>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f4ed8,#60a5fa)] text-white shadow-[0_16px_40px_-28px_rgba(37,99,235,0.75)]">
        <Sparkles className="h-6 w-6" aria-hidden />
      </div>
      <h2 id={titleId} className="mt-4 text-xl font-semibold text-[var(--foreground)]">
        {title}
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        {summary}
      </p>
      {bullets.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-[var(--muted-foreground)]">
          {bullets.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,#60a5fa,#1f4ed8)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <motion.button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#1f4ed8,#60a5fa)] px-4 py-2 text-sm font-medium text-white shadow-[0_16px_35px_-22px_rgba(37,99,235,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(13,95,229,0.35)]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          Got it
        </motion.button>
        {learnMoreUrl ? (
          <motion.a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[rgba(13,95,229,0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
            whileHover={{ opacity: 0.8 }}
            whileTap={{ scale: 0.95 }}
          >
            {learnMoreLabel ?? 'Learn more'}
          </motion.a>
        ) : null}
      </div>
    </Dialog>
  )
}

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ComingSoonOptions | null>(null)

  const open = useCallback((opts: ComingSoonOptions) => {
    setOptions({
      title: opts.title,
      description: opts.description,
      highlights: opts.highlights?.filter((item) => Boolean(item && item.trim().length)) ?? undefined,
      learnMoreLabel: opts.learnMoreLabel,
      learnMoreUrl: opts.learnMoreUrl,
    })
  }, [])

  const close = useCallback(() => {
    setOptions(null)
  }, [])

  const value = useMemo<ComingSoonContextValue>(() => open, [open])

  return (
    <ComingSoonContext.Provider value={value}>
      {children}
      <ComingSoonDialog open={Boolean(options)} options={options} onClose={close} />
    </ComingSoonContext.Provider>
  )
}

export function useComingSoon() {
  return useContext(ComingSoonContext)
}
