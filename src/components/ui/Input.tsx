import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

type InputSize = 'sm' | 'md' | 'lg'

export function inputClasses({
  className,
  hasError,
  size = 'md',
}: {
  className?: string
  hasError?: boolean
  size?: InputSize
}) {
  const heights: Record<InputSize, string> = {
    sm: 'h-10 text-sm',
    md: 'h-11 text-sm',
    lg: 'h-12 text-base',
  }

  return cn(
    'w-full rounded-full border-2 border-input bg-background/70 px-4 text-foreground placeholder:text-muted-foreground shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    heights[size],
    hasError ? 'border-destructive focus-visible:ring-destructive' : '',
    className,
  )
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  error?: string
  size?: InputSize
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, size = 'md', ...props }, ref) => (
  <motion.div
    className="space-y-1.5"
    initial={false}
    animate={error ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  >
    <motion.input
      ref={ref}
      whileFocus={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={inputClasses({ className, hasError: Boolean(error), size })}
      {...(props as any)}
    />
    <AnimatePresence>
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -5, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -5, height: 0 }}
          className="text-xs text-[var(--danger)]"
        >
          {error}
        </motion.p>
      ) : null}
    </AnimatePresence>
  </motion.div>
))
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <motion.div className="relative">
      <motion.select
        ref={ref}
        whileFocus={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'w-full rounded-2xl border border-[var(--border-soft)] bg-white/80 px-3.5 py-2.5 text-sm text-[var(--muted-strong)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur',
          'focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20',
          className
        )}
        {...(props as any)}
      >
        {children}
      </motion.select>
    </motion.div>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <motion.textarea
      ref={ref}
      whileFocus={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'w-full rounded-2xl border border-[var(--border-soft)] bg-white/80 px-3.5 py-2.5 text-sm text-[var(--muted-strong)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur',
        'focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20',
        className
      )}
      {...(props as any)}
    />
  )
)
Textarea.displayName = 'Textarea'
