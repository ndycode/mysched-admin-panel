'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ReactLenis } from 'lenis/react'
import { ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { TimeInput } from '@/components/ui/TimeInput'
import { DAY_SELECT_OPTIONS, DayValue } from '@/lib/days'

type AddClassDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreated: () => void
}

type Section = { id: number; code: string | null }
type InstructorSummary = {
    id: string
    full_name: string
    email: string | null
    title: string | null
    department: string | null
    avatar_url: string | null
}

function normalizeTimeValue(value: string | null | undefined): string {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,6})?)?(?:\s*([ap]m))?$/i)
    if (!match) return trimmed
    let hours = Number(match[1])
    const minutes = match[2]
    const meridiem = match[3]?.toLowerCase()
    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
    const hoursStr = hours.toString().padStart(2, '0')
    return `${hoursStr}:${minutes}`
}

export function AddClassDialog({ open, onOpenChange, onCreated }: AddClassDialogProps) {
    const toast = useToast()
    const [title, setTitle] = useState('')
    const [code, setCode] = useState('')
    const [sectionId, setSectionId] = useState('')
    const [day, setDay] = useState<DayValue | ''>('')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [units, setUnits] = useState('')
    const [room, setRoom] = useState('')
    const [instructorId, setInstructorId] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Fetch sections
    const { data: sections = [] } = useQuery({
        queryKey: ['sections', 'options'],
        queryFn: async () => {
            return await api<Section[]>('/api/sections')
        },
        enabled: open,
    })

    // Fetch instructors
    const { data: instructors = [] } = useQuery({
        queryKey: ['instructors', 'options'],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.set('limit', '200')
            params.set('sort', 'name')
            const response = await api<{ rows: InstructorSummary[] }>(
                `/api/instructors?${params.toString()}`,
            )
            return response.rows ?? []
        },
        enabled: open,
    })

    const hasSections = sections.length > 0

    useEffect(() => {
        if (!open) {
            setTitle('')
            setCode('')
            setSectionId('')
            setDay('')
            setStart('')
            setEnd('')
            setUnits('')
            setRoom('')
            setInstructorId('')
            setSubmitting(false)
        }
    }, [open])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const trimmedTitle = title.trim()
        const trimmedCode = code.trim()
        const normalizedStart = normalizeTimeValue(start)
        const normalizedEnd = normalizeTimeValue(end)

        if (!trimmedTitle) {
            toast({ kind: 'error', msg: 'Class title is required' })
            return
        }
        if (!trimmedCode) {
            toast({ kind: 'error', msg: 'Class code is required' })
            return
        }
        if (!hasSections || !sectionId) {
            toast({ kind: 'error', msg: 'Select a section to link this class' })
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                section_id: Number(sectionId),
                day: day || null,
                start: normalizedStart || null,
                end: normalizedEnd || null,
                code: trimmedCode,
                title: trimmedTitle,
                units: units ? Number(units) : null,
                room: room.trim() || null,
                instructor_id: instructorId ? instructorId : null,
                instructor: instructorId
                    ? instructors.find(item => item.id === instructorId)?.full_name ?? null
                    : null,
            }
            await api('/api/classes', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
            toast({ kind: 'success', msg: 'Class created' })
            onCreated()
            onOpenChange(false)
        } catch (error) {
            const { message } = normalizeApiError(error, 'Failed to create class')
            toast({ kind: 'error', msg: message })
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !val && !submitting && onOpenChange(false)}
            className="max-w-2xl"
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">Add class</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create a new class and assign it to an existing section.
                </p>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Title
                            <input
                                type="text"
                                value={title}
                                onChange={event => setTitle(event.target.value)}
                                className="mt-2 w-full rounded-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Introduction to Programming"
                                required
                            />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                            Code
                            <input
                                type="text"
                                value={code}
                                onChange={event => setCode(event.target.value)}
                                className="mt-2 w-full rounded-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="CS101"
                                required
                            />
                        </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Section
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <AnimatedActionBtn
                                        label={
                                            sectionId
                                                ? sections.find(s => String(s.id) === sectionId)?.code ?? `Section ${sectionId}`
                                                : 'Select a section'
                                        }
                                        icon={ChevronDown}
                                        variant="secondary"
                                        className="w-full justify-between h-11 px-3 mt-2 rounded-full"
                                        disabled={!hasSections}
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0">
                                    <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                                        <DropdownMenuItem onClick={() => setSectionId('')}>
                                            Select a section
                                        </DropdownMenuItem>
                                        {sections.map(section => (
                                            <DropdownMenuItem
                                                key={section.id}
                                                onClick={() => setSectionId(String(section.id))}
                                            >
                                                {section.code ?? `Section ${section.id}`}
                                            </DropdownMenuItem>
                                        ))}
                                    </ReactLenis>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </label>
                        <label className="text-sm font-medium text-foreground">
                            Day
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <AnimatedActionBtn
                                        label={
                                            day
                                                ? DAY_SELECT_OPTIONS.find(o => o.value === day)?.label ?? day
                                                : 'Unscheduled'
                                        }
                                        icon={ChevronDown}
                                        variant="secondary"
                                        className="w-full justify-between h-11 px-3 mt-2"
                                    />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0">
                                    <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                                        <DropdownMenuItem onClick={() => setDay('')}>
                                            Unscheduled
                                        </DropdownMenuItem>
                                        {DAY_SELECT_OPTIONS.map(opt => (
                                            <DropdownMenuItem
                                                key={opt.value}
                                                onClick={() => setDay(opt.value as DayValue)}
                                            >
                                                {opt.label}
                                            </DropdownMenuItem>
                                        ))}
                                    </ReactLenis>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Start time
                            <TimeInput
                                value={start}
                                onChange={setStart}
                                className="mt-2 w-full rounded-full"
                            />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                            End time
                            <TimeInput
                                value={end}
                                onChange={setEnd}
                                className="mt-2 w-full rounded-full"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-medium text-foreground">
                            Units
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={units}
                                onChange={event => setUnits(event.target.value)}
                                className="mt-2 w-full rounded-full border border-input bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="3"
                            />
                        </label>
                        <label className="text-sm font-medium text-foreground sm:col-span-2">
                            Room
                            <input
                                type="text"
                                value={room}
                                onChange={event => setRoom(event.target.value)}
                                className="mt-2 w-full rounded-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Room 204"
                            />
                        </label>
                    </div>

                    <label className="text-sm font-medium text-foreground">
                        Instructor
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <AnimatedActionBtn
                                    label={
                                        instructorId
                                            ? instructors.find(item => item.id === instructorId)?.full_name ?? 'Unassigned'
                                            : 'Unassigned'
                                    }
                                    icon={ChevronDown}
                                    variant="secondary"
                                    className="w-full justify-between h-11 px-3 mt-2 rounded-full"
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0">
                                <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                                    <DropdownMenuItem onClick={() => setInstructorId('')}>
                                        Unassigned
                                    </DropdownMenuItem>
                                    {instructors.map(instructor => (
                                        <DropdownMenuItem
                                            key={instructor.id}
                                            onClick={() => setInstructorId(instructor.id)}
                                        >
                                            {instructor.full_name}
                                        </DropdownMenuItem>
                                    ))}
                                </ReactLenis>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            variant="secondary"
                            className="rounded-full"
                        />
                        <AnimatedActionBtn
                            icon={Plus}
                            label="Create class"
                            onClick={() => {
                                // Trigger form submission programmatically
                                const form = document.querySelector('form')
                                if (form) form.requestSubmit()
                            }}
                            isLoading={submitting}
                            loadingLabel="Creating..."
                            variant="primary"
                            className="rounded-full"
                        />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
