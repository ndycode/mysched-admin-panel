'use client'

import React, { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'type'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const baseButton =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-[0_12px_28px_-18px_rgba(0,0,0,0.22)] hover:bg-[color-mix(in_srgb,var(--primary)_85%,#000_15%)] hover:shadow-[0_14px_32px_-18px_rgba(0,0,0,0.26)]',
  secondary:
    'bg-muted text-foreground shadow-[0_8px_20px_-16px_rgba(0,0,0,0.16)] hover:bg-[color-mix(in_srgb,var(--muted)_90%,#000_10%)] hover:shadow-[0_10px_24px_-18px_rgba(0,0,0,0.18)]',
  ghost:
    'text-foreground hover:bg-[color-mix(in_srgb,var(--muted)_60%,transparent)] shadow-none',
  danger:
    'bg-destructive text-destructive-foreground shadow-[0_12px_28px_-18px_rgba(244,63,94,0.4)] hover:bg-[color-mix(in_srgb,var(--destructive)_85%,#000_15%)] hover:shadow-[0_14px_32px_-18px_rgba(244,63,94,0.46)]',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
}) {
  return cn(
    baseButton,
    sizeClasses[size],
    variantClasses[variant],
    disabled ? 'cursor-not-allowed opacity-60' : '',
    className,
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, loading = false, onClick, type = 'button', ...props }, ref) => {
    const computedDisabled = disabled || loading
    const handleClick: typeof onClick = event => {
      if (computedDisabled) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }

    return (
      <motion.button
        ref={ref}
        className={buttonClasses({ variant, size, className, disabled })}
        whileHover={!computedDisabled ? { scale: 1.05 } : undefined}
        whileTap={!computedDisabled ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 360, damping: 22 }}
        disabled={computedDisabled}
        aria-busy={loading || undefined}
        data-loading={loading ? 'true' : undefined}
        type={type}
        onClick={handleClick}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

type PrimaryButtonProps = HTMLMotionProps<'button'> & {
  loading?: boolean
  icon?: React.ReactNode
  size?: ButtonSize
}

const spinnerClass =
  'h-4 w-4 animate-spin text-white/90 [animation-duration:880ms] motion-reduce:hidden'

export function PrimaryButton({
  className = '',
  children,
  disabled,
  loading = false,
  icon,
  size = 'md',
  ...props
}: PrimaryButtonProps) {
  const { ['aria-busy']: ariaBusy, ...rest } = props
  const computedDisabled = disabled || loading
  const busy = loading || ariaBusy === true || ariaBusy === 'true' ? true : undefined

  return (
    <motion.button
      {...rest}
      disabled={computedDisabled}
      aria-busy={busy}
      data-loading={loading ? 'true' : undefined}
      whileHover={!computedDisabled ? { scale: 1.05 } : undefined}
      whileTap={!computedDisabled ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
      className={buttonClasses({ variant: 'primary', size, className, disabled: computedDisabled })}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className={spinnerClass} viewBox="0 0 24 24" fill="none" role="presentation">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path
              className="opacity-70"
              d="M4 12a8 8 0 018-8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span>{typeof children === 'string' ? children : 'Working...'}</span>
        </span>
      ) : (
        <>
          {icon ? <span className="flex items-center text-[length:inherit]">{icon}</span> : null}
          {typeof children === 'string' ? <span className="relative">{children}</span> : children}
        </>
      )}
    </motion.button>
  )
}
