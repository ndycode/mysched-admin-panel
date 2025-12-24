'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { spring } from '@/lib/motion'

interface ActiveFiltersPillsProps {
    activeFilters: string[]
    onClearFilters: () => void
}

export function ActiveFiltersPills({ activeFilters, onClearFilters }: ActiveFiltersPillsProps) {
    if (activeFilters.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
            className="mb-3 flex flex-wrap items-center gap-2"
        >
            <AnimatePresence mode="popLayout">
                {activeFilters.map((filter, index) => (
                    <motion.span
                        key={`${filter}-${index}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={spring}
                        layout
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm"
                    >
                        {filter}
                    </motion.span>
                ))}
            </AnimatePresence>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={onClearFilters}
                >
                    Clear filters
                </Button>
            </motion.div>
        </motion.div>
    )
}
