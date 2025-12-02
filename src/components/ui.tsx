'use client'

// src/components/ui.tsx

import React, { forwardRef } from 'react'
import Link from 'next/link'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { buttonClasses, type ButtonVariant, type ButtonSize } from './ui/Button'

/* ---------------------------------------------------------- */
/* utilities                                                 */
/* ---------------------------------------------------------- */

export function cn(...xs: Array<string | undefined | false>) {
  return xs.filter(Boolean).join(' ')
}

/* ---------------------------------------------------------- */
/* layout                                                     */
/* ---------------------------------------------------------- */

export const Shell = ({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) => (
  <div className={cn('relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8', className)}>
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(10,132,255,0.18),transparent_70%)]"
      aria-hidden
    />
    <header className="relative mb-10 flex flex-col gap-3">
      <span className="caps-label rounded-full border border-border bg-background/80 px-4 py-1 text-primary/75 backdrop-blur">
        Dashboard
      </span>
      <h1 className="text-3xl font-semibold text-foreground sm:text-25">{title}</h1>
      {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </header>
    <div className="relative space-y-10">{children}</div>
  </div>
)

/**
 * @deprecated Use Card from "./ui/Card" via the barrel:
 *   import { Card } from "@/components/ui"
 */
export const LegacyCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      'rounded-[26px] border border-border bg-card shadow-[0_28px_90px_-60px_rgba(15,31,60,0.28)] backdrop-blur-xl',
      className,
    )}
  >
    {children}
  </div>
)

// Re-export the new Card primitives from the ui folder so consumers can import
// the modern implementations via the barrel: import { Card, CardHeader, CardBody } from '@/components/ui'
export { Card, CardHeader, CardBody } from './ui/Card'

// Re-export primary button and metric primitives
export { PrimaryButton } from './ui/Button'
export { MetricTitle, MetricValue, Subtext } from './ui/Metric'
export { Dialog } from './ui/Dialog'

/* ---------------------------------------------------------- */
/* controls                                                   */
/* ---------------------------------------------------------- */

export const Button = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}>(({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={buttonClasses({ variant, size, className, disabled })}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      disabled={disabled}
      {...props}
    />
  )
})
Button.displayName = 'Button'

export const Danger = (props: HTMLMotionProps<'button'>) => (
  <Button
    variant="ghost"
    className={cn('text-destructive hover:bg-destructive/10 hover:text-destructive', props.className)}
    {...props}
  />
)

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string
}>(({ className, error, ...props }, ref) => (
  <div className="space-y-1.5">
    <input
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur',
        'focus:outline-none',
        error ? 'border-destructive focus-visible:ring-destructive' : '',
        className
      )}
      {...props}
    />
    {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
  </div>
))
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] backdrop-blur',
        'focus:outline-none',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

/* ---------------------------------------------------------- */
/* table                                                      */
/* ---------------------------------------------------------- */

export const Table = ({ children, className, role, ariaLabel }: {
  children: React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}) => (
  <div className={cn('overflow-x-auto rounded-2xl border border-border bg-card backdrop-blur', className)}>
    <table
      className="min-w-full border-separate border-spacing-0 text-sm text-muted-foreground"
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </table>
  </div>
)

export const THead = ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>
export const TBody = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>

export const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th
    className={cn(
      'caps-label sticky top-0 z-10 border-b border-border bg-muted/90 px-4 py-3 text-left text-muted-foreground',
      'first:rounded-tl-2xl last:rounded-tr-2xl',
      className,
    )}
  >
    {children}
  </th>
)

export const Tr = ({ children }: { children: React.ReactNode }) => <tr className="odd:bg-card even:bg-muted/30">{children}</tr>

export const Td = ({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) => (
  <td
    colSpan={colSpan}
    className={cn('border-b border-border px-4 py-3 align-top text-muted-foreground', className)}
  >
    {children}
  </td>
)

/* ---------------------------------------------------------- */
/* nav link                                                   */
/* ---------------------------------------------------------- */

export const NavLink = ({
  href,
  label,
  active,
  className,
}: {
  href: string
  label: string
  active: boolean
  className?: string
}) => (
  <Link
    href={href}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'glow-ring rounded-2xl px-4 py-2 text-sm font-semibold',
      active
        ? 'bg-primary/10 text-primary shadow-[0_16px_36px_-28px_rgba(10,132,255,0.35)]'
        : 'text-muted-foreground hover:text-primary hover:bg-accent',
      className
    )}
  >
    {label}
  </Link>
)

/* ---------------------------------------------------------- */
/* badges / helpers                                           */
/* ---------------------------------------------------------- */

export const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-primary backdrop-blur', className)}>
    {children}
  </span>
)
