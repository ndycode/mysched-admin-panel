'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { buttonClasses, type ButtonVariant } from './Button'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

import { HTMLMotionProps } from 'framer-motion'

interface AnimatedActionBtnProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  icon?: any
  label: string
  variant?: ButtonVariant | 'secondary'
  isLoading?: boolean
  loadingLabel?: string
  iconClassName?: string
  spinner?: 'default' | 'icon' | 'framer'
}

export const AnimatedActionBtn = React.forwardRef<HTMLButtonElement, AnimatedActionBtnProps>(
  (
    {
      icon: Icon,
      label,
      onClick,
      variant = 'secondary',
      isLoading,
      loadingLabel,
      disabled,
      className,
      type = 'button',
      iconClassName,
      spinner = 'default',
      ...props
    },
    ref
  ) => {
    const computedDisabled = disabled || isLoading

    const classes = cn(buttonClasses({ variant, size: 'md', className }), 'px-5 whitespace-nowrap')

    const renderSpinner = () => {
      if (spinner === 'icon' && Icon) {
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="flex items-center justify-center"
          >
            <Icon className={cn('h-4 w-4', iconClassName)} aria-hidden />
          </motion.div>
        )
      }
      // Use global Spinner for consistency (framer or default)
      return <Spinner className={cn('h-4 w-4', iconClassName)} />
    }

    return (
      <motion.button
        ref={ref}
        layout
        type={type}
        onClick={onClick}
        disabled={computedDisabled}
        whileHover={!computedDisabled ? { scale: 1.05 } : undefined}
        whileTap={!computedDisabled ? { scale: 0.97 } : undefined}
        transition={{
          layout: { duration: 0.3, type: 'spring', bounce: 0, stiffness: 300, damping: 30 },
          scale: { type: 'spring', stiffness: 360, damping: 22 },
        }}
        className={classes}
        {...props}
      >
        <div className="relative flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-center gap-2"
              >
                {Icon ? renderSpinner() : null}
                <span>{loadingLabel || label}</span>
              </motion.div>
            ) : (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-center gap-2"
              >
                {Icon && <Icon className={cn('h-4 w-4', iconClassName)} aria-hidden />}
                <span>{label}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    )
  }
)
AnimatedActionBtn.displayName = 'AnimatedActionBtn'
