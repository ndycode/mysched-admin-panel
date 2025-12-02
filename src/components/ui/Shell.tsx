import React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
        <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-none absolute inset-x-0 top-0 h-28 origin-top rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(10,132,255,0.18),transparent_70%)]"
            aria-hidden
        />
        <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
            className="relative mb-10 flex flex-col gap-3"
        >
            <span className="caps-label rounded-full border border-[var(--border-soft)] bg-white/80 px-4 py-1 text-[var(--brand-strong)]/75 backdrop-blur">
                Dashboard
            </span>
            <h1 className="text-3xl font-semibold text-[var(--muted-strong)] sm:text-[2.25rem]">{title}</h1>
            {description ? <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">{description}</p> : null}
        </motion.header>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
            className="relative space-y-10"
        >
            {children}
        </motion.div>
    </div>
)
