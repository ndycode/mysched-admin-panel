'use client'

// src/app/admin/classes/page.tsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ReactLenis } from 'lenis/react'
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Layers,
  Calendar,
  Grid,
  Scale,
  ChevronDown,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import {
  Button,
  Card,
  CardBody,
  Input,
  PrimaryButton,
  Select,
} from '@/components/ui'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { AdminTable } from '../_components/AdminTable'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import {
  ActionMenuTrigger,
  StatsCard,
  CardSurface,
} from '../_components/design-system'
import { SortableTableHeader } from '../_components/SortableTableHeader'
import { ActiveFiltersPills } from '../_components/ActiveFiltersPills'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  DAY_SELECT_OPTIONS,
  DayValue,
  canonicalDay,
  dayLabel,
} from '@/lib/days'
import { type SchedulePreviewRow } from '@/lib/schedule-import'
import { ImportClassesDialog } from '../_components/dialogs/ImportClassesDialog'
import { AddClassDialog } from '../_components/dialogs/AddClassDialog'
import { EditClassDialog } from '../_components/dialogs/EditClassDialog'
import { ViewClassDialog } from '../_components/dialogs/ViewClassDialog'
import { inputClasses } from '@/components/ui/Input'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

type ClassStatus = 'active' | 'inactive' | 'archived'

type InstructorSummary = {
  id: string
  full_name: string
  email: string | null
  title: string | null
  department: string | null
  avatar_url: string | null
}

type Row = {
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
  instructor_profile: InstructorSummary | null
}

type Section = { id: number; code: string | null }

type ClassDetail = Row & {
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

type ApiRow = Omit<Row, 'day'> & { day: string | number | null }

type ApiClassDetail = Omit<ClassDetail, 'day'> & { day: string | number | null }

function classStatus(row: Row): ClassStatus {
  if (!row.start || !row.end || !row.day) return 'inactive'
  if (!row.section_id) return 'archived'
  return 'active'
}

function formatTime(value: string | null) {
  if (!value) return null
  const [hoursStr, minutesStr] = value.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr ?? '0')
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value

  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = ((hours + 11) % 12) + 1
  const paddedMinutes = minutes.toString().padStart(2, '0')
  return `${hour12}:${paddedMinutes} ${period}`
}

function formatSchedule(row: Row) {
  if (!row.day && !row.start && !row.end) return '-'
  const day = dayLabel(row.day)
  const start = formatTime(row.start)
  const end = formatTime(row.end)

  if (!start && !end) return day
  if (start && end) return `${day}, ${start} - ${end}`
  return `${day}${start ? `, ${start}` : ''}${end ? ` - ${end}` : ''}`
}

type ClassesQueryData = { rows: Row[]; count: number }

export default function ClassesPage() {
  const [sectionId, setSectionId] = useState('all')
  const [dayFilter, setDayFilter] = useState<'all' | DayValue>('all')
  const [instructorFilter, setInstructorFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [statsPulse, setStatsPulse] = useState(0)
  const [userSorted, setUserSorted] = useState(false)
  const [sort, setSort] = useState<'title' | 'code' | 'id' | 'schedule' | 'room' | 'instructor' | 'section'>('title')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [importOpen, setImportOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Row | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingClass, setViewingClass] = useState<ClassDetail | null>(null)
  const [viewingLoading, setViewingLoading] = useState(false)
  const [viewingError, setViewingError] = useState<string | null>(null)

  const toast = useToast()
  const showApiError = useCallback(
    (error: unknown, fallback: string) => {
      const { message } = normalizeApiError(error, fallback)
      toast({ kind: 'error', msg: message })
    },
    [toast],
  )
  const searchDebounceRef = useRef<number | null>(null)

  const queryClient = useQueryClient()

  const sectionsQuery = useQuery({
    queryKey: ['sections', 'options'],
    queryFn: async () => {
      return await api<Section[]>('/api/sections')
    },
    staleTime: 5 * 60 * 1000,
  })

  const instructorsQuery = useQuery({
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
    staleTime: 5 * 60 * 1000,
  })

  const classesQueryKey = useMemo(
    () =>
      [
        'classes',
        { sectionId, dayFilter, instructorFilter, debouncedSearch, page, pageSize, sort, sortDirection },
      ] as const,
    [sectionId, dayFilter, instructorFilter, debouncedSearch, page, pageSize, sort, sortDirection],
  )

  const classesQuery = useQuery({
    queryKey: classesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (sectionId !== 'all') params.set('section_id', sectionId)
      if (dayFilter !== 'all') params.set('day', dayFilter)
      if (instructorFilter !== 'all') params.set('instructor_id', instructorFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      params.set('page', String(page))
      params.set('limit', String(pageSize))
      params.set('sort', sort)
      params.set('order', sortDirection)

      const response = await api<{ rows: ApiRow[]; count: number }>(
        `/api/classes?${params.toString()}`,
      )
      const normalized = (response.rows ?? []).map(row => ({
        ...row,
        day: canonicalDay(row.day) ?? null,
      }))
      return { rows: normalized, count: response.count ?? 0 }
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  // Derived state for loading overlay
  const classesRefreshing = classesQuery.isFetching
  const reloadSpinning = classesQuery.isFetching || classesQuery.isLoading || !classesQuery.data

  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data])
  const instructors = useMemo(() => instructorsQuery.data ?? [], [instructorsQuery.data])
  const rows = useMemo(() => classesQuery.data?.rows ?? [], [classesQuery.data])
  const count = classesQuery.data?.count ?? 0
  const sectionsLoading = sectionsQuery.isFetching
  const instructorsLoading = instructorsQuery.isFetching
  const classesLoading = classesQuery.isFetching
  const classesErrorMessage = classesQuery.error ? (classesQuery.error as Error).message : null

  useEffect(() => {
    if (!sectionsQuery.error) return
    showApiError(sectionsQuery.error, 'Failed to load sections')
  }, [sectionsQuery.error, showApiError])

  useEffect(() => {
    if (!classesQuery.error) return
    showApiError(classesQuery.error, 'Failed to load classes')
  }, [classesQuery.error, showApiError])

  useEffect(() => {
    if (!instructorsQuery.error) return
    showApiError(instructorsQuery.error, 'Failed to load instructors')
  }, [instructorsQuery.error, showApiError])

  useEffect(() => {
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sectionId, dayFilter, instructorFilter])

  const pageRows = rows

  const sectionLookup = useMemo(() => {
    const lookup = new Map<number, string>()
    sections.forEach(section => {
      if (section.code) {
        lookup.set(section.id, section.code)
      }
    })
    return lookup
  }, [sections])

  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    setStatsPulse(prev => prev + 1)
  }, [queryClient])

  const handleClassCreated = useCallback(() => {
    setPage(1)
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    queryClient.invalidateQueries({ queryKey: ['sections'] })
    setStatsPulse(prev => prev + 1)
  }, [queryClient])

  const handleClassUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['classes'] })
    setEditDialogOpen(false)
    setEditingClass(null)
    toast({ kind: 'success', msg: 'Class updated' })
    setStatsPulse(prev => prev + 1)
  }, [queryClient, toast])

  const handleImportComplete = useCallback(
    (count: number) => {
      setPage(1)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['sections'] })
      toast({
        kind: 'success',
        msg: count === 1 ? 'Imported 1 class' : `Imported ${count} classes`,
      })
      setStatsPulse(prev => prev + 1)
    },
    [queryClient, toast],
  )

  const handleExport = useCallback(async () => {
    if (count === 0) {
      toast({ kind: 'error', msg: 'No classes to export' })
      return
    }

    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (sectionId !== 'all') params.set('section_id', sectionId)
      if (dayFilter !== 'all') params.set('day', dayFilter)
      if (instructorFilter !== 'all') params.set('instructor_id', instructorFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)
      const query = params.toString()

      const response = await fetch(query ? `/api/classes/export?${query}` : '/api/classes/export', {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        let message = 'Export failed'
        try {
          const payload = await response.json()
          if (payload?.error) message = payload.error as string
        } catch {
          // ignore JSON parsing errors
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `classes-export-${stamp}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast({ kind: 'success', msg: 'Export ready' })
    } catch (error) {
      const { message } = normalizeApiError(error, 'Export failed')
      toast({ kind: 'error', msg: message })
    } finally {
      setExporting(false)
    }
  }, [count, dayFilter, instructorFilter, debouncedSearch, sectionId, toast])

  const closeViewDialog = useCallback(() => {
    setViewDialogOpen(false)
    setViewingClass(null)
    setViewingError(null)
  }, [])

  const handleViewDetails = useCallback(
    async (row: Row) => {
      setViewingClass(null)
      setViewingError(null)
      setViewingLoading(true)
      setViewDialogOpen(true)
      try {
        const detail = await api<ApiClassDetail>(`/api/classes/${row.id}`)
        setViewingClass({
          ...detail,
          day: canonicalDay(detail.day) ?? null,
        })
      } catch (error) {
        const { message } = normalizeApiError(error, 'Failed to load class details')
        setViewingError(message)
        toast({ kind: 'error', msg: message })
      } finally {
        setViewingLoading(false)
      }
    },
    [toast],
  )

  function handleEditClass(row: Row) {
    setEditingClass(row)
    setEditDialogOpen(true)
  }

  async function deleteClass(row: Row) {
    const confirmed = window.confirm(
      `Delete class "${row.title ?? row.code ?? row.id}"?`,
    )
    if (!confirmed) return

    try {
      await api(`/api/classes/${row.id}`, { method: 'DELETE' })
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      toast({ kind: 'success', msg: 'Class deleted' })
      setStatsPulse(prev => prev + 1)
    } catch (error) {
      console.error(error)
      toast({ kind: 'error', msg: 'Delete failed' })
    }
  }

  const stats = useMemo(() => {
    const scheduled = pageRows.filter(row => classStatus(row) === 'active').length
    const representedSections = new Set(
      pageRows
        .map(row => row.section_id)
        .filter((value): value is number => value !== null),
    ).size
    const unitValues = pageRows
      .map(row => row.units)
      .filter((value): value is number => value !== null && value !== undefined)
    const avgUnits =
      unitValues.length > 0
        ? unitValues.reduce((sum, value) => sum + value, 0) /
        unitValues.length
        : null

    return {
      totalClasses: count,
      scheduledClasses: scheduled,
      representedSections,
      avgUnits,
    }
  }, [count, pageRows])

  const handleSort = (key: typeof sort) => {
    if (sort === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(key)
      setSortDirection('asc')
    }
    setUserSorted(true)
  }



  const activeFilters = [
    sectionId !== 'all' ? `Section: ${sections.find(s => String(s.id) === sectionId)?.code || sectionId}` : null,
    dayFilter !== 'all' ? `Day: ${dayFilter}` : null,
    instructorFilter !== 'all' ? `Instructor: ${instructors.find(i => i.id === instructorFilter)?.full_name || 'Selected'}` : null,
    userSorted ? `Sorted by ${sort.charAt(0).toUpperCase() + sort.slice(1)} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})` : null,
  ].filter((f): f is string => f !== null)

  const headerActions = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <AnimatedActionBtn
        icon={Download}
        label="Export"
        onClick={handleExport}
        disabled={exporting}
        isLoading={exporting}
        loadingLabel="Preparing..."
        variant="secondary"
      />
      <AnimatedActionBtn
        icon={RefreshCw}
        label="Reload"
        onClick={handleManualRefresh}
        disabled={classesQuery.isFetching}
        isLoading={reloadSpinning}
        loadingLabel="Reloading..."
        variant="secondary"
        spinner="framer"
      />
      <AnimatedActionBtn
        icon={Upload}
        label="Import from image"
        onClick={() => setImportOpen(true)}
        variant="primary"
      />
      <AnimatedActionBtn
        icon={Plus}
        label="Add Class"
        onClick={() => setAddOpen(true)}
        variant="primary"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Classes</h1>
            <p className="text-muted-foreground">Manage your class schedules, instructors, and availability.</p>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <CardSurface className="space-y-4 shadow-sm border-border hover:border-border/80 transition-colors">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">Class filters</h2>
                <p className="text-sm text-muted-foreground">Search and filter by section, day, or status.</p>
              </div>
              <ActiveFiltersPills
                activeFilters={activeFilters}
                onClearFilters={() => {
                  setSearch('')
                  setDebouncedSearch('')
                  setSectionId('all')
                  setSort('title')
                  setSortDirection('asc')
                  setUserSorted(false)
                  setDayFilter('all')
                  setInstructorFilter('all')
                  setPage(1)
                }}
              />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search classes"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search classes by name, code, or room..."
                    className={inputClasses({ className: 'pl-10 pr-4' })}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          sectionId === 'all'
                            ? 'All Sections'
                            : sections.find(s => String(s.id) === sectionId)?.code ||
                            `Section ${sectionId}`
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                        aria-label="Choose section filter"
                        disabled={sectionsLoading}
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-0">
                      <div className="relative">
                        {sectionsLoading ? (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Spinner className="h-4 w-4" />
                              Loading sections...
                            </div>
                          </div>
                        ) : null}
                        <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                          <DropdownMenuItem onClick={() => setSectionId('all')}>
                            All Sections
                          </DropdownMenuItem>
                          {sections.map(section => (
                            <DropdownMenuItem
                              key={section.id}
                              onClick={() => setSectionId(String(section.id))}
                            >
                              {section.code || `Section ${section.id}`}
                            </DropdownMenuItem>
                          ))}
                        </ReactLenis>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          dayFilter === 'all'
                            ? 'All Days'
                            : DAY_SELECT_OPTIONS.find(d => d.value === dayFilter)?.label ||
                            dayFilter
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                        aria-label="Choose day filter"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[180px] p-0">
                      <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                        <DropdownMenuItem onClick={() => setDayFilter('all')}>
                          All Days
                        </DropdownMenuItem>
                        {DAY_SELECT_OPTIONS.map(option => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setDayFilter(option.value as DayValue | 'all')}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </ReactLenis>
                    </DropdownMenuContent>
                  </DropdownMenu>

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
                    <DropdownMenuContent align="start" className="w-[220px] p-0">
                      <div className="relative">
                        {instructorsLoading ? (
                          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Spinner className="h-4 w-4" />
                              Loading instructors...
                            </div>
                          </div>
                        ) : null}
                        <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                          <DropdownMenuItem onClick={() => setInstructorFilter('all')}>
                            All Instructors
                          </DropdownMenuItem>
                          {instructors.map(instructor => (
                            <DropdownMenuItem key={instructor.id} onClick={() => setInstructorFilter(instructor.id)}>
                              {instructor.full_name}
                            </DropdownMenuItem>
                          ))}
                        </ReactLenis>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </div>
            </div>
          </CardSurface>

          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            <StatsCard
              icon={Layers}
              label="Total Classes"
              value={String(stats.totalClasses)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Calendar}
              label="Scheduled"
              value={String(stats.scheduledClasses)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Grid}
              label="Sections"
              value={String(stats.representedSections)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Scale}
              label="Avg. Units"
              value={
                typeof stats.avgUnits === 'number'
                  ? stats.avgUnits.toFixed(1)
                  : '-'
              }
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
          </div>
          <div className="relative">
            {classesRefreshing ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Refreshing classes...</span>
                </div>
              </div>
            ) : null}
            <AdminTable
              loading={classesLoading}
              loadingLabel={null}
              error={classesErrorMessage}
              isEmpty={!classesLoading && pageRows.length === 0}
              emptyMessage="No classes found matching your filters."
              colSpan={7}
              minWidthClass="min-w-[1200px] table-fixed"
              pagination={
                <div className="flex w-full flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {Math.max(1, Math.ceil(count / pageSize))}
                    </span>
                    <PageSizeSelector
                      pageSize={pageSize}
                      onPageSizeChange={(newSize) => {
                        setPageSize(newSize as (typeof PAGE_SIZE_OPTIONS)[number])
                        setPage(1)
                      }}
                      options={[10, 20, 50, 100]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
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
                      onClick={() => setPage(p => Math.min(Math.ceil(count / pageSize), p + 1))}
                      disabled={page * pageSize >= count}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              }
              header={
                <tr>
                  <th className="w-[200px] rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="title" label="Class Name" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="code" label="Code" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[100px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="section" label="Section" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="instructor" label="Instructor" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="schedule" label="Schedule" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[120px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="room" label="Room" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSort} />
                  </th>
                  <th className="w-[60px] sticky right-0 z-10 rounded-tr-lg border-l border-border bg-background dark:bg-black px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3" style={{ backgroundColor: 'var(--background)' }}>
                    Actions
                  </th>
                </tr>
              }
            >
              {pageRows.map(row => (
                <React.Fragment key={row.id}>
                  <tr className="group transition-colors duration-200 hover:bg-muted/50 h-[52px]">
                    <td className="px-3 py-2.5 text-sm font-medium text-foreground sm:px-4">
                      <div className="w-full truncate" title={row.title ?? undefined}>
                        {row.title ?? '-'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{row.code ?? '-'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
                      {row.section_id ? sectionLookup.get(row.section_id) ?? row.section_id : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-foreground sm:px-4">
                      <div className="flex items-center gap-2.5">
                        <AvatarThumbnail
                          name={row.instructor_profile?.full_name ?? row.instructor ?? 'Unassigned'}
                          src={row.instructor_profile?.avatar_url ?? null}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="font-medium text-foreground truncate text-[13px]">{row.instructor ?? '-'}</div>
                          {row.instructor_profile?.title || row.instructor_profile?.department ? (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {[row.instructor_profile?.title, row.instructor_profile?.department].filter(Boolean).join(' - ')}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4 truncate" title={formatSchedule(row)}>{formatSchedule(row)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4 min-w-[70px]">{row.room ?? '-'}</td>
                    <td className="sticky right-0 px-3 py-2.5 text-right sm:px-4 border-l border-border w-[60px] bg-background dark:bg-black group-hover:bg-muted/50 transition-colors duration-200" style={{ backgroundColor: 'var(--background)' }}>
                      <div className="relative inline-flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <ActionMenuTrigger
                              ariaLabel="Class actions"
                              icon={MoreVertical}
                              size="sm"
                            />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                void handleViewDetails(row)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClass(row)}>
                              <Pencil className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => {
                                void deleteClass(row)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              {/* Spacer rows to maintain consistent height */}
              {!classesLoading && Array.from({ length: Math.max(0, pageSize - pageRows.length) }).map((_, index) => (
                <tr key={`spacer-${index}`} aria-hidden="true" className="h-[52px]">
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
        </div>
        <ImportClassesDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          sections={sections}
          instructors={instructors}
          onImported={handleImportComplete}
        />
        <AddClassDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          onCreated={handleClassCreated}
        />
        <EditClassDialog
          open={editDialogOpen}
          row={editingClass}
          onClose={() => setEditDialogOpen(false)}
          sections={sections}
          instructors={instructors}
          onSaved={handleClassUpdated}
        />
        <ViewClassDialog
          open={viewDialogOpen}
          detail={viewingClass}
          loading={viewingLoading}
          error={viewingError}
          onClose={closeViewDialog}
        />
      </div >
    </div >
  )
}
