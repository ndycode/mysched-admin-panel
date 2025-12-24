'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { DURATION } from '@/lib/motion'

/**
 * MetricTitle: Title for a metric card
 */
export function MetricTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.FAST }}
      className={`text-xs font-medium text-muted-foreground ${className}`.trim()}
    >
      {children}
    </motion.div>
  )
}

/**
 * MetricValue: Value for a metric card with count-up animation
 */
export function MetricValue({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: DURATION.STANDARD, type: 'spring', stiffness: 200 }}
      className={`mt-2 text-4xl font-bold text-[color:var(--brand-500)] ${className}`.trim()}
    >
      {children}
    </motion.div>
  )
}

/**
 * Subtext: Secondary text with fade-in
 */
export function Subtext({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.FAST, delay: 0.1 }}
      className={`text-sm text-muted-foreground ${className}`.trim()}
    >
      {children}
    </motion.div>
  )
}
