'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export const Table = ({ children, className, role, ariaLabel }: {
    children: React.ReactNode;
    className?: string;
    role?: string;
    ariaLabel?: string;
}) => (
    <div className={cn('overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-white/80 backdrop-blur', className)}>
        <table
            className="min-w-full border-separate border-spacing-0 text-sm text-[var(--muted-strong)]"
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
            'caps-label sticky top-0 z-10 border-b border-[var(--border-soft)] bg-white/90 px-4 py-3 text-left text-[var(--muted-foreground)]/80',
            'first:rounded-tl-2xl last:rounded-tr-2xl',
            className,
        )}
    >
        {children}
    </th>
)

import { motion } from 'framer-motion'

export const Tr = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <motion.tr
        initial={{ opacity: 0, y: 8, scale: 0.99 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ type: "spring", stiffness: 620, damping: 32, mass: 0.9 }}
        whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.95)" }}
        className={cn("odd:bg-white/70 even:bg-white/60 cursor-default", className)}
        style={{ willChange: 'transform, opacity' }}
    >
        {children}
    </motion.tr>
)

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
        className={cn('border-b border-[var(--border-faint)] px-4 py-3 align-top text-[var(--muted-foreground)]', className)}
    >
        {children}
    </td>
)
