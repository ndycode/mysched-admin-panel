'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  MoreVertical,
  Grid,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  X,
  Check,
} from 'lucide-react'

import { ReactLenis } from 'lenis/react'
import { Badge, Button, PrimaryButton } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { AddSectionDialog } from '../_components/dialogs/AddSectionDialog'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import {
  computeStats,
  mapSectionRow,
} from './utils'
import { SectionApiRow, SectionRow } from './types'
import { ActionMenuTrigger, CardSurface, StatsCard } from '../_components/design-system'
import { AdminTable } from '../_components/AdminTable'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { canonicalDayNumber } from '@/lib/days'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { DetailRow } from '../_components/DetailRow'
import { SortableTableHeader } from '../_components/SortableTableHeader'
import { ActiveFiltersPills } from '../_components/ActiveFiltersPills'
import { useFilterPersistence } from '../_hooks/useFilterPersistence'
import { formatDate } from '@/lib/date-utils'
import { buttonClasses } from '@/components/ui/Button'
import { inputClasses } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Skeleton } from '@/components/ui/Skeleton'


// Note: Using 'any' here because ReactLenis has complex prop types that don't align with React.PropsWithChildren
// This is a third-party library compatibility issue and is isolated to this wrapper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LenisWrapper: React.ComponentType<any> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof ReactLenis !== 'undefined' ? ReactLenis : ((props: any) => <div {...props} />)




type SectionSortKey = 'section' | 'code' | 'classes' | 'created' | 'updated'



type ViewSectionDialogProps = {
  section: SectionRow | null
  open: boolean
  onClose: () => void
  loading?: boolean
}



function ViewSectionDialog({ section, open, onClose, loading = false }: ViewSectionDialogProps) {
  const classesQuery = useQuery({
    queryKey: ['sections', section?.id, 'classes'],
    enabled: Boolean(section?.id) && open,
    queryFn: async () => {
      if (!section?.id) return []
      const params = new URLSearchParams({
        section_id: String(section.id),
        limit: '100',
        sort: 'title',
      })
      const result = await api<{
        rows: Array<{
          id: number
          code: string | null
          title: string | null
          day: string | number | null
          start: string | null
          end: string | null
          room: string | null
          instructor: string | null
          instructor_profile?: { full_name: string | null } | null
        }>
      }>('/api/classes?' + params.toString())
      return result.rows
    },
    staleTime: 60_000,
  })

  const sectionClasses = useMemo(() => classesQuery.data ?? [], [classesQuery.data])

  const orderedClasses = useMemo(() => {
    const parseStartMinutes = (value: string | null): number => {
      if (!value) return Number.MAX_SAFE_INTEGER
      const parts = value.split(':')
      const hours = Number(parts[0]) || 0
      const minutes = Number(parts[1]) || 0
      return hours * 60 + minutes
    }

    return [...sectionClasses].sort((a, b) => {
      const dayA = canonicalDayNumber(a.day) ?? 99
      const dayB = canonicalDayNumber(b.day) ?? 99
      if (dayA !== dayB) return dayA - dayB

      const startA = parseStartMinutes(a.start)
      const startB = parseStartMinutes(b.start)
      if (startA !== startB) return startA - startB

      const titleA = a.title ?? ''
      const titleB = b.title ?? ''
      return titleA.localeCompare(titleB)
    })
  }, [sectionClasses])

  const formatTimeRange = useCallback((start: string | null, end: string | null) => {
    const toDisplay = (value: string | null) => {
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
    const s = toDisplay(start)
    const e = toDisplay(end)
    if (s && e) return `${s} - ${e}`
    if (s) return s
    if (e) return e
    return '-'
  }, [])

  const showSkeleton = loading || (open && !section)

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()} className="max-w-3xl">
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">Section Details</h2>
      </DialogHeader>
      <DialogBody>
        {section || showSkeleton ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                {showSkeleton ? (
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-foreground">{section!.sectionNumber || section!.code || 'Section'}</h3>
                    <p className="text-sm text-muted-foreground">{section!.code || 'No code'}</p>
                    {section!.code && section!.code !== section!.sectionNumber ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                          Section: {section!.sectionNumber || '-'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                          Code: {section!.code}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {showSkeleton ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="text-base font-semibold text-foreground">{section!.classCount ?? 0}</span>
                )}
                <span className="text-[11px] uppercase tracking-wide">Classes</span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Section info</h4>
                <dl className="space-y-3">
                  <DetailRow label="Section Number" value={section?.sectionNumber} loading={showSkeleton} />
                  <DetailRow label="Code" value={section?.code} loading={showSkeleton} />
                  <DetailRow label="Classes" value={section?.classCount} loading={showSkeleton} />
                </dl>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Dates</h4>
                <dl className="space-y-3">
                  <DetailRow label="Created" value={section?.createdAt ? formatDate(section.createdAt) : null} loading={showSkeleton} />
                  <DetailRow label="Updated" value={section?.updatedAt ? formatDate(section.updatedAt) : null} loading={showSkeleton} />
                </dl>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Classes in this section</h4>
                <span className="text-xs text-muted-foreground">
                  {classesQuery.isLoading ? 'Loading...' : `${orderedClasses.length} listed`}
                </span>
              </div>

              {classesQuery.isLoading ? (
                <div className="divide-y divide-border rounded-lg border border-border bg-background">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-24 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : orderedClasses.length > 0 ? (
                <div className="divide-y divide-border rounded-lg border border-border bg-background">
                  {orderedClasses.map(c => (
                    <div key={c.id} className="flex flex-col gap-2 px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{c.title || 'Untitled Class'}</span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {c.room || 'No Room'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                          <span className="font-medium text-foreground">
                            {canonicalDayNumber(c.day) !== null ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][canonicalDayNumber(c.day)!] : (c.day || '-')}
                          </span>
                          <span className="h-3 w-px bg-border" />
                          <span>{formatTimeRange(c.start, c.end)}</span>
                        </div>
                        {c.instructor_profile?.full_name ? (
                          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                            <span>{c.instructor_profile.full_name}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  No classes found in this section.
                </div>
              )}
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
        ) : null}
      </DialogBody>
    </Dialog>
  )
}

type EditSectionDialogProps = {
  section: SectionRow | null
  open: boolean
  onClose: () => void
  onUpdated: () => Promise<void> | void
}

function EditSectionDialog({ section, open, onClose, onUpdated }: EditSectionDialogProps) {
  const toast = useToast()
  const [sectionNumber, setSectionNumber] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const sectionNumberRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open && section) {
      setSectionNumber(section.sectionNumber === '-' ? '' : section.sectionNumber)
      setCode(section.code ?? '')
      setSubmitting(false)
      setFormError(null)
    }
    if (!open) {
      setSubmitting(false)
    }
  }, [open, section])

  const currentSection = section

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentSection) return

    const payload: Record<string, unknown> = {}

    const normalizedNumber = sectionNumber.trim()
    const originalNumber = currentSection.sectionNumber === '-' ? '' : currentSection.sectionNumber
    if (normalizedNumber !== originalNumber) {
      payload.section_number = normalizedNumber || null
    }

    const normalizedCode = code.trim()
    const originalCode = currentSection.code ?? ''
    if (normalizedCode !== originalCode) {
      payload.code = normalizedCode
    }

    if (Object.keys(payload).length === 0) {
      setFormError('No changes to save.')
      return
    }

    setSubmitting(true)
    try {
      await api(`/api/sections/${currentSection.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      toast({ kind: 'success', msg: 'Section updated.' })
      await onUpdated()
      onClose()
    } catch (error) {
      const { message } = normalizeApiError(error, 'Failed to update section.')
      setFormError(message)
      toast({ kind: 'error', msg: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-3xl" initialFocus={sectionNumberRef as any}>
      {currentSection && currentSection.id !== null ? (
        <>
          <DialogHeader>
            <h2 className="text-xl font-semibold text-foreground">Edit section</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update metadata for {currentSection.sectionNumber}.</p>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-foreground">
                  Section number
                  <input
                    type="text"
                    ref={sectionNumberRef}
                    value={sectionNumber}
                    onChange={(event) => setSectionNumber(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="text-sm font-medium text-foreground">
                  Section code
                  <input
                    type="text"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </label>
              </div>

              {formError ? (
                <p className="text-xs text-destructive">{formError}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <AnimatedActionBtn
                  icon={X}
                  label="Cancel"
                  onClick={onClose}
                  disabled={submitting}
                  variant="secondary"
                />
                <AnimatedActionBtn
                  icon={Check}
                  label="Save changes"
                  onClick={() => {
                    const form = document.querySelector('form')
                    if (form) form.requestSubmit()
                  }}
                  isLoading={submitting}
                  loadingLabel="Saving..."
                  variant="primary"
                />
              </div>
            </form>
          </DialogBody>
        </>
      ) : null}
    </Dialog>
  )
}

export default function SectionsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SectionSortKey>('section')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [instructorFilter, setInstructorFilter] = useState<'all' | string>('all')
  const [semesterFilter, setSemesterFilter] = useState<'all' | string>('all')
  const [userSorted, setUserSorted] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [viewingSection, setViewingSection] = useState<SectionRow | null>(null)
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [exporting, setExporting] = useState(false)
  const [statsPulse, setStatsPulse] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  const sectionsQuery = useQuery({
    queryKey: ['sections', 'table', sort, sortDirection, search, instructorFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (instructorFilter !== 'all') params.set('instructor_id', instructorFilter)
      if (semesterFilter !== 'all') params.set('semester_id', semesterFilter)
      const url = params.toString() ? `/api/sections?${params.toString()}` : '/api/sections'
      const rows = await api<SectionApiRow[]>(url)
      return rows.map(mapSectionRow)
    },
    staleTime: 60_000,
  })
  const instructorsQuery = useQuery({
    queryKey: ['instructors', 'options'],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('limit', '200')
      params.set('sort', 'name')
      const response = await api<{ rows: Array<{ id: string; full_name: string }> }>(`/api/instructors?${params.toString()}`)
      return response.rows ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
  const semestersQuery = useQuery({
    queryKey: ['semesters', 'options'],
    queryFn: async () => {
      const response = await api<Array<{ id: number; code: string; name: string; is_active: boolean }>>('/api/semesters')
      return response ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data])
  const instructors = useMemo(() => instructorsQuery.data ?? [], [instructorsQuery.data])
  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data])
  const isLoading = sectionsQuery.isLoading
  const isFetching = sectionsQuery.isFetching
  const sectionsRefreshing = isFetching
  const reloadSpinning = isFetching || isLoading || !sectionsQuery.data
  const tableLoading = isFetching
  const instructorsLoading = instructorsQuery.isFetching
  useEffect(() => {
    const active = document.activeElement as HTMLElement | null
    if (active?.dataset?.sortHeader === 'sections') {
      active.blur()
    }
  }, [])
  useFilterPersistence(
    'admin_sections_filters',
    { search, sort, sortDirection, instructorFilter, semesterFilter },
    {
      search: setSearch,
      sort: setSort,
      sortDirection: setSortDirection,
      instructorFilter: (val) => setInstructorFilter(val as 'all' | string),
      semesterFilter: (val) => setSemesterFilter(val as 'all' | string),
    },
    (saved) => {
      const isNonDefaultSort = saved.sort && saved.sort !== 'section'
      const isNonDefaultDir = saved.sortDirection && saved.sortDirection !== 'asc'
      if (isNonDefaultSort || isNonDefaultDir) setUserSorted(true)
    }
  )

  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['sections'] }).catch(() => { })
    setStatsPulse(prev => prev + 1)
  }, [queryClient])

  const handleRetrySections = useCallback(() => {
    void sectionsQuery.refetch()
  }, [sectionsQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, sort, sortDirection, instructorFilter, semesterFilter])

  useEffect(() => {
    if (!sectionsQuery.error) return
    const msg = (sectionsQuery.error as { message?: string } | null)?.message || 'Failed to load sections'
    toast({ kind: 'error', msg })
  }, [sectionsQuery.error, toast])

  useEffect(() => {
    if (!instructorsQuery.error) return
    const msg = (instructorsQuery.error as { message?: string } | null)?.message || 'Failed to load instructors'
    toast({ kind: 'error', msg })
  }, [instructorsQuery.error, toast])

  const sectionErrorMessage = (sectionsQuery.error as { message?: string } | null)?.message || null
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api(`/api/sections/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', 'table'] })
      toast({ kind: 'success', msg: 'Section deleted' })
      setDeletingId(null)
    },
    onError: (error) => {
      const msg = (error as { message?: string } | null)?.message || 'Failed to delete section'
      toast({ kind: 'error', msg })
      setDeletingId(null)
    },
  })

  const handleDelete = useCallback((id: number) => {
    setDeletingId(id)
  }, [])

  const confirmDelete = useCallback(() => {
    if (deletingId !== null) {
      deleteMutation.mutate(deletingId)
    }
  }, [deletingId, deleteMutation])

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase()

    const result = sections.filter(section => {
      if (!term) return true

      const haystack = [
        section.sectionNumber,
        section.code ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(term)
    })

    result.sort((a, b) => {
      if (sort === 'section') {
        const sectionA = a.sectionNumber ?? a.code ?? ''
        const sectionB = b.sectionNumber ?? b.code ?? ''
        return sortDirection === 'asc'
          ? sectionA.localeCompare(sectionB)
          : sectionB.localeCompare(sectionA)
      }
      if (sort === 'code') {
        const codeA = a.code ?? a.sectionNumber ?? ''
        const codeB = b.code ?? b.sectionNumber ?? ''
        return sortDirection === 'asc'
          ? codeA.localeCompare(codeB)
          : codeB.localeCompare(codeA)
      }
      if (sort === 'classes') {
        const countA = a.classCount ?? 0
        const countB = b.classCount ?? 0
        const primary = sortDirection === 'asc' ? countA - countB : countB - countA
        if (primary !== 0) return primary
        const codeA = a.code ?? a.sectionNumber ?? ''
        const codeB = b.code ?? b.sectionNumber ?? ''
        return codeA.localeCompare(codeB)
      }
      if (sort === 'created') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
      if (sort === 'updated') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      }
      return 0
    })

    return result
  }, [sections, search, sort, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredSections.length / pageSize))
  const paginatedSections = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredSections.slice(start, start + pageSize)
  }, [filteredSections, page, pageSize])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedSections.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedSections.map(s => s.id).filter((id): id is number => id !== null)))
    }
  }, [paginatedSections, selectedIds.size])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api(`/api/sections/${id}`, { method: 'DELETE' })
      }
      queryClient.invalidateQueries({ queryKey: ['sections', 'table'] })
      toast({ kind: 'success', msg: `Deleted ${selectedIds.size} section(s)` })
      setSelectedIds(new Set())
      setBulkDeleteConfirmOpen(false)
    } catch {
      toast({ kind: 'error', msg: 'Some deletions failed' })
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedIds, queryClient, toast])

  const activeFilters = useMemo(() => {
    const pills: string[] = []
    if (search.trim()) pills.push(`Search: "${search.trim()}"`)
    if (instructorFilter !== 'all') {
      const name = instructors.find(i => i.id === instructorFilter)?.full_name ?? instructorFilter
      pills.push(`Instructor: ${name}`)
    }
    if (userSorted) {
      pills.push(`Sorted by ${sort.charAt(0).toUpperCase() + sort.slice(1)} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`)
    }
    return pills
  }, [search, instructorFilter, instructors, sort, sortDirection, userSorted])

  const handleSortChange = useCallback((key: SectionSortKey) => {
    setSort(prev => {
      if (prev === key) {
        setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))
        setUserSorted(true)
        return prev
      }
      setSortDirection('asc')
      setUserSorted(true)
      return key
    })
  }, [])



  const renderRow = useCallback(
    (row: SectionRow) => {
      const isSelected = row.id !== null && selectedIds.has(row.id)
      return (
        <tr key={row.key} className={`group transition-colors duration-200 h-13 ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
          <td className="w-12 px-3 py-2.5 sm:px-4">
            <Checkbox
              checked={isSelected}
              onChange={() => row.id !== null && toggleSelect(row.id)}
            />
          </td>
          <td className="px-3 py-2.5 text-sm font-medium text-foreground sm:px-4">
            <div className="w-full truncate" title={row.sectionNumber ?? undefined}>
              {row.sectionNumber ?? '-'}
            </div>
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{row.code ?? '-'}</td>
          <td className="whitespace-nowrap px-3 py-2.5 text-sm sm:px-4">
            {row.semesterName ? (
              <span className="flex items-center gap-1.5">
                <span className="text-foreground">{row.semesterName}</span>
                {row.semesterIsActive && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-foreground sm:px-4">
            <Badge className="font-medium">
              {row.classCount} classes
            </Badge>
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
            {row.createdAt ? formatDate(row.createdAt) : '—'}
          </td>
          <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
            {row.updatedAt ? formatDate(row.updatedAt) : '—'}
          </td>
          <td
            className="sticky right-0 px-3 py-2.5 text-right sm:px-4 border-l border-border w-16 bg-background dark:bg-black group-hover:bg-muted/50 transition-colors duration-200"
            style={{ backgroundColor: 'var(--background)' }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionMenuTrigger ariaLabel="Section actions" icon={MoreVertical} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setViewingSection(row)}>
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingSection(row)}>
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => {
                    if (row.id != null) handleDelete(row.id)
                  }}
                  disabled={row.id === null}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
      )
    },
    [handleDelete, selectedIds, toggleSelect],
  )

  const headerActions = (
    <>
      {/* Desktop / Tablet */}
      <div className="hidden items-center gap-3 sm:flex">
        <AnimatedActionBtn
          icon={Download}
          label="Export"
          onClick={() => setExporting(true)}
          disabled={exporting}
          variant="secondary"
        />
        <AnimatedActionBtn
          icon={RefreshCw}
          label="Reload"
          onClick={handleManualRefresh}
          disabled={isFetching}
          isLoading={reloadSpinning}
          loadingLabel="Reloading..."
          variant="secondary"
          spinner="framer"
        />
        <AnimatedActionBtn
          icon={Plus}
          label="Add Section"
          onClick={() => setAddOpen(true)}
          variant="primary"
        />
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        <AnimatedActionBtn
          icon={Plus}
          label="Add Section"
          onClick={() => setAddOpen(true)}
          variant="primary"
          className="w-full justify-center"
        />
        <AnimatedActionBtn
          icon={Download}
          label="Export"
          onClick={() => setExporting(true)}
          disabled={exporting}
          variant="secondary"
          className="w-full justify-center"
        />
      </div>
    </>
  )

  const stats = useMemo(() => computeStats(sections), [sections])

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sections</h1>
            <p className="text-muted-foreground">Manage section schedules.</p>
          </div>
          {headerActions}
        </div>

        <AddSectionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['sections', 'table'] })
          }}
        />
        <ViewSectionDialog
          section={viewingSection}
          open={Boolean(viewingSection)}
          onClose={() => setViewingSection(null)}
        />
        <EditSectionDialog
          section={editingSection}
          open={Boolean(editingSection)}
          onUpdated={async () => {
            await queryClient.invalidateQueries({ queryKey: ['sections', 'table'] })
          }}
          onClose={() => setEditingSection(null)}
        />
        <DeleteConfirmationDialog
          open={deletingId !== null}
          onOpenChange={(open) => !open && setDeletingId(null)}
          title="Delete Section"
          description="Are you sure you want to delete this section? This action cannot be undone."
          onConfirm={confirmDelete}
          isDeleting={deleteMutation.isPending}
        />

        <div className="space-y-6">
          {/* Stats Grid (mobile first) */}
          <div className="order-1 grid grid-cols-2 gap-3 sm:order-none sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            <StatsCard
              icon={Grid}
              label="Total Sections"
              value={String(stats.totalSections)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Grid}
              label="Added This Month"
              value={String(stats.addedThisMonth)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Grid}
              label="Last Updated"
              value={stats.lastUpdated ? formatDate(stats.lastUpdated) : '-'}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
          </div>

          {/* Filters */}
          <CardSurface className="order-2 space-y-4 shadow-sm border-border hover:border-border/80 transition-colors sm:order-none">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">Section filters</h2>
                <p className="text-sm text-muted-foreground">Search and filter sections.</p>
              </div>
              <ActiveFiltersPills
                activeFilters={activeFilters}
                onClearFilters={() => {
                  setSearch('')
                  setSort('code')
                  setSortDirection('asc')
                  setInstructorFilter('all')
                  setUserSorted(false)
                  setPage(1)
                }}
              />
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search sections by code"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search sections by code..."
                    className={inputClasses({ className: 'pl-10 pr-4' })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          instructorFilter === 'all'
                            ? 'All Instructors'
                            : instructors.find(i => i.id === instructorFilter)?.full_name ?? 'Instructor'
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                        aria-label="Choose instructor filter"
                        disabled={instructorsLoading}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-0">
                      <div className="relative">
                        {instructorsLoading ? (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Spinner className="h-4 w-4" />
                              Loading instructors...
                            </div>
                          </div>
                        ) : null}
                        <LenisWrapper root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                          <DropdownMenuItem onClick={() => setInstructorFilter('all')}>
                            All Instructors
                          </DropdownMenuItem>
                          {instructors.map(instructor => (
                            <DropdownMenuItem key={instructor.id} onClick={() => setInstructorFilter(instructor.id)}>
                              {instructor.full_name}
                            </DropdownMenuItem>
                          ))}
                        </LenisWrapper>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Semester Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          semesterFilter === 'all'
                            ? 'All Semesters'
                            : semesters.find(s => String(s.id) === semesterFilter)?.name ?? 'Semester'
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                        aria-label="Choose semester filter"
                        disabled={semestersQuery.isFetching}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-0">
                      <div className="relative">
                        {semestersQuery.isFetching ? (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Spinner className="h-4 w-4" />
                              Loading semesters...
                            </div>
                          </div>
                        ) : null}
                        <LenisWrapper root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                          <DropdownMenuItem onClick={() => setSemesterFilter('all')}>
                            All Semesters
                          </DropdownMenuItem>
                          {semesters.map(semester => (
                            <DropdownMenuItem key={semester.id} onClick={() => setSemesterFilter(String(semester.id))}>
                              <span className="flex items-center gap-2">
                                {semester.name}
                                {semester.is_active && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </LenisWrapper>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardSurface>

          {
            sectionErrorMessage ? (
              <CardSurface className="flex flex-wrap items-start justify-between gap-3 border-destructive/30 bg-destructive/5 text-destructive">
                <div>
                  <p className="text-sm font-semibold">Failed to load sections</p>
                  <p className="text-sm text-destructive/90">{sectionErrorMessage}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
                  onClick={handleRetrySections}
                >
                  Retry
                </Button>
              </CardSurface>
            ) : null
          }

          <div className="relative">
            {sectionsRefreshing ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Refreshing sections...</span>
                </div>
              </div>
            ) : null}

            {/* Bulk actions toolbar */}
            {selectedIds.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedIds.size})
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}

            <AdminTable
              loading={tableLoading}
              loadingLabel={null}
              error={sectionErrorMessage}
              isEmpty={!tableLoading && paginatedSections.length === 0}
              emptyMessage="No sections found matching your filters."
              colSpan={8}
              minWidthClass="min-w-[1200px] table-fixed"
              pagination={
                <div className="flex w-full flex-wrap items-center gap-3 sm:justify-between">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <PageSizeSelector
                      pageSize={pageSize}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize)
                        setPage(1)
                      }}
                      options={[10, 20, 50, 100]}
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full justify-start sm:w-auto sm:justify-end sm:ml-auto">
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-4"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              }
              header={
                <tr>
                  <th scope="col" className="w-12 rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <Checkbox
                      checked={paginatedSections.length > 0 && selectedIds.size === paginatedSections.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedSections.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="w-[280px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="section" label="Section" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-[140px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="code" label="Code" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Semester
                  </th>
                  <th className="w-[120px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="classes" label="Classes" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="created" label="Created" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="updated" label="Updated" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-[60px] sticky right-0 z-10 rounded-tr-lg border-l border-border bg-background dark:bg-black px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3" style={{ backgroundColor: 'var(--background)' }}>
                    Actions
                  </th>
                </tr>
              }
            >
              {paginatedSections.map(renderRow)}
              {!isLoading && Array.from({ length: Math.max(0, pageSize - paginatedSections.length) }).map((_, index) => (
                <tr key={`spacer-${index}`} aria-hidden="true" className="h-[52px]">
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4 border-l border-transparent">&nbsp;</td>
                </tr>
              ))}
            </AdminTable>
          </div>
        </div >
      </div >

      <DeleteConfirmationDialog
        open={bulkDeleteConfirmOpen}
        onOpenChange={setBulkDeleteConfirmOpen}
        title="Delete Selected Sections"
        description={`Are you sure you want to delete ${selectedIds.size} section(s)? This action cannot be undone.`}
        onConfirm={() => void handleBulkDelete()}
        isDeleting={isBulkDeleting}
      />
    </div >
  )
}
