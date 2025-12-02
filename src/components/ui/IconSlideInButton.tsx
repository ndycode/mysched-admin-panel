'use client'

import React, { forwardRef } from 'react'
import { motion, HTMLMotionProps, Transition } from 'framer-motion'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { cn } from '@/lib/utils'

export interface IconSlideInButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    icon?: React.ElementType
    label: string
    isLoading?: boolean
    loadingLabel?: string
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
}

export const IconSlideInButton = forwardRef<HTMLButtonElement, IconSlideInButtonProps>(
    ({ className, icon: Icon, label, isLoading, loadingLabel, variant = 'primary', disabled, ...props }, ref) => {
        const isPrimary = variant === 'primary'

        // Default colors from the Framer code
        const defaultBg = "rgb(255, 255, 255)"
        const defaultText = "rgb(0, 0, 0)"
        const hoverBg = "rgb(0, 85, 255)"
        const hoverText = "rgb(255, 255, 255)"

        const baseStyles = cn(
            "relative flex items-center justify-center overflow-hidden rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            // We handle colors via motion styles now for the specific animation
            // keeping base structure styles
            className
        )

        const transition: Transition = {
            type: "spring",
            bounce: 0.1,
            duration: 0.5
        }

        return (
            <motion.button
                ref={ref}
                className={baseStyles}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                disabled={disabled || isLoading}
                layout
                variants={{
                    initial: {
                        backgroundColor: defaultBg,
                        color: defaultText
                    },
                    hover: {
                        backgroundColor: hoverBg,
                        color: hoverText
                    }
                }}
                transition={transition}
                {...props}
            >
                <div className="flex items-center justify-center relative w-full h-full">
                    {isLoading ? (
                        <LoadingIndicator label={loadingLabel || label} className="text-inherit" />
                    ) : (
                        <>
                            <motion.span
                                layout
                                className="z-10"
                                transition={transition}
                            >
                                {label}
                            </motion.span>
                            {Icon && (
                                <motion.div
                                    className="flex items-center overflow-hidden"
                                    variants={{
                                        initial: { width: 0, opacity: 0, marginLeft: 0 },
                                        hover: { width: "auto", opacity: 1, marginLeft: 8 }
                                    }}
                                    transition={transition}
                                >
                                    <Icon className="h-5 w-5" />
                                </motion.div>
                            )}
                        </>
                    )}
                </div>
            </motion.button>
        )
    }
)

IconSlideInButton.displayName = 'IconSlideInButton'
