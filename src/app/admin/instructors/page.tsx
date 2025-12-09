'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Pencil, Plus, RefreshCw, Search, Trash2, Users, ChevronsUpDown, ArrowUp, ArrowDown, ChevronDown, X, Check, MoreVertical, Wand2, Building2 } from 'lucide-react'

import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { Button } from '@/components/ui'
import { Checkbox } from '@/components/ui/Checkbox'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { AdminTable } from '../_components/AdminTable'
import { ActionMenuTrigger, CardSurface, StatsCard } from '../_components/design-system'
import { SortableTableHeader } from '../_components/SortableTableHeader'
import { ActiveFiltersPills } from '../_components/ActiveFiltersPills'
import { useFilterPersistence } from '../_hooks/useFilterPersistence'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { ScheduleDialog } from './components/ScheduleDialog'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'

import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { cn } from '@/lib/utils'
import { buttonClasses } from '@/components/ui/Button'
import { inputClasses } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/date-utils'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

type Instructor = {
  id: string
  full_name: string
  email: string | null
  title: string | null
  department: string | null
  avatar_url: string | null
  created_at: string | null
  updated_at: string | null
}

type InstructorsResponse = {
  rows: Instructor[]
  count: number
  page: number
  limit: number
}

type InstructorDraft = {
  full_name: string
  email: string | null
  title: string | null
  department: string | null
  avatar_url: string | null
}





export default function InstructorsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sort, setSort] = useState<'name' | 'recent'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [userSorted, setUserSorted] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [statsPulse, setStatsPulse] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Instructor | null>(null)
  const [scheduleInstructor, setScheduleInstructor] = useState<Instructor | null>(null)
  const [instructorToDelete, setInstructorToDelete] = useState<Instructor | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAutoAssigning, setIsAutoAssigning] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkSettingDept, setIsBulkSettingDept] = useState(false)
  const [bulkDeptDialogOpen, setBulkDeptDialogOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const FILTER_STORAGE_KEY = 'admin_instructors_filters'

  const toast = useToast()
  const queryClient = useQueryClient()
  const debounceRef = useRef<number | null>(null)

  const queryKey = useMemo(
    () =>
      [
        'instructors',
        { search: debouncedSearch, page, limit: pageSize, sort, direction: sortDirection, department: departmentFilter },
      ] as const,
    [debouncedSearch, page, pageSize, sort, sortDirection, departmentFilter],
  )

  const instructorsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (departmentFilter !== 'all') params.set('department', departmentFilter)
      params.set('sort', sort)
      params.set('direction', sortDirection)

      const res = await api<InstructorsResponse>(`/api/instructors?${params.toString()}`)
      return res
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const instructors = instructorsQuery.data?.rows ?? []
  const count = instructorsQuery.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const isLoading = instructorsQuery.isLoading
  const isFetching = instructorsQuery.isFetching
  const instructorsRefreshing = isFetching
  const reloadSpinning = isFetching || isLoading || !instructorsQuery.data
  const tableLoading = isFetching
  const instructorsErrorMessage =
    (instructorsQuery.error as { message?: string } | null)?.message || null

  // Fetch ALL departments separately so the filter dropdown always shows all options
  const departmentsQuery = useQuery({
    queryKey: ['instructors', 'all-departments'],
    queryFn: async () => {
      const res = await api<{ rows: Instructor[] }>('/api/instructors?page=1&limit=1000')
      const depts = new Set<string>()
      res.rows.forEach(i => {
        if (i.department?.trim()) depts.add(i.department.trim())
      })
      return Array.from(depts).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    },
    staleTime: 60_000,
  })
  const departmentOptions = departmentsQuery.data ?? []

  const activeFilters = useMemo(() => {
    const pills: string[] = []
    if (debouncedSearch.trim()) pills.push(`Search: "${debouncedSearch.trim()}"`)
    if (departmentFilter !== 'all') pills.push(`Department: ${departmentFilter}`)
    if (userSorted) {
      pills.push(`Sorted by ${sort === 'name' ? 'Name' : 'Added'} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`)
    }
    return pills
  }, [debouncedSearch, departmentFilter, sort, sortDirection, userSorted])

  const handleSortChange = useCallback((key: typeof sort) => {
    setUserSorted(true)
    setSort(prev => {
      if (prev === key) {
        setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDirection(key === 'recent' ? 'desc' : 'asc')
      return key
    })
  }, [])



  useEffect(() => {
    if (!instructorsQuery.error) return
    const msg =
      (instructorsQuery.error as { message?: string } | null)?.message || 'Failed to load instructors'
    toast({ kind: 'error', msg })
  }, [instructorsQuery.error, toast])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [search])

  useFilterPersistence(
    FILTER_STORAGE_KEY,
    { search, sort, sortDirection, departmentFilter },
    {
      search: (val) => {
        setSearch(val)
        setDebouncedSearch(val.trim())
      },
      sort: setSort,
      sortDirection: setSortDirection,
      departmentFilter: setDepartmentFilter,
    },
    (saved) => {
      const nonDefaultSort = saved.sort && saved.sort !== 'name'
      const nonDefaultDir = saved.sortDirection && saved.sortDirection !== 'asc'
      if (nonDefaultSort || nonDefaultDir) setUserSorted(true)
    }
  )

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, sort, sortDirection, departmentFilter])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const uploadAvatar = useCallback(async (file: File, name?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (name && name.trim()) {
      formData.append('name', name.trim())
    }
    const response = await fetch('/api/instructors/upload', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })
    if (!response.ok) {
      let message = 'Upload failed'
      try {
        const payload = await response.json()
        if (payload?.error) message = payload.error as string
      } catch {
        // ignore
      }
      throw new Error(message)
    }
    const payload = (await response.json()) as { url: string }
    return payload.url
  }, [])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['instructors'] })
    queryClient.invalidateQueries({ queryKey: ['instructors', 'options'] })
  }, [queryClient])

  const handleRetryInstructors = useCallback(() => {
    queryClient.invalidateQueries({ queryKey }).catch(() => { })
  }, [queryClient, queryKey])

  const handleCreate = useCallback(
    async (draft: InstructorDraft) => {
      await api('/api/instructors', {
        method: 'POST',
        body: JSON.stringify(draft),
      })
      toast({ kind: 'success', msg: 'Instructor created' })
      invalidate()
    },
    [invalidate, toast],
  )

  const handleUpdate = useCallback(
    async (id: string, draft: InstructorDraft) => {
      await api(`/api/instructors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      })
      toast({ kind: 'success', msg: 'Instructor updated' })
      invalidate()
    },
    [invalidate, toast],
  )

  const handleDelete = useCallback((row: Instructor) => {
    setInstructorToDelete(row)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!instructorToDelete) return
    setIsDeleting(true)
    try {
      await api(`/api/instructors/${instructorToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      toast({ kind: 'success', msg: 'Instructor deleted' })
      invalidate()
      setInstructorToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }, [instructorToDelete, invalidate, toast])

  const handleAutoAssign = useCallback(async () => {
    setIsAutoAssigning(true)
    try {
      const result = await api<{ message: string; updated: number }>('/api/instructors/auto-assign-departments', {
        method: 'POST',
      })
      toast({ kind: 'success', msg: result.message })
      invalidate()
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || 'Auto-assign failed'
      toast({ kind: 'error', msg })
    } finally {
      setIsAutoAssigning(false)
    }
  }, [invalidate, toast])

  // Bulk selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === instructors.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(instructors.map(i => i.id)))
    }
  }, [instructors, selectedIds.size])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      await api('/api/instructors/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      })
      toast({ kind: 'success', msg: `Deleted ${ids.length} instructor(s)` })
      setSelectedIds(new Set())
      invalidate()
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || 'Bulk delete failed'
      toast({ kind: 'error', msg })
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedIds, invalidate, toast])

  const handleBulkSetDepartment = useCallback(async (department: string) => {
    if (selectedIds.size === 0) return
    setIsBulkSettingDept(true)
    try {
      const ids = Array.from(selectedIds)
      await api('/api/instructors/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ ids, department }),
      })
      toast({ kind: 'success', msg: `Updated ${ids.length} instructor(s)` })
      setSelectedIds(new Set())
      setBulkDeptDialogOpen(false)
      invalidate()
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || 'Bulk update failed'
      toast({ kind: 'error', msg })
    } finally {
      setIsBulkSettingDept(false)
    }
  }, [selectedIds, invalidate, toast])

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <AnimatedActionBtn
        icon={RefreshCw}
        label="Reload"
        onClick={() => {
          setStatsPulse(p => p + 1)
          void instructorsQuery.refetch()
        }}
        isLoading={reloadSpinning}
        loadingLabel="Reloading..."
        variant="secondary"
        spinner="framer"
        className="hidden sm:inline-flex"
      />
      <AnimatedActionBtn
        icon={Wand2}
        label="Auto-assign Departments"
        onClick={() => void handleAutoAssign()}
        isLoading={isAutoAssigning}
        loadingLabel="Assigning..."
        variant="secondary"
      />
      <AnimatedActionBtn
        icon={Plus}
        label="Add Instructor"
        onClick={() => setAddOpen(true)}
        variant="primary"
      />
    </div>
  )

  const renderRow = useCallback((row: Instructor) => {
    const isSelected = selectedIds.has(row.id)
    return (
      <tr key={row.id} className={cn("group transition-colors duration-200 h-[52px]", isSelected ? "bg-primary/5" : "hover:bg-muted/50")}>
        <td className="w-12 px-3 py-2.5 sm:px-4">
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelect(row.id)}
          />
        </td>
        <td className="w-[280px] px-3 py-2.5 text-sm font-medium text-foreground sm:px-4">
          <div className="flex items-center gap-2.5">
            <AvatarThumbnail name={row.full_name} src={row.avatar_url} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">{row.full_name}</div>
              {row.title ? <div className="truncate text-[11px] text-muted-foreground">{row.title}</div> : null}
            </div>
          </div>
        </td>
        <td className="w-60 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4 truncate">{row.email ?? '-'}</td>
        <td className="w-44 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4 truncate">{row.title ?? '-'}</td>
        <td className="w-40 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4 truncate">{row.department ?? '-'}</td>
        <td className="w-40 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{formatDate(row.created_at)}</td>
        <td
          className="sticky right-0 px-3 py-2.5 text-right sm:px-4 border-l border-border w-16 bg-background dark:bg-black group-hover:bg-muted/50 transition-colors duration-200"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionMenuTrigger ariaLabel="Instructor actions" icon={MoreVertical} size="sm" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setScheduleInstructor(row)}>
                <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                Manage Schedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditing(row)}>
                <Pencil className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => handleDelete(row)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                Delete Instructor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    )
  }, [handleDelete, selectedIds, toggleSelect])

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Instructors</h1>
            <p className="text-muted-foreground">Manage instructor roles and schedule assignments.</p>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <CardSurface className="space-y-4 shadow-sm border-border hover:border-border/80 transition-colors">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">Instructor filters</h2>
                <p className="text-sm text-muted-foreground">Search and filter instructors.</p>
              </div>
              <ActiveFiltersPills
                activeFilters={activeFilters}
                onClearFilters={() => {
                  setSearch('')
                  setDebouncedSearch('')
                  setSort('name')
                  setSortDirection('asc')
                  setDepartmentFilter('all')
                  setUserSorted(false)
                  setPage(1)
                }}
              />
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search instructors..."
                    className={inputClasses({ className: 'pl-10 pr-4' })}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={departmentFilter === 'all' ? 'All Departments' : departmentFilter}
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setDepartmentFilter('all')}>
                        All Departments
                      </DropdownMenuItem>
                      {departmentOptions.map(option => (
                        <DropdownMenuItem key={option} onClick={() => setDepartmentFilter(option)}>
                          {option}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardSurface>

          {instructorsErrorMessage ? (
            <CardSurface className="flex flex-wrap items-start justify-between gap-3 border-destructive/30 bg-destructive/5 text-destructive">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Failed to load instructors</p>
                <p className="text-sm text-destructive/90">{instructorsErrorMessage}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRetryInstructors}
                className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15"
              >
                Retry
              </Button>
            </CardSurface>
          ) : null}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            <StatsCard
              icon={Users}
              label="Total Instructors"
              value={count.toLocaleString()}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
          </div>

          <div className="relative">
            {instructorsRefreshing ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Refreshing instructors...</span>
                </div>
              </div>
            ) : null}

            {/* Bulk actions toolbar */}
            {selectedIds.size > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-background/95 backdrop-blur p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} selected
                </span>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDeptDialogOpen(true)}
                  disabled={isBulkSettingDept}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Set Department
                </Button>
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
              error={instructorsErrorMessage}
              isEmpty={!tableLoading && instructors.length === 0}
              emptyMessage="No instructors found. Try adjusting your search."
              colSpan={7}
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
                      options={PAGE_SIZE_OPTIONS}
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
                      checked={instructors.length > 0 && selectedIds.size === instructors.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < instructors.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col" className="w-[280px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="name" label="Instructor" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th scope="col" className="w-[240px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Email
                  </th>
                  <th scope="col" className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Title
                  </th>
                  <th scope="col" className="w-[160px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Department
                  </th>
                  <th scope="col" className="w-[160px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="recent" label="Added" currentSort={sort} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th scope="col" className="w-[60px] sticky right-0 z-10 rounded-tr-lg border-l border-border bg-background dark:bg-black px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3" style={{ backgroundColor: 'var(--background)' }}>
                    Actions
                  </th>
                </tr>
              }
            >
              {instructors.map(renderRow)}
              {!isLoading && Array.from({ length: Math.max(0, pageSize - instructors.length) }).map((_, index) => (
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

          <InstructorDialog
            mode="create"
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSubmit={async draft => {
              await handleCreate(draft)
              setAddOpen(false)
            }}
            onUpload={uploadAvatar}
          />
          <InstructorDialog
            mode="edit"
            open={editing != null}
            instructor={editing}
            onClose={() => setEditing(null)}
            onSubmit={async draft => {
              if (!editing) return
              await handleUpdate(editing.id, draft)
              setEditing(null)
            }}
            onUpload={uploadAvatar}
          />
          <ScheduleDialog
            open={scheduleInstructor != null}
            instructor={scheduleInstructor}
            onClose={() => setScheduleInstructor(null)}
          />
          <DeleteConfirmationDialog
            open={instructorToDelete !== null}
            onOpenChange={(open) => !open && setInstructorToDelete(null)}
            title="Delete Instructor"
            description={`Are you sure you want to delete ${instructorToDelete?.full_name ?? 'this instructor'}? This action cannot be undone.`}
            onConfirm={() => void confirmDelete()}
            isDeleting={isDeleting}
          />

          {/* Bulk Set Department Dialog */}
          <Dialog open={bulkDeptDialogOpen} onOpenChange={setBulkDeptDialogOpen}>
            <DialogBody>
              <h2 className="text-lg font-semibold">Set Department</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a department for the {selectedIds.size} selected instructor(s).
              </p>
              <div className="mt-4 space-y-2">
                {['Accountancy', 'Arts & Media', 'Criminology', 'CSIT', 'CTHM', 'Education', 'General Education'].map(dept => (
                  <Button
                    key={dept}
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => handleBulkSetDepartment(dept)}
                    disabled={isBulkSettingDept}
                  >
                    {dept}
                  </Button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={() => setBulkDeptDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </DialogBody>
          </Dialog>

          {/* Bulk Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
            open={bulkDeleteConfirmOpen}
            onOpenChange={setBulkDeleteConfirmOpen}
            title="Delete Selected Instructors"
            description={`Are you sure you want to delete ${selectedIds.size} instructor(s)? This action cannot be undone. Instructors with assigned classes cannot be deleted.`}
            onConfirm={() => {
              setBulkDeleteConfirmOpen(false)
              void handleBulkDelete()
            }}
            isDeleting={isBulkDeleting}
          />
        </div>
      </div>
    </div>
  )
}

type InstructorDialogProps = {
  mode: 'create' | 'edit'
  open: boolean
  instructor?: Instructor | null
  onClose: () => void
  onSubmit: (draft: InstructorDraft) => Promise<void>
  onUpload: (file: File, name?: string) => Promise<string>
}

function InstructorDialog({ mode, open, instructor, onClose, onSubmit, onUpload }: InstructorDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const instructorId = instructor?.id ?? 'create'

  useEffect(() => {
    if (!open) return
    setFullName(instructor?.full_name ?? '')
    setEmail(instructor?.email ?? '')
    setTitle(instructor?.title ?? '')
    setDepartment(instructor?.department ?? '')
    setAvatarUrl(instructor?.avatar_url ?? null)
    setSubmitting(false)
    setUploading(false)
  }, [
    open,
    instructorId,
    instructor?.full_name,
    instructor?.email,
    instructor?.title,
    instructor?.department,
    instructor?.avatar_url,
  ])

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      const url = await onUpload(file, fullName)
      setAvatarUrl(url)
      toast({ kind: 'success', msg: 'Avatar uploaded' })
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || 'Upload failed'
      toast({ kind: 'error', msg })
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = fullName.trim()
    if (!trimmedName) {
      toast({ kind: 'error', msg: 'Full name is required' })
      return
    }

    setSubmitting(true)
    try {
      const draft: InstructorDraft = {
        full_name: trimmedName,
        email: email.trim() ? email.trim() : null,
        title: title.trim() ? title.trim() : null,
        department: department.trim() ? department.trim() : null,
        avatar_url: avatarUrl ?? null,
      }
      await onSubmit(draft)
    } catch (error) {
      const msg = (error as { message?: string } | null)?.message || 'Save failed'
      toast({ kind: 'error', msg })
      setSubmitting(false)
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-3xl">
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">
          {mode === 'create' ? 'Add instructor' : 'Edit instructor'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'create'
            ? 'Create a new instructor profile to assign to classes.'
            : 'Update instructor details and keep your directory current.'}
        </p>
      </DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="flex items-center gap-4">
            <AvatarThumbnail name={fullName || 'Instructor'} src={avatarUrl} />
            <div className="space-x-2">
              <label className={cn(
                buttonClasses({ variant: 'secondary', size: 'sm', className: 'cursor-pointer px-4 py-2 text-xs' }),
                'inline-flex items-center gap-2'
              )}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) void handleUpload(file)
                    event.target.value = ''
                  }}
                  disabled={uploading || submitting}
                />
                {uploading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner /> Uploading...
                  </span>
                ) : (
                  'Upload avatar'
                )}
              </label>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className={cn(buttonClasses({ variant: 'ghost', size: 'sm', className: 'text-xs px-3 py-2' }), 'inline-flex items-center gap-2')}
                  disabled={uploading || submitting}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <label className="text-sm font-medium text-foreground">
            Full name
            <input
              type="text"
              value={fullName}
              onChange={event => setFullName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Dr. Jane Smith"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Email
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="jane.smith@example.edu"
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Title
              <input
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Professor"
              />
            </label>
          </div>

          <label className="text-sm font-medium text-foreground">
            Department
            <input
              type="text"
              value={department}
              onChange={event => setDepartment(event.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Computer Science"
            />
          </label>

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
              label={mode === 'create' ? 'Create instructor' : 'Save changes'}
              onClick={() => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              isLoading={submitting}
              loadingLabel={mode === 'create' ? 'Creating...' : 'Saving...'}
              variant="primary"
            />
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
