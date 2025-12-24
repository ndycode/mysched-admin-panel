'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { CardSurface, SectionHeader } from './design-system'
import { PrimaryButton } from '@/components/ui'
import { spring, slideUp } from '@/lib/motion'

type AdminErrorViewProps = {
  label?: string
  title: string
  description: string
  error: Error
  onRetry: () => void
}

export function AdminErrorView({ label = 'Dashboard', title, description, error, onRetry }: AdminErrorViewProps) {
  console.error(error)

  return (
    <motion.main
      initial="initial"
      animate="animate"
      variants={slideUp}
      transition={spring}
      className="min-h-screen bg-background px-4 py-10"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <SectionHeader label={label} title={title} subtitle={description} level="page" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, ...spring }}
        >
          <CardSurface className="text-center border-destructive/30 bg-destructive/5 shadow-md">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Please try again</h2>
              <p className="text-sm text-muted-foreground break-words">
                {error.message || 'An unexpected error occurred.'}
              </p>
            </div>
            <motion.div
              className="mt-4 flex justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
            </motion.div>
          </CardSurface>
        </motion.div>
      </div>
    </motion.main>
  )
}
