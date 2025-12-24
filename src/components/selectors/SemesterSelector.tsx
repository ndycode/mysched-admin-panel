'use client'

import React from 'react'
import { ReactLenis } from 'lenis/react'
import { ChevronDown } from 'lucide-react'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/Spinner'
import { useSemesters } from '@/hooks/useAdminOptions'
import { ActiveBadge } from '@/components/ui/ActiveBadge'

type SemesterSelectorProps = {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    showActiveOnly?: boolean
    allowNone?: boolean
    noneLabel?: string
    className?: string
}

export function SemesterSelector({
    value,
    onChange,
    disabled = false,
    showActiveOnly = false,
    allowNone = true,
    noneLabel = 'All Semesters',
    className,
}: SemesterSelectorProps) {
    const { semesters, isLoading } = useSemesters()

    const filteredSemesters = showActiveOnly
        ? semesters.filter(s => s.is_active)
        : semesters

    const selectedSemester = semesters.find(s => String(s.id) === value)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AnimatedActionBtn
                    label={selectedSemester?.name ?? noneLabel}
                    icon={ChevronDown}
                    variant="secondary"
                    className={className ?? 'justify-between gap-2 px-4'}
                    disabled={disabled || isLoading}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-0">
                <div className="relative">
                    {isLoading && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                Loading...
                            </div>
                        </div>
                    )}
                    <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                        {allowNone && (
                            <>
                                <DropdownMenuItem onClick={() => onChange('')}>
                                    {noneLabel}
                                </DropdownMenuItem>
                                <div className="my-1 border-t border-border" />
                            </>
                        )}
                        {filteredSemesters.map(semester => (
                            <DropdownMenuItem
                                key={semester.id}
                                onClick={() => onChange(String(semester.id))}
                            >
                                <span className="flex items-center gap-2">
                                    {semester.name}
                                    {semester.is_active && <ActiveBadge />}
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </ReactLenis>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
