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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/DropdownMenu'
import { Spinner } from '@/components/ui/Spinner'
import { useSections } from '@/hooks/useAdminOptions'

type SectionSelectorProps = {
    value: string
    onChange: (value: string) => void
    semesterId?: string
    disabled?: boolean
    allowNone?: boolean
    noneLabel?: string
    className?: string
    variant?: 'flat' | 'cascading'
}

export function SectionSelector({
    value,
    onChange,
    semesterId,
    disabled = false,
    allowNone = true,
    noneLabel = 'Select a section',
    className,
    variant = 'cascading',
}: SectionSelectorProps) {
    const { sections, groupedSections, isLoading } = useSections({
        semesterId: semesterId || undefined
    })

    const selectedSection = sections.find(s => String(s.id) === value)
    const hasSections = sections.length > 0

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AnimatedActionBtn
                    label={selectedSection?.code ?? noneLabel}
                    icon={ChevronDown}
                    variant="secondary"
                    className={className ?? 'w-full justify-between h-11 px-3'}
                    disabled={disabled || isLoading || !hasSections}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-0">
                <div className="relative">
                    {isLoading && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                Loading sections...
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

                        {variant === 'cascading' ? (
                            // Cascading dropdown grouped by course
                            groupedSections.map(({ course, sections: courseSections }) => (
                                <DropdownMenuSub key={course}>
                                    <DropdownMenuSubTrigger className="text-sm">
                                        {course}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {courseSections.map(section => (
                                            <DropdownMenuItem
                                                key={section.id}
                                                onClick={() => onChange(String(section.id))}
                                            >
                                                {section.code || `Section ${section.id}`}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            ))
                        ) : (
                            // Flat list
                            sections.map(section => (
                                <DropdownMenuItem
                                    key={section.id}
                                    onClick={() => onChange(String(section.id))}
                                >
                                    {section.code || `Section ${section.id}`}
                                </DropdownMenuItem>
                            ))
                        )}
                    </ReactLenis>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
