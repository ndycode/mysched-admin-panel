'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Tab = {
    value: string
    label: string
}

type AnimatedTabsProps = {
    tabs: (Tab | string)[]
    activeTab: string
    onChange?: (value: string) => void
    onTabChange?: (value: string) => void
    layoutId: string
    className?: string
}

export function AnimatedTabs({ tabs, activeTab, onChange, onTabChange, layoutId, className }: AnimatedTabsProps) {
    const handleChange = onChange || onTabChange

    return (
        <div className={cn("flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1", className)}>
            {tabs.map((t) => {
                const tab = typeof t === 'string' ? { value: t, label: t } : t
                const isActive = activeTab === tab.value
                return (
                    <button
                        key={tab.value}
                        onClick={() => handleChange?.(tab.value)}
                        className={cn(
                            "relative rounded-md px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                        style={{
                            WebkitTapHighlightColor: "transparent",
                        }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId={layoutId}
                                className="absolute inset-0 z-0 rounded-md bg-background shadow-md"
                                transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                            />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
