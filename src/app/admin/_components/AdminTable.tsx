'use client'

import React, { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { Skeleton } from '@/components/ui/Skeleton'
import { fadeIn, spring } from '@/lib/motion'


type AdminTableProps = {
  header: ReactNode
  children: ReactNode
  pagination?: ReactNode
  loading?: boolean
  loadingLabel?: ReactNode | null
  error?: string | null
  isEmpty?: boolean
  emptyMessage?: string | null
  colSpan: number
  minWidthClass?: string
}

export function AdminTable({
  header,
  children,
  pagination,
  loading = false,
  loadingLabel = null,
  error = null,
  isEmpty = false,
  emptyMessage = 'No records found.',
  colSpan,
  minWidthClass = 'min-w-screen-lg',
}: AdminTableProps) {
  return (
    <motion.section
      initial="initial"
      animate="animate"
      variants={fadeIn}
      transition={spring}
      className="space-y-3"
    >
      <div className="overflow-x-auto relative">
        <table
          className={`${minWidthClass} relative w-full divide-y divide-border text-sm text-foreground transform-gpu`}
          style={{ willChange: 'transform' }}
        >
          <thead className="bg-muted/50">{header}</thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence mode="wait">
              {loading ? (
                loadingLabel ? (
                  <motion.tr
                    key="loading-label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={colSpan} className="h-132 text-center align-middle">
                      {loadingLabel}
                    </td>
                  </motion.tr>
                ) : (
                  Array.from({ length: 11 }).map((_, i) => (
                    <motion.tr
                      key={`skeleton-row-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="h-13"
                    >
                      {Array.from({ length: colSpan }).map((_, j) => (
                        <td key={`skeleton-cell-${i}-${j}`} className="px-3 py-2.5 sm:px-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )
              ) : error ? (
                <motion.tr
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={colSpan} className="px-6 py-12 text-center text-sm text-destructive">
                    {error}
                  </td>
                </motion.tr>
              ) : isEmpty ? (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={colSpan} className="h-132 text-center align-middle">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                    </div>
                  </td>
                </motion.tr>
              ) : (
                children
              )}
            </AnimatePresence>
          </tbody>
        </table>
        {!loading && pagination ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="sticky bottom-0 inset-x-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:static sm:z-auto sm:bg-transparent sm:backdrop-blur-none sm:px-6"
          >
            {pagination}
          </motion.div>
        ) : null}
      </div>
    </motion.section>
  )
}
