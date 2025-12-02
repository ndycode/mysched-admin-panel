'use client'

import React, { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, UserPlus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Button } from '@/components/ui'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { dayLabel } from '@/lib/days'
import { AdminTable } from '../../_components/AdminTable'

type Instructor = {
    id: string
    full_name: string
    email: string | null
    title: string | null
    department: string | null
    avatar_url: string | null
}

type ScheduleClass = {
    class_id: number
    code: string | null
    title: string | null
    units: number | null
    day: string | number | null
    start: string | null
    end: string | null
    room: string | null
    section_id: number | null
}

type InstructorScheduleResponse = {
    instructor: {
        id: string
        full_name: string | null
        department: string | null
        email: string | null
        avatar_url: string | null
    }
    classes: ScheduleClass[]
}

type UnassignedResponse = {
    classes: ScheduleClass[]
}

type ClassActionVariables = {
    classId: number
    code?: string | null
}

type MutationResponse = {
    ok: boolean
    classId: number
    instructorId?: string
}

type ScheduleDialogProps = {
    instructor: Instructor | null
    open: boolean
    onClose: () => void
}

import { Spinner } from '@/components/ui/Spinner'

function formatTime(value: string | null): string | null {
    if (!value) return null
    const [hourStr, minuteStr] = value.split(':')
    const hours = Number(hourStr)
    if (Number.isNaN(hours)) return null
    const minutes = Number(minuteStr ?? '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHour = ((hours + 11) % 12) + 1
    const paddedMinutes = minutes.toString().padStart(2, '0')
    return `${displayHour}:${paddedMinutes} ${ampm}`
}

function formatSchedule(row: Pick<ScheduleClass, 'day' | 'start' | 'end'>) {
    if (!row.day && !row.start && !row.end) return '—'
    const day = dayLabel(row.day)
    const start = formatTime(row.start)
    const end = formatTime(row.end)
    if (start && end) return `${day}, ${start} – ${end}`
    if (start) return `${day}, ${start}`
    return day
}

export function ScheduleDialog({ instructor, open, onClose }: ScheduleDialogProps) {
    const queryClient = useQueryClient()
    const toast = useToast()
    const instructorId = instructor?.id
    const [draggingId, setDraggingId] = React.useState<number | null>(null)
    const [dropTarget, setDropTarget] = React.useState<'assigned' | 'available' | null>(null)

    const scheduleQueryKey = useMemo(() => ['instructors', instructorId, 'schedule'] as const, [instructorId])
    const unassignedQueryKey = useMemo(() => ['classes', 'unassigned'] as const, [])

    const scheduleQuery = useQuery({
        queryKey: scheduleQueryKey,
        queryFn: async () => {
            if (!instructorId) throw new Error('Missing instructor id')
            return await api<InstructorScheduleResponse>(`/api/instructors/${instructorId}/schedule`)
        },
        enabled: Boolean(instructorId) && open,
        staleTime: 60_000,
    })

    const unassignedQuery = useQuery({
        queryKey: unassignedQueryKey,
        queryFn: async () => await api<UnassignedResponse>('/api/classes/unassigned'),
        enabled: open,
        staleTime: 60_000,
    })

    useEffect(() => {
        if (!open) return
        if (scheduleQuery.error) {
            const message = (scheduleQuery.error as { message?: string } | null)?.message
            if (message) toast({ kind: 'error', msg: message })
        }
        if (unassignedQuery.error) {
            const message = (unassignedQuery.error as { message?: string } | null)?.message
            if (message) toast({ kind: 'error', msg: message })
        }
    }, [open, scheduleQuery.error, unassignedQuery.error, toast])

    const assignMutation = useMutation<MutationResponse, Error, ClassActionVariables>({
        mutationFn: async ({ classId }) => {
            if (!instructorId) throw new Error('Missing instructor id')
            return await api<MutationResponse>(`/api/instructors/${instructorId}/schedule`, {
                method: 'POST',
                body: JSON.stringify({ classId }),
            })
        },
        onSuccess: (_, variables) => {
            toast({ kind: 'success', msg: `Assigned ${variables.code ?? 'class'}` })
            queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
            queryClient.invalidateQueries({ queryKey: unassignedQueryKey })
        },
        onError: (error) => {
            toast({ kind: 'error', msg: error.message || 'Failed to assign class.' })
        },
    })

    const unassignMutation = useMutation<MutationResponse, Error, ClassActionVariables>({
        mutationFn: async ({ classId }) => {
            if (!instructorId) throw new Error('Missing instructor id')
            return await api<MutationResponse>(`/api/instructors/${instructorId}/schedule`, {
                method: 'DELETE',
                body: JSON.stringify({ classId }),
            })
        },
        onSuccess: (_, variables) => {
            toast({ kind: 'success', msg: `Unassigned ${variables.code ?? 'class'}` })
            queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
            queryClient.invalidateQueries({ queryKey: unassignedQueryKey })
        },
        onError: (error) => {
            toast({ kind: 'error', msg: error.message || 'Failed to unassign class.' })
        },
    })

    const assignedClasses = scheduleQuery.data?.classes ?? []
    const unassignedClasses = unassignedQuery.data?.classes ?? []
    const refreshing = scheduleQuery.isFetching || unassignedQuery.isFetching

    const assignPendingId = assignMutation.isPending ? assignMutation.variables?.classId : null
    const unassignPendingId = unassignMutation.isPending ? unassignMutation.variables?.classId : null

    function handleDragStart(classId: number) {
        setDraggingId(classId)
    }

    function handleDragEnd() {
        setDraggingId(null)
        setDropTarget(null)
    }

    function allowDrop(target: 'assigned' | 'available', event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setDropTarget(target)
    }

    function handleDropToAssigned(classId: number) {
        if (assignPendingId || unassignPendingId) return
        assignMutation.mutate({ classId })
        setDropTarget(null)
        setDraggingId(null)
    }

    function handleDropToAvailable(classId: number) {
        if (assignPendingId || unassignPendingId) return
        unassignMutation.mutate({ classId })
        setDropTarget(null)
        setDraggingId(null)
    }

    const refreshButtonRef = React.useRef<HTMLElement | null>(null)

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-5xl h-[90vh] flex flex-col" initialFocus={refreshButtonRef as React.RefObject<HTMLElement>}>
            {instructor ? (
                <>
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Manage Schedule</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Assign classes to <span className="font-medium text-foreground">{instructor.full_name}</span>.
                                </p>
                            </div>
                            <AnimatedActionBtn
                                icon={RefreshCw}
                                label="Refresh"
                                onClick={() => {
                                    void scheduleQuery.refetch()
                                    void unassignedQuery.refetch()
                                }}
                                isLoading={refreshing}
                                loadingLabel="Refreshing..."
                                variant="secondary"
                            />
                        </div>
                    </DialogHeader>
                    <DialogBody className="flex-1 overflow-y-auto p-0">
                        <div className="grid gap-5 p-6 lg:grid-cols-2">
                            {/* Assigned Classes */}
                            <motion.div
                                className="space-y-3 rounded-xl"
                                animate={dropTarget === 'assigned' ? {
                                    boxShadow: "0 0 0 2px rgba(var(--primary), 0.4)",
                                    scale: 1.005,
                                    backgroundColor: "rgba(var(--primary), 0.02)"
                                } : {
                                    boxShadow: "0 0 0 0px transparent",
                                    scale: 1,
                                    backgroundColor: "transparent"
                                }}
                                transition={{ duration: 0.2 }}
                                onDragOver={(e) => allowDrop('assigned', e)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    if (draggingId) handleDropToAssigned(draggingId)
                                }}
                            >
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Assigned ({assignedClasses.length})
                                    </h3>
                                </div>
                                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                    <AdminTable
                                        loading={scheduleQuery.isLoading}
                                        loadingLabel={null}
                                        error={scheduleQuery.error ? scheduleQuery.error.message : null}
                                        isEmpty={assignedClasses.length === 0}
                                        emptyMessage="No classes assigned."
                                        colSpan={3}
                                        minWidthClass="min-w-0"
                                        header={
                                            <tr>
                                                <th className="w-72 rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4">Class</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4">Schedule</th>
                                                <th className="rounded-tr-lg px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4">Action</th>
                                            </tr>
                                        }
                                    >
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {assignedClasses.map((row) => (
                                                <motion.tr
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                                                    transition={{ duration: 0.2 }}
                                                    key={row.class_id}
                                                    className="group transition-colors duration-200 hover:bg-muted/50 h-13"
                                                    draggable
                                                    onDragStart={() => handleDragStart(row.class_id)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <td className="px-3 py-2.5 text-sm font-medium text-foreground sm:px-4 cursor-grab active:cursor-grabbing">
                                                        <div className="flex flex-col">
                                                            <span>{row.title ?? 'Untitled'}</span>
                                                            <span className="text-xs text-muted-foreground">{row.code ?? '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{formatSchedule(row)}</td>
                                                    <td className="px-3 py-2.5 text-right sm:px-4">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            aria-label="Unassign class"
                                                            className="h-9 w-9 rounded-full bg-destructive/10 p-0 text-destructive hover:bg-destructive/20 hover:text-destructive"
                                                            onClick={() => unassignMutation.mutate({ classId: row.class_id })}
                                                            disabled={unassignPendingId === row.class_id || refreshing}
                                                        >
                                                            {unassignPendingId === row.class_id ? (
                                                                <Spinner className="h-4 w-4" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </AdminTable>
                                </div>
                            </motion.div>

                            {/* Unassigned Classes */}
                            <motion.div
                                className="space-y-3 rounded-xl"
                                animate={dropTarget === 'available' ? {
                                    boxShadow: "0 0 0 2px rgba(var(--primary), 0.4)",
                                    scale: 1.005,
                                    backgroundColor: "rgba(var(--primary), 0.02)"
                                } : {
                                    boxShadow: "0 0 0 0px transparent",
                                    scale: 1,
                                    backgroundColor: "transparent"
                                }}
                                transition={{ duration: 0.2 }}
                                onDragOver={(e) => allowDrop('available', e)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    if (draggingId) handleDropToAvailable(draggingId)
                                }}
                            >
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Available ({unassignedClasses.length})
                                    </h3>
                                </div>
                                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                    <AdminTable
                                        loading={unassignedQuery.isLoading}
                                        loadingLabel={null}
                                        error={unassignedQuery.error ? unassignedQuery.error.message : null}
                                        isEmpty={unassignedClasses.length === 0}
                                        emptyMessage="No unassigned classes found."
                                        colSpan={3}
                                        minWidthClass="min-w-0"
                                        header={
                                            <tr>
                                                <th className="w-72 rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4">Class</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4">Schedule</th>
                                                <th className="rounded-tr-lg px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4">Action</th>
                                            </tr>
                                        }
                                    >
                                        <AnimatePresence mode="popLayout" initial={false}>
                                            {unassignedClasses.map((row) => (
                                                <motion.tr
                                                    layout
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                                    transition={{ duration: 0.2 }}
                                                    key={row.class_id}
                                                    className="group transition-colors duration-200 hover:bg-muted/50 h-13"
                                                    draggable
                                                    onDragStart={() => handleDragStart(row.class_id)}
                                                    onDragEnd={handleDragEnd}
                                                >
                                                    <td className="px-3 py-2.5 text-sm font-medium text-foreground sm:px-4 cursor-grab active:cursor-grabbing">
                                                        <div className="flex flex-col">
                                                            <span>{row.title ?? 'Untitled'}</span>
                                                            <span className="text-xs text-muted-foreground">{row.code ?? '-'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{formatSchedule(row)}</td>
                                                    <td className="px-3 py-2.5 text-right sm:px-4">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            aria-label="Assign class"
                                                            className="h-9 w-9 rounded-full bg-primary/10 p-0 text-primary hover:bg-primary/20 hover:text-primary"
                                                            onClick={() => assignMutation.mutate({ classId: row.class_id, code: row.code })}
                                                            disabled={assignPendingId === row.class_id || refreshing}
                                                        >
                                                            {assignPendingId === row.class_id ? (
                                                                <Spinner className="h-4 w-4" />
                                                            ) : (
                                                                <UserPlus className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </AdminTable>
                                </div>
                            </motion.div>
                        </div>
                    </DialogBody>
                </>
            ) : null
            }
        </Dialog >
    )
}
