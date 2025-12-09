'use client'

import React, { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    /** Show indeterminate state (- icon) */
    indeterminate?: boolean
}

/**
 * Custom styled Checkbox component matching the design system.
 * Features: rounded corners, primary color fill, subtle scale animation, checkmark icon.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, indeterminate, disabled, onChange, ...props }, ref) => {
        const isChecked = checked || indeterminate

        return (
            <label className={cn('relative inline-flex items-center cursor-pointer p-2 -m-2', disabled && 'cursor-not-allowed opacity-60')}>
                {/* Hidden native input for accessibility */}
                <input
                    ref={ref}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={onChange}
                    className="sr-only peer"
                    {...props}
                />
                {/* Custom visual checkbox */}
                <motion.div
                    className={cn(
                        'h-[18px] w-[18px] rounded-md border-2 flex items-center justify-center transition-colors duration-150',
                        isChecked
                            ? 'bg-primary border-primary'
                            : 'bg-background border-border hover:border-primary/50',
                        'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
                        className
                    )}
                    whileTap={!disabled ? { scale: 0.9 } : undefined}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    {isChecked && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        >
                            {indeterminate ? (
                                <Minus className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                            ) : (
                                <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                            )}
                        </motion.div>
                    )}
                </motion.div>
            </label>
        )
    }
)

Checkbox.displayName = 'Checkbox'
