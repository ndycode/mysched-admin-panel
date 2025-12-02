import React from 'react'
import { motion } from 'framer-motion'

type LoadingIndicatorProps = {
  label?: string
  className?: string
}

const dotVariants = {
  animate: {
    y: [0, -4, 0],
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export function LoadingIndicator({ label = 'Loading...', className }: LoadingIndicatorProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(index => (
          <motion.span
            key={index}
            className="h-2.5 w-2.5 rounded-full bg-muted-foreground/70"
            variants={dotVariants}
            animate="animate"
            transition={{ delay: index * 0.12 }}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  )
}
