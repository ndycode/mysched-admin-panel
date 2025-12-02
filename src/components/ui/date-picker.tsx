'use client'

import React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { ReactLenis } from '@studio-freight/react-lenis'

import { cn } from '@/lib/utils'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const

const lenisOptions = {
    lerp: 0.12,
    duration: 1.2,
    smoothWheel: true,
    wheelMultiplier: 1.2,
}

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}

export function DatePicker({ date, setDate, placeholder = 'Pick a date' }: DatePickerProps) {
    const todayRef = React.useRef(new Date())
    const [viewDate, setViewDate] = React.useState<Date>(() => date ?? todayRef.current)

    React.useEffect(() => {
        setViewDate(date ?? todayRef.current)
    }, [date])

    const month = viewDate.getMonth()
    const year = viewDate.getFullYear()
    const daysInMonth = React.useMemo(() => getDaysInMonth(year, month), [year, month])
    const days = React.useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth])

    const years = React.useMemo(() => {
        const currentYear = todayRef.current.getFullYear()
        const selectedYear = date?.getFullYear() ?? currentYear
        const start = Math.min(currentYear, selectedYear) - 5
        const end = Math.max(currentYear, selectedYear) + 5
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    }, [date])

    const selectedDay = date?.getDate() ?? null
    const selectedMonth = date?.getMonth() ?? null
    const selectedYear = date?.getFullYear() ?? null

    const applyDate = (nextYear: number, nextMonth: number, nextDay: number) => {
        const clampedDay = Math.min(nextDay, getDaysInMonth(nextYear, nextMonth))
        const nextDate = new Date(nextYear, nextMonth, clampedDay)
        setViewDate(nextDate)
        setDate(nextDate)
    }

    const label = date ? format(date, 'PP') : placeholder

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <AnimatedActionBtn
                    label={label}
                    icon={CalendarIcon}
                    variant="secondary"
                    className={cn(
                        'w-full justify-between px-3 font-medium',
                        !date && 'text-muted-foreground',
                    )}
                />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-[360px] border border-border/60 bg-background/90 p-0 shadow-xl backdrop-blur-xl"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }}
                    className="overflow-hidden rounded-lg"
                >
                    <div className="flex h-64 divide-x divide-border bg-muted/20">
                        <div className="flex-1 min-w-[110px]">
                            <div className="bg-muted/50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                                Month
                            </div>
                            <ReactLenis className="h-[calc(16rem-34px)] overflow-y-auto p-1" options={lenisOptions}>
                                {MONTHS.map((m, idx) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={event => {
                                            event.preventDefault()
                                            applyDate(year, idx, date?.getDate() ?? todayRef.current.getDate())
                                        }}
                                        className={cn(
                                            'w-full rounded-md px-2 py-1.5 text-sm font-medium text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                                            selectedMonth === idx && selectedYear === year && 'bg-accent text-accent-foreground',
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </ReactLenis>
                        </div>

                        <div className="flex-1 min-w-[90px]">
                            <div className="bg-muted/50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                                Day
                            </div>
                            <ReactLenis className="h-[calc(16rem-34px)] overflow-y-auto p-1" options={lenisOptions}>
                                {days.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={event => {
                                            event.preventDefault()
                                            applyDate(year, month, day)
                                        }}
                                        className={cn(
                                            'w-full rounded-md px-2 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground',
                                            selectedDay === day && selectedMonth === month && selectedYear === year && 'bg-accent text-accent-foreground',
                                        )}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </ReactLenis>
                        </div>

                        <div className="flex-1 min-w-[90px] bg-muted/10">
                            <div className="bg-muted/50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                                Year
                            </div>
                            <ReactLenis className="h-[calc(16rem-34px)] overflow-y-auto p-1" options={lenisOptions}>
                                {years.map(y => (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={event => {
                                            event.preventDefault()
                                            applyDate(y, month, selectedDay ?? Math.min(viewDate.getDate(), getDaysInMonth(y, month)))
                                        }}
                                        className={cn(
                                            'w-full rounded-md px-2 py-1.5 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground',
                                            selectedYear === y && 'bg-accent text-accent-foreground',
                                        )}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </ReactLenis>
                        </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2">
                        <button
                            type="button"
                            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                            onClick={() => setDate(undefined)}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                            onClick={() => applyDate(
                                todayRef.current.getFullYear(),
                                todayRef.current.getMonth(),
                                todayRef.current.getDate(),
                            )}
                        >
                            Today
                        </button>
                    </div>
                </motion.div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
