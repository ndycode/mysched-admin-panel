'use client'

import React from 'react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { X } from 'lucide-react'
import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { dayLabel, DayValue } from '@/lib/days'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { DetailRow } from '../DetailRow'

type ClassDetail = {
    id: number
    section_id: number | null
    day: DayValue | null
    start: string | null
    end: string | null
    code: string | null
    title: string | null
    units: number | null
    room: string | null
    instructor: string | null
    instructor_id: string | null
    instructor_profile: {
        id: string
        full_name: string
        email: string | null
        title: string | null
        department: string | null
        avatar_url: string | null
    } | null
    created_at: string | null
    updated_at: string | null
    section: {
        id: number
        code: string | null
        section_number: string | null
        class_code: string | null
        class_name: string | null
        instructor: string | null
        time_slot: string | null
        room: string | null
        enrolled: number | null
        capacity: number | null
        status: string | null
    } | null
}

type ViewClassDialogProps = {
    open: boolean
    detail: ClassDetail | null
    loading: boolean
    error: string | null
    onClose: () => void
}

export function ViewClassDialog({
    open,
    detail,
    loading,
    error,
    onClose,
}: ViewClassDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()} className="max-w-2xl">
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">Class Details</h2>
            </DialogHeader>
            <DialogBody>
                {error ? (
                    <div className="flex h-40 items-center justify-center text-destructive">
                        {error}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            {loading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-7 w-64" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                            ) : detail ? (
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{detail.title}</h3>
                                    <p className="text-sm text-muted-foreground">{detail.code}</p>
                                </div>
                            ) : null}

                            {loading ? (
                                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1.5">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-40" />
                                    </div>
                                </div>
                            ) : detail?.instructor_profile ? (
                                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                                    <AvatarThumbnail
                                        name={detail.instructor_profile.full_name}
                                        src={detail.instructor_profile.avatar_url}
                                        size="md"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-foreground">
                                            {detail.instructor_profile.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {detail.instructor_profile.email}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Schedule</h4>
                                <dl className="space-y-3">
                                    <DetailRow label="Day" value={detail ? dayLabel(detail.day) : null} loading={loading} />
                                    <DetailRow
                                        label="Time"
                                        value={detail?.start && detail?.end ? `${detail.start} – ${detail.end}` : null}
                                        loading={loading}
                                    />
                                    <DetailRow label="Room" value={detail?.room} loading={loading} />
                                    <DetailRow label="Units" value={detail?.units} loading={loading} />
                                </dl>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Section</h4>
                                <dl className="space-y-3">
                                    <DetailRow label="Code" value={detail?.section?.code} loading={loading} />
                                    <DetailRow label="Class Code" value={detail?.section?.class_code} loading={loading} />
                                    <DetailRow
                                        label="Enrolled"
                                        value={detail?.section ? `${detail.section.enrolled ?? 0} / ${detail.section.capacity ?? 0}` : null}
                                        loading={loading}
                                    />
                                    <DetailRow label="Status" value={detail?.section?.status} loading={loading} />
                                </dl>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <AnimatedActionBtn
                                icon={X}
                                label="Close"
                                onClick={onClose}
                                variant="secondary"
                            />
                        </div>
                    </div>
                )}
            </DialogBody>
        </Dialog>
    )
}
