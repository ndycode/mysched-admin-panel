import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { safeLayout } from '@/lib/motion'

const MotionLink = motion.create(Link)

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
    <MotionLink
        href={href}
        aria-current={active ? 'page' : undefined}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
            'relative rounded-2xl px-4 py-2 text-sm font-semibold',
            active
                ? 'border border-[var(--brand)]/40 bg-[var(--brand-soft)] text-[var(--brand-strong)] shadow-[0_16px_36px_-28px_rgba(10,132,255,0.35)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--brand-strong)] hover:bg-white/80',
            className
        )}
    >
        {active && (
            <motion.div
                layoutId={safeLayout ? "nav-pill" : undefined}
                className="absolute inset-0 rounded-2xl bg-[var(--brand-soft)] -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
        <span className="relative z-10">{label}</span>
    </MotionLink>
)
