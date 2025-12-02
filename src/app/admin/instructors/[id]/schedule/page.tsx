'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, BookOpen, Calendar, RefreshCw, UserMinus, UserPlus } from 'lucide-react'

import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { Button } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { dayLabel } from '@/lib/days'
import { VirtualizedAdminTable } from '../../../_components/VirtualizedAdminTable'
import { PageShell, CardSurface, StatsCard, SectionHeader } from '../../../_components/design-system'

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

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z" />
    </svg>
  )
}

function formatSchedule(row: Pick<ScheduleClass, 'day' | 'start' | 'end'>) {
  if (!row.day && !row.start && !row.end) return '—'
  const day = dayLabel(row.day)
  if (!row.start || !row.end) return day
  return `${day}, ${row.start} – ${row.end}`
}

function normalizeInstructorId(value: string | string[] | undefined): string | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export default function InstructorSchedulePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const instructorId = normalizeInstructorId(params?.id)
  const queryClient = useQueryClient()
  const toast = useToast()

  const scheduleQueryKey = useMemo(() => ['instructors', instructorId, 'schedule'] as const, [instructorId])
  const unassignedQueryKey = useMemo(() => ['classes', 'unassigned'] as const, [])

  const scheduleQuery = useQuery({
    queryKey: scheduleQueryKey,
    queryFn: async () => {
      if (!instructorId) throw new Error('Missing instructor id')
      return await api<InstructorScheduleResponse>(`/api/instructors/${instructorId}/schedule`)
    },
    enabled: Boolean(instructorId),
    staleTime: 60_000,
  })

  const unassignedQuery = useQuery({
    queryKey: unassignedQueryKey,
    queryFn: async () => await api<UnassignedResponse>('/api/classes/unassigned'),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!scheduleQuery.error) return
    const message = (scheduleQuery.error as { message?: string } | null)?.message
    if (message) {
      toast({ kind: 'error', msg: message })
    }
  }, [scheduleQuery.error, toast])

  useEffect(() => {
    if (!unassignedQuery.error) return
    const message = (unassignedQuery.error as { message?: string } | null)?.message
    if (message) {
      toast({ kind: 'error', msg: message })
    }
  }, [unassignedQuery.error, toast])

  const assignMutation = useMutation<MutationResponse, Error, ClassActionVariables>({
    mutationFn: async ({ classId }) => {
      if (!instructorId) throw new Error('Missing instructor id')
      return await api<MutationResponse>(`/api/instructors/${instructorId}/schedule`, {
        method: 'POST',
        body: JSON.stringify({ classId }),
      })
    },
    onSuccess: (_, variables) => {
      toast({ kind: 'success', msg: `Assigned ${variables.code ?? 'class'} to instructor.` })
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
      toast({ kind: 'success', msg: `Unassigned ${variables.code ?? 'class'}.` })
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
      queryClient.invalidateQueries({ queryKey: unassignedQueryKey })
    },
    onError: (error) => {
      toast({ kind: 'error', msg: error.message || 'Failed to unassign class.' })
    },
  })

  const archiveMutation = useMutation<MutationResponse, Error, ClassActionVariables>({
    mutationFn: async ({ classId }) => {
      if (!instructorId) throw new Error('Missing instructor id')
      return await api<MutationResponse>(`/api/instructors/${instructorId}/schedule`, {
        method: 'PATCH',
        body: JSON.stringify({ classId }),
      })
    },
    onSuccess: (_, variables) => {
      toast({ kind: 'success', msg: `Archived ${variables.code ?? 'class'}.` })
      queryClient.invalidateQueries({ queryKey: scheduleQueryKey })
      queryClient.invalidateQueries({ queryKey: unassignedQueryKey })
    },
    onError: (error) => {
      toast({ kind: 'error', msg: error.message || 'Failed to archive class.' })
    },
  })

  const instructor = scheduleQuery.data?.instructor ?? null
  const assignedClasses = scheduleQuery.data?.classes ?? []
  const unassignedClasses = unassignedQuery.data?.classes ?? []
  const refreshing = scheduleQuery.isFetching || unassignedQuery.isFetching

  if (!instructorId) {
    return (
      <PageShell label="Schedule" title="Instructor Schedule" subtitle="Manage class assignments for instructors.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Instructor id is missing from the URL.
        </div>
      </PageShell>
    )
  }

  const assignedCount = assignedClasses.length
  const unassignedCount = unassignedClasses.length
  const [assignedPage, setAssignedPage] = useState(1)
  const [unassignedPage, setUnassignedPage] = useState(1)
  const pageSize = 5
  const assignedPageCount = Math.max(1, Math.ceil(assignedCount / pageSize))
  const unassignedPageCount = Math.max(1, Math.ceil(unassignedCount / pageSize))

  useEffect(() => {
    setAssignedPage(prev => Math.min(prev, assignedPageCount))
  }, [assignedPageCount])

  useEffect(() => {
    setUnassignedPage(prev => Math.min(prev, unassignedPageCount))
  }, [unassignedPageCount])

  const pagedAssignedClasses = useMemo(() => {
    const start = (assignedPage - 1) * pageSize
    return assignedClasses.slice(start, start + pageSize)
  }, [assignedClasses, assignedPage, pageSize])

  const pagedUnassignedClasses = useMemo(() => {
    const start = (unassignedPage - 1) * pageSize
    return unassignedClasses.slice(start, start + pageSize)
  }, [unassignedClasses, unassignedPage, pageSize])

  const assignPendingId = assignMutation.isPending ? assignMutation.variables?.classId : null
  const unassignPendingId = unassignMutation.isPending ? unassignMutation.variables?.classId : null
  const archivePendingId = archiveMutation.isPending ? archiveMutation.variables?.classId : null

  const headerActions = (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={() => router.push('/admin/instructors')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Instructors
      </Button>
      <AnimatedActionBtn
        icon={RefreshCw}
        label="Refresh lists"
        onClick={() => {
          void scheduleQuery.refetch()
          void unassignedQuery.refetch()
        }}
        isLoading={refreshing}
        loadingLabel="Refreshing..."
        variant="secondary"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule</div>
            <h1 className="text-3xl font-bold text-foreground">Instructor Schedule</h1>
            <p className="text-muted-foreground">
              {instructor ? `Manage classes for ${instructor.full_name ?? 'this instructor'}.` : 'Manage instructor class assignments.'}
            </p>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Instructor Profile Card */}
          <CardSurface className="p-6 shadow-sm border-border">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <AvatarThumbnail
                  name={instructor?.full_name ?? 'Instructor'}
                  src={instructor?.avatar_url ?? null}
                  className="h-16 w-16 text-xl"
                />
                <div>
                  <div className="text-xl font-bold text-foreground">
                    {instructor?.full_name ?? 'Loading instructor...'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {instructor?.department ?? 'Department unavailable'}
                  </div>
                </div>
              </div>
              <div className="flex gap-8 text-sm">
                <div>
                  <div className="text-muted-foreground">Assigned classes</div>
                  <div className="text-2xl font-bold text-foreground">{assignedCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Unassigned classes</div>
                  <div className="text-2xl font-bold text-foreground">{unassignedCount}</div>
                </div>
              </div>
            </div>
          </CardSurface>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Assigned Classes */}
            <CardSurface className="space-y-4 shadow-sm border-border">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-lg font-bold text-foreground">Assigned Classes</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{assignedCount} TOTAL</span>
              </div>
              <VirtualizedAdminTable
                data={pagedAssignedClasses}
                getItemKey={(_, row) => row.class_id}
                loading={scheduleQuery.isLoading}
                loadingLabel="Loading assigned classes..."
                error={null}
                isEmpty={!scheduleQuery.isLoading && assignedClasses.length === 0}
                emptyMessage="No classes assigned yet."
                colSpan={4}
                minWidthClass="min-w-md"
                pagination={(
                  <div className="flex flex-wrap items-center gap-3 sm:justify-between">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">
                        Page {assignedPage} of {assignedPageCount}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:inline">Rows per page: {pageSize}</span>
                    </div>
                    <div className="flex items-center gap-2 w-full justify-start sm:w-auto sm:justify-end sm:ml-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setAssignedPage(p => Math.max(1, p - 1))}
                        disabled={assignedPage === 1 || assignedCount === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setAssignedPage(p => Math.min(assignedPageCount, p + 1))}
                        disabled={assignedPage * pageSize >= assignedCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                header={
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Room</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                }
                rowContent={(_, row) => {
                  const schedule = formatSchedule(row)
                  const isUnassigning = unassignPendingId === row.class_id
                  return (
                    <>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.title ?? 'Untitled class'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.code ?? '—'} · Sec: {row.section_id ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{schedule}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.room ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 gap-2 border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                          disabled={isUnassigning || archiveMutation.isPending}
                          onClick={() => unassignMutation.mutate({ classId: row.class_id, code: row.code })}
                        >
                          {isUnassigning ? <Spinner /> : <UserMinus className="h-3.5 w-3.5" aria-hidden />}
                          Unassign
                        </Button>
                      </td>
                    </>
                  )
                }}
              />
            </CardSurface>

            {/* Unassigned Classes */}
            <CardSurface className="space-y-4 shadow-sm border-border">
              <div className="flex items-center justify-between px-1 pt-1">
                <h2 className="text-lg font-bold text-foreground">Unassigned Classes</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{unassignedCount} AVAILABLE</span>
              </div>
              <VirtualizedAdminTable
                data={pagedUnassignedClasses}
                getItemKey={(_, row) => row.class_id}
                loading={unassignedQuery.isLoading}
                loadingLabel="Loading unassigned classes..."
                error={null}
                isEmpty={!unassignedQuery.isLoading && unassignedClasses.length === 0}
                emptyMessage="All classes are currently assigned."
                colSpan={4}
                minWidthClass="min-w-md"
                pagination={(
                  <div className="flex flex-wrap items-center gap-3 sm:justify-between">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <span className="text-sm text-muted-foreground">
                        Page {unassignedPage} of {unassignedPageCount}
                      </span>
                      <span className="hidden text-sm text-muted-foreground sm:inline">Rows per page: {pageSize}</span>
                    </div>
                    <div className="flex items-center gap-2 w-full justify-start sm:w-auto sm:justify-end sm:ml-auto">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setUnassignedPage(p => Math.max(1, p - 1))}
                        disabled={unassignedPage === 1 || unassignedCount === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setUnassignedPage(p => Math.min(unassignedPageCount, p + 1))}
                        disabled={unassignedPage * pageSize >= unassignedCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                header={
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Room</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Assign</th>
                  </tr>
                }
                rowContent={(_, row) => {
                  const schedule = formatSchedule(row)
                  const isAssigning = assignPendingId === row.class_id
                  return (
                    <>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.title ?? 'Untitled class'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.code ?? '—'} · Sec: {row.section_id ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{schedule}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.room ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={isAssigning || unassignMutation.isPending || archiveMutation.isPending}
                          onClick={() => assignMutation.mutate({ classId: row.class_id, code: row.code })}
                        >
                          {isAssigning ? <Spinner /> : <UserPlus className="h-3.5 w-3.5" aria-hidden />}
                          Assign
                        </Button>
                      </td>
                    </>
                  )
                }}
              />
            </CardSurface>
          </div>
        </div>
      </div>
    </div>
  )
}
