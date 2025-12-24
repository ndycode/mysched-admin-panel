'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { TimeInput } from '@/components/ui/TimeInput'
import { SectionSelector, InstructorSelector, DaySelector, SemesterSelector } from '@/components/selectors'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { normalizeTimeValue } from '@/lib/form-utils'
import { useInstructors } from '@/hooks/useAdminOptions'
import type { ClassRow } from '@/types/admin'
import type { DayValue } from '@/lib/days'

type ClassFormDialogProps = {
    mode: 'add' | 'edit'
    classData?: ClassRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => void
}

export function ClassFormDialog({
    mode,
    classData,
    open,
    onOpenChange,
    onComplete,
}: ClassFormDialogProps) {
    const toast = useToast()
    const { instructors } = useInstructors({ enabled: open })

    // Form state
    const [title, setTitle] = useState('')
    const [code, setCode] = useState('')
    const [semesterId, setSemesterId] = useState('')
    const [sectionId, setSectionId] = useState('')
    const [day, setDay] = useState<DayValue | ''>('')
    const [start, setStart] = useState('')
    const [end, setEnd] = useState('')
    const [units, setUnits] = useState('')
    const [room, setRoom] = useState('')
    const [instructorId, setInstructorId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && classData) {
                setTitle(classData.title ?? '')
                setCode(classData.code ?? '')
                setSectionId(classData.section_id ? String(classData.section_id) : '')
                setDay(classData.day ?? '')
                setStart(classData.start ?? '')
                setEnd(classData.end ?? '')
                setUnits(classData.units ? String(classData.units) : '')
                setRoom(classData.room ?? '')
                setInstructorId(classData.instructor_id ?? '')
            } else {
                // Reset for add mode
                setTitle('')
                setCode('')
                setSemesterId('')
                setSectionId('')
                setDay('')
                setStart('')
                setEnd('')
                setUnits('')
                setRoom('')
                setInstructorId('')
            }
            setSubmitting(false)
            setValidationError(null)
        }
    }, [open, mode, classData])

    // Reset section when semester changes (add mode only)
    useEffect(() => {
        if (mode === 'add') {
            setSectionId('')
        }
    }, [semesterId, mode])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const trimmedTitle = title.trim()
        const trimmedCode = code.trim()
        const normalizedStart = normalizeTimeValue(start)
        const normalizedEnd = normalizeTimeValue(end)

        // Validation
        if (!trimmedTitle) {
            setValidationError('Title is required')
            toast({ kind: 'error', msg: 'Class title is required' })
            return
        }
        if (!trimmedCode) {
            setValidationError('Code is required')
            toast({ kind: 'error', msg: 'Class code is required' })
            return
        }
        if (!sectionId) {
            setValidationError('Section is required')
            toast({ kind: 'error', msg: 'Select a section to link this class' })
            return
        }

        setSubmitting(true)
        setValidationError(null)

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
                instructor_id: instructorId || null,
                instructor: instructorId
                    ? instructors.find(i => i.id === instructorId)?.full_name ?? null
                    : null,
            }

            if (mode === 'add') {
                await api('/api/classes', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
                toast({ kind: 'success', msg: 'Class created' })
            } else {
                await api(`/api/classes/${classData!.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                })
                toast({ kind: 'success', msg: 'Class updated' })
            }

            onComplete()
            onOpenChange(false)
        } catch (error) {
            const { message } = normalizeApiError(error, `Failed to ${mode} class`)
            toast({ kind: 'error', msg: message })
            setValidationError(message)
        } finally {
            setSubmitting(false)
        }
    }

    const isAdd = mode === 'add'
    const dialogTitle = isAdd ? 'Add New Class' : 'Edit class'
    const dialogDescription = isAdd
        ? 'Create a new class and assign it to an existing section.'
        : 'Update class details, schedule, and assignment.'

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !val && !submitting && onOpenChange(false)}
            className="max-w-2xl"
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">{dialogTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{dialogDescription}</p>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
                    {validationError && (
                        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {validationError}
                        </p>
                    )}

                    {/* Title & Code */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Title
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
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
                                onChange={(e) => setCode(e.target.value)}
                                className="mt-2 w-full rounded-full border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="CS101"
                                required
                            />
                        </label>
                    </div>

                    {/* Semester (add mode only) & Section */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {isAdd && (
                            <label className="text-sm font-medium text-foreground">
                                Semester
                                <div className="mt-2">
                                    <SemesterSelector
                                        value={semesterId}
                                        onChange={setSemesterId}
                                        noneLabel="All semesters"
                                        className="w-full justify-between h-11 px-3"
                                    />
                                </div>
                            </label>
                        )}
                        <label className={`text-sm font-medium text-foreground ${!isAdd ? 'sm:col-span-1' : ''}`}>
                            Section
                            <div className="mt-2">
                                <SectionSelector
                                    value={sectionId}
                                    onChange={setSectionId}
                                    semesterId={semesterId || undefined}
                                    allowNone
                                    noneLabel="Select a section"
                                    className="w-full justify-between h-11 px-3"
                                />
                            </div>
                        </label>
                        {!isAdd && (
                            <label className="text-sm font-medium text-foreground">
                                Day
                                <div className="mt-2">
                                    <DaySelector value={day} onChange={setDay} className="w-full justify-between h-11 px-3" />
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Day (add mode) */}
                    {isAdd && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium text-foreground">
                                Day
                                <div className="mt-2">
                                    <DaySelector value={day} onChange={setDay} className="w-full justify-between h-11 px-3" />
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Time */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Start time
                            <TimeInput value={start} onChange={setStart} className="mt-2 w-full" />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                            End time
                            <TimeInput value={end} onChange={setEnd} className="mt-2 w-full" />
                        </label>
                    </div>

                    {/* Units & Room */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="text-sm font-medium text-foreground">
                            Units
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={units}
                                onChange={(e) => setUnits(e.target.value)}
                                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                        <label className="text-sm font-medium text-foreground sm:col-span-2">
                            Room
                            <input
                                type="text"
                                value={room}
                                onChange={(e) => setRoom(e.target.value)}
                                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </label>
                    </div>

                    {/* Instructor */}
                    <label className="text-sm font-medium text-foreground">
                        Instructor
                        <div className="mt-2">
                            <InstructorSelector
                                value={instructorId}
                                onChange={setInstructorId}
                                className="w-full justify-between h-11 px-3"
                            />
                        </div>
                    </label>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={isAdd ? Plus : Save}
                            label={isAdd ? 'Create Class' : 'Save changes'}
                            onClick={() => {
                                const form = document.querySelector('form')
                                if (form) form.requestSubmit()
                            }}
                            isLoading={submitting}
                            loadingLabel={isAdd ? 'Creating...' : 'Saving...'}
                            variant="primary"
                            className="rounded-full"
                        />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
