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
import { useInstructors } from '@/hooks/useAdminOptions'

type InstructorSelectorProps = {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
    allowNone?: boolean
    noneLabel?: string
    className?: string
}

export function InstructorSelector({
    value,
    onChange,
    disabled = false,
    allowNone = true,
    noneLabel = 'Unassigned',
    className,
}: InstructorSelectorProps) {
    const { instructors, isLoading } = useInstructors()

    const selectedInstructor = instructors.find(i => i.id === value)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AnimatedActionBtn
                    label={selectedInstructor?.full_name ?? noneLabel}
                    icon={ChevronDown}
                    variant="secondary"
                    className={className ?? 'w-full justify-between h-11 px-3'}
                    disabled={disabled || isLoading}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-0">
                <div className="relative">
                    {isLoading && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                Loading instructors...
                            </div>
                        </div>
                    )}
                    <ReactLenis className="max-h-80 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                        {allowNone && (
                            <>
                                <DropdownMenuItem onClick={() => onChange('')}>
                                    {noneLabel}
                                </DropdownMenuItem>
                                <div className="my-1 border-t border-border" />
                            </>
                        )}
                        {instructors.map(instructor => (
                            <DropdownMenuItem
                                key={instructor.id}
                                onClick={() => onChange(instructor.id)}
                            >
                                {instructor.full_name}
                            </DropdownMenuItem>
                        ))}
                    </ReactLenis>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
