'use client'

import React from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { ReactLenis } from 'lenis/react'

interface TimeInputProps {
    value: string
    onChange: (value: string) => void
    className?: string
    disabled?: boolean
}

export function TimeInput({ value, onChange, className, disabled }: TimeInputProps) {
    const [typedValue, setTypedValue] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)

    // Parse time value (HH:mm) to 12h format parts
    const { hours, minutes, period } = React.useMemo(() => {
        if (!value) return { hours: 12, minutes: 0, period: 'AM' }
        const [rawHours, rawMinutes] = value.split(':').map(Number)
        if (!Number.isFinite(rawHours) || !Number.isFinite(rawMinutes)) return { hours: 12, minutes: 0, period: 'AM' }

        const safeHours = Math.min(Math.max(rawHours, 0), 23)
        const safeMinutes = Math.min(Math.max(rawMinutes, 0), 59)
        const period = safeHours >= 12 ? 'PM' : 'AM'
        const hours = safeHours % 12 || 12
        return { hours, minutes: safeMinutes, period }
    }, [value])

    const handleTimeChange = (newHours: number, newMinutes: number, newPeriod: string) => {
        let h = newHours
        if (newPeriod === 'PM' && h !== 12) h += 12
        if (newPeriod === 'AM' && h === 12) h = 0

        onChange(`${h.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`)
        setError(null)
        setTypedValue('')
    }

    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`
    const displayLabel = value ? formattedTime : '--:-- --'

    const lenisOptions = {
        lerp: 0.12,
        duration: 1.2,
        smoothWheel: true,
        wheelMultiplier: 1.2
    }

    const tryParseTyped = () => {
        const raw = typedValue.trim()
        if (!raw) return
        const match = raw.match(/^(\d{1,2}):(\d{2})(\s*[ap]m)?$/i)
        if (!match) {
            setError('Enter time as HH:MM or HH:MM AM/PM')
            return
        }
        let h = Number(match[1])
        let m = Number(match[2])
        const mer = match[3]?.toLowerCase()
        if (m > 59) m = 59
        if (h > 23) h = 23
        if (mer === ' pm' || mer === 'pm') {
            if (h !== 12) h += 12
        } else if (mer === ' am' || mer === 'am') {
            if (h === 12) h = 0
        }
        onChange(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
        setError(null)
    }

    return (
        <div className="space-y-1">
            <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={disabled}>
                    <AnimatedActionBtn
                        label={displayLabel}
                        icon={Clock}
                        variant="secondary"
                        className={cn("w-full justify-between px-3 font-mono", className)}
                        disabled={disabled}
                        onKeyDown={(event) => {
                            if (disabled) return
                            if (event.key === 'Enter') {
                                event.preventDefault()
                                tryParseTyped()
                                return
                            }
                            if (event.key === 'Escape') {
                                setTypedValue('')
                                setError(null)
                                return
                            }
                            const acceptable = /^[0-9apm:\s]$/i.test(event.key)
                            if (acceptable) {
                                setTypedValue(prev => (prev + event.key).trimStart())
                                setError(null)
                            }
                        }}
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    className="w-[240px] p-0"
                    align="start"
                >
                    <div className="flex h-48 overflow-hidden rounded-md divide-x divide-border">
                    {/* Hours Column */}
                        <div className="flex-1 min-w-[60px]">
                            <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Hr</div>
                            <ReactLenis className="h-[calc(12rem-33px)] overflow-y-auto p-1" options={lenisOptions}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <button
                                        key={h}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleTimeChange(h, minutes, period)
                                        }}
                                        className={cn(
                                            "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                            hours === h && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        {h}
                                    </button>
                                ))}
                            </ReactLenis>
                        </div>

                        {/* Minutes Column */}
                        <div className="flex-1 min-w-[60px]">
                            <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Min</div>
                            <ReactLenis className="h-[calc(12rem-33px)] overflow-y-auto p-1" options={lenisOptions}>
                                {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleTimeChange(hours, m, period)
                                        }}
                                        className={cn(
                                            "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                            minutes === m && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        {m.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </ReactLenis>
                        </div>

                        {/* AM/PM Column */}
                        <div className="flex-1 min-w-[60px] bg-muted/10">
                            <div className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center bg-muted/50 border-b border-border">Pd</div>
                            <div className="p-1 space-y-1">
                                {['AM', 'PM'].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        aria-label={`Select ${p}`}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            handleTimeChange(hours, minutes, p)
                                        }}
                                        className={cn(
                                            "w-full rounded-md px-1 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground",
                                            period === p && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <label className="sr-only" htmlFor="timeinput-typed">Type time</label>
                <input
                    id="timeinput-typed"
                    aria-label="Type time (HH:MM or HH:MM AM/PM)"
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                    placeholder="Type time e.g. 14:30 or 2:30 pm"
                    value={typedValue}
                    onChange={(e) => setTypedValue(e.target.value)}
                    onBlur={tryParseTyped}
                    disabled={disabled}
                />
            </div>
            {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
        </div>
    )
}
