import React from 'react'
import { Button } from '@/components/ui'

interface ActiveFiltersPillsProps {
    activeFilters: string[]
    onClearFilters: () => void
}

export function ActiveFiltersPills({ activeFilters, onClearFilters }: ActiveFiltersPillsProps) {
    if (activeFilters.length === 0) return null

    return (
        <div className="mb-3 flex flex-wrap items-center gap-2">
            {activeFilters.map((filter, index) => (
                <span
                    key={`${filter}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm"
                >
                    {filter}
                </span>
            ))}
            <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs"
                onClick={onClearFilters}
            >
                Clear filters
            </Button>
        </div>
    )
}
