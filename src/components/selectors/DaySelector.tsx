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
import { DAY_SELECT_OPTIONS, DayValue } from '@/lib/days'

type DaySelectorProps = {
    value: DayValue | ''
    onChange: (value: DayValue | '') => void
    disabled?: boolean
    allowNone?: boolean
    noneLabel?: string
    className?: string
}

export function DaySelector({
    value,
    onChange,
    disabled = false,
    allowNone = true,
    noneLabel = 'Unscheduled',
    className,
}: DaySelectorProps) {
    const selectedDay = DAY_SELECT_OPTIONS.find(d => d.value === value)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AnimatedActionBtn
                    label={selectedDay?.label ?? noneLabel}
                    icon={ChevronDown}
                    variant="secondary"
                    className={className ?? 'w-full justify-between h-11 px-3'}
                    disabled={disabled}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px] p-0">
                <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                    {allowNone && (
                        <DropdownMenuItem onClick={() => onChange('')}>
                            {noneLabel}
                        </DropdownMenuItem>
                    )}
                    {DAY_SELECT_OPTIONS.map(option => (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => onChange(option.value as DayValue)}
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </ReactLenis>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
