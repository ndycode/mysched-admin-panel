'use client'

import React from 'react'
import { motion } from 'framer-motion'

export const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white/70 px-3 py-0.5 text-xs font-medium text-[var(--brand-strong)]/80 backdrop-blur ${className || ''}`}
    >
        {children}
    </motion.span>
)
