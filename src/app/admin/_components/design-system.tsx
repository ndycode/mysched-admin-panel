'use client'

import React, { forwardRef, useEffect, useMemo, type ReactNode, type ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/Button'

import { motion, type HTMLMotionProps } from 'framer-motion'

export const CARD_BASE = 'rounded-xl border border-border bg-card text-card-foreground shadow-sm'

type ActionMenuTriggerProps = {
  icon: React.ElementType
  variant?: 'muted' | 'accent'
  size?: 'sm' | 'md'
  ariaLabel?: string
} & HTMLMotionProps<'button'>

export const ActionMenuTrigger = forwardRef<HTMLButtonElement, ActionMenuTriggerProps>(
  ({ icon: Icon, variant = 'muted', size = 'md', ariaLabel, className = '', ...props }, ref) => {
    const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'
    const base =
      variant === 'accent'
        ? buttonClasses({ variant: 'primary', size: 'sm', className: `${sizeClass} px-0` })
        : buttonClasses({ variant: 'secondary', size: 'sm', className: `${sizeClass} px-0` })

    return (
      <motion.button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={`${base} ${className}`}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        {...props}
      >
        <Icon className={size === 'sm' ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      </motion.button>
    )
  },
)

ActionMenuTrigger.displayName = 'ActionMenuTrigger'

/* ... (StatusPill remains the same for now as it uses specific colors) ... */

import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { animate, useMotionValue, useTransform } from 'framer-motion'

type StatsCardProps = {
  icon: React.ElementType
  label: string
  value: ReactNode
  animateKey?: number | string
  status?: { text: string; tone?: StatusTone }
  trend?: {
    value: string
    label: string
    direction?: 'up' | 'down' | 'neutral'
  }
  description?: string
  href?: string
  className?: string
}

export function StatsCard({ icon: Icon, label, value, status, trend, description, href, animateKey, className = '' }: StatsCardProps) {
  const numericTarget = useMemo(() => {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '')
      const parsed = Number(cleaned)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }, [value])

  const count = useMotionValue(numericTarget ?? 0)
  const rounded = useTransform(count, latest => Math.round(latest).toLocaleString())

  useEffect(() => {
    if (numericTarget == null) return
    count.set(0)
    const controls = animate(count, numericTarget, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [count, numericTarget, animateKey])

  const content = (
    <motion.div
      initial="idle"
      whileHover="hover"
      variants={{
        idle: { y: 0, scale: 1 },
        hover: { y: -4, scale: 1.01 }
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`group relative overflow-hidden ${CARD_BASE} p-5 transition-colors hover:border-primary/50 hover:shadow-md ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="text-2xl font-bold text-foreground">
            {numericTarget != null ? <motion.span>{rounded}</motion.span> : value}
          </div>
        </div>
        <motion.div
          variants={{
            idle: { scale: 1, rotate: 0 },
            hover: { scale: 1.1, rotate: 12 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>

      {(trend || description) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <motion.div
              key={`${trend.value}-${trend.label}-${animateKey}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-center gap-1 font-medium ${trend.direction === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                trend.direction === 'down' ? "text-rose-600 dark:text-rose-400" :
                  "text-muted-foreground"
                }`}>
              {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> :
                trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> :
                  <Minus className="h-3 w-3" />}
              {trend.value}
            </motion.div>
          )}
          {description && (
            <span className="text-muted-foreground truncate max-w-36">{description}</span>
          )}
          {trend && trend.label && !description && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}


    </motion.div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}

// Helper for cn if not imported, but it usually is in utils. 
// Wait, design-system.tsx might not have cn imported.
// I'll check imports. If not, I'll use template literals.
// The file content I viewed earlier didn't show `cn` import.
// I'll use template literals to be safe.


export type StatusTone = 'success' | 'danger' | 'info' | 'warning'

const STATUS_TONES: Record<StatusTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
  info: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400',
}

export function StatusPill({ tone = 'info', children }: { tone?: StatusTone; children: ReactNode }) {
  const toneClass = STATUS_TONES[tone] || STATUS_TONES.info

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors ${toneClass}`}
    >
      <span className="h-2 w-2 rounded-full bg-current/90" aria-hidden />
      {children}
    </span>
  )
}

type SectionHeaderProps = {
  label: string
  title: string
  subtitle?: string
  action?: ReactNode
  level?: 'page' | 'section'
  align?: 'left' | 'center'
}

export function SectionHeader({ label, title, subtitle, action, level = 'section', align = 'left' }: SectionHeaderProps) {
  const titleClass =
    level === 'page'
      ? 'text-3xl font-semibold text-foreground sm:text-4xl'
      : 'text-xl font-semibold text-foreground'
  const textAlign = align === 'center' ? 'text-center' : 'text-left'

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className={`space-y-1 ${textAlign}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <div className="space-y-1">
          <h2 className={titleClass}>{title}</h2>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

type PageShellProps = {
  label: string
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageShell({ label, title, subtitle, actions, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-screen-xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader label={label} title={title} subtitle={subtitle} action={actions} level="page" align="left" />
        {children}
      </div>
    </div>
  )
}

// Unified MetricCard component combining StatsCard and KpiCard functionality
type MetricCardProps = {
  icon?: React.ElementType
  label: string
  value: ReactNode
  variant?: 'animated' | 'simple'
  animateKey?: number | string
  status?: { text: string; tone?: StatusTone }
  trend?: {
    value: string
    label: string
    direction?: 'up' | 'down' | 'neutral'
  }
  description?: string
  helper?: string
  size?: 'large' | 'compact'
  href?: string
  className?: string
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  variant = 'animated',
  animateKey,
  status,
  trend,
  description,
  helper,
  size = 'large',
  href,
  className = ''
}: MetricCardProps) {
  const numericTarget = useMemo(() => {
    if (variant === 'simple') return null
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const cleaned = value.replace(/,/g, '')
      const parsed = Number(cleaned)
      return Number.isFinite(parsed) ? parsed : null
    }
    return null
  }, [value, variant])

  const count = useMotionValue(numericTarget ?? 0)
  const rounded = useTransform(count, latest => Math.round(latest).toLocaleString())

  useEffect(() => {
    if (numericTarget == null) return
    count.set(0)
    const controls = animate(count, numericTarget, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [count, numericTarget, animateKey])

  // Simple variant (KpiCard style)
  if (variant === 'simple') {
    const valueClass = size === 'large' ? 'text-3xl' : 'text-2xl'
    const content = (
      <div className={`${CARD_BASE} p-6 ${className} ${href ? 'transition-all hover:border-primary/50 hover:shadow-sm' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
          {status ? <StatusPill tone={status.tone}>{status.text}</StatusPill> : null}
        </div>
        <div className={`${valueClass} mt-3 font-semibold text-foreground`}>{value}</div>
        {helper ? <p className="mt-2 text-sm text-muted-foreground">{helper}</p> : null}
      </div>
    )

    if (href) {
      return <Link href={href} className="block">{content}</Link>
    }
    return content
  }

  // Animated variant (StatsCard style)
  const content = (
    <motion.div
      initial="idle"
      whileHover="hover"
      variants={{
        idle: { y: 0, scale: 1 },
        hover: { y: -4, scale: 1.01 }
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`group relative overflow-hidden ${CARD_BASE} p-5 transition-colors hover:border-primary/50 hover:shadow-md ${className}`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="text-2xl font-bold text-foreground">
            {numericTarget != null ? <motion.span>{rounded}</motion.span> : value}
          </div>
        </div>
        {Icon && (
          <motion.div
            variants={{
              idle: { scale: 1, rotate: 0 },
              hover: { scale: 1.1, rotate: 12 }
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        )}
      </div>

      {(trend || description) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {trend && (
            <motion.div
              key={`${trend.value}-${trend.label}-${animateKey}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex items-center gap-1 font-medium ${trend.direction === 'up' ? "text-emerald-600 dark:text-emerald-400" :
                trend.direction === 'down' ? "text-rose-600 dark:text-rose-400" :
                  "text-muted-foreground"
                }`}>
              {trend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> :
                trend.direction === 'down' ? <TrendingDown className="h-3 w-3" /> :
                  <Minus className="h-3 w-3" />}
              {trend.value}
            </motion.div>
          )}
          {description && (
            <span className="text-muted-foreground truncate max-w-36">{description}</span>
          )}
          {trend && trend.label && !description && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}
    </motion.div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }

  return content
}

// Legacy KpiCard - kept for backward compatibility, delegates to MetricCard
type KpiCardProps = {
  label: string
  value: ReactNode
  helper?: string
  status?: { text: string; tone?: StatusTone }
  size?: 'large' | 'compact'
}

export function KpiCard({ label, value, helper, status, size = 'large', className = '', href }: KpiCardProps & { className?: string; href?: string }) {
  return <MetricCard variant="simple" label={label} value={value} helper={helper} status={status} size={size} className={className} href={href} />
}

export function CardSurface({ className = '', padding = true, id, children }: { className?: string; padding?: boolean; id?: string; children: ReactNode }) {
  return <div id={id} className={`${CARD_BASE} ${padding ? 'p-6' : ''} ${className}`}>{children}</div>
}
