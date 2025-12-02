'use client'

/**
 * Card component: Figma-style rounded card for admin UI.
 * @param className - Additional CSS classes
 * @param props - Other div props
 */
import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

export function Card({ className = '', ...props }: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`card-surface dashboard-card relative overflow-hidden bg-card text-card-foreground ${className}`}
      {...props}
    />
  )
}
/**
 * CardHeader component: Top section of a Card, for titles or actions.
 * @param className - Additional CSS classes
 * @param props - Other div props
 */
export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 pt-6 ${className}`} {...props} />
}
/**
 * CardBody component: Main content area of a Card.
 * @param className - Additional CSS classes
 * @param props - Other div props
 */
export function CardBody({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 pb-6 ${className}`} {...props} />
}
