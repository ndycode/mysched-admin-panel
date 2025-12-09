'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { ReactLenis } from 'lenis/react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Hash,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui'
import { Spinner } from '@/components/ui/Spinner'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { AdminTable } from '../_components/AdminTable'
import {
  ActionMenuTrigger,
  CardSurface,
  StatsCard,
  StatusPill,
} from '../_components/design-system'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import { Checkbox } from '@/components/ui/Checkbox'
import { formatDate } from '@/lib/date-utils'
import { inputClasses } from '@/components/ui/Input'

type Semester = {
  id: number
  code: string
  name: string
  academic_year: string | null
  term: number | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type SemesterDraft = {
  code: string
  name: string
  academic_year: string
  term: number | null
  start_date: string
  end_date: string
  is_active: boolean
}

const EMPTY_DRAFT: SemesterDraft = {
  code: '',
  name: '',
  academic_year: '',
  term: null,
  start_date: '',
  end_date: '',
  is_active: false,
}

const TERM_LABELS: Record<number, string> = {
  1: '1st Semester',
  2: '2nd Semester',
  3: 'Summer',
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export default function SemestersPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  // ...existing code...
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10)
  const [statsPulse, setStatsPulse] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Semester | null>(null)
  const [semesterToDelete, setSemesterToDelete] = useState<Semester | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)

  const toast = useToast()
  const queryClient = useQueryClient()

  const showApiError = useCallback(
    (error: unknown, fallback: string) => {
      const { message } = normalizeApiError(error, fallback)
      toast({ kind: 'error', msg: message })
    },
    [toast],
  )

  const semestersQuery = useQuery({
    queryKey: ['semesters'],
    queryFn: async () => {
      const res = await api<Semester[]>('/api/semesters')
      return res
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

  const isLoading = semestersQuery.isLoading
  const isFetching = semestersQuery.isFetching
  const reloadSpinning = isFetching || isLoading || !semestersQuery.data

  const semesters = useMemo(() => semestersQuery.data ?? [], [semestersQuery.data])
  const activeSemester = useMemo(() => semesters.find(s => s.is_active), [semesters])

  // Filter semesters by status
  const filteredSemesters = useMemo(() => {
    if (statusFilter === 'all') return semesters
    if (statusFilter === 'active') return semesters.filter(s => s.is_active)
    return semesters.filter(s => !s.is_active)
  }, [semesters, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSemesters.length / pageSize))
  const paginatedSemesters = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredSemesters.slice(start, start + pageSize)
  }, [filteredSemesters, page, pageSize])

  // Stats calculation
  const stats = useMemo(() => {
    const total = semesters.length
    const active = semesters.filter(s => s.is_active).length
    const inactive = semesters.filter(s => !s.is_active).length
    const withDates = semesters.filter(s => s.start_date && s.end_date).length
    return { total, active, inactive, withDates }
  }, [semesters])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['semesters'] })
    setStatsPulse(prev => prev + 1)
  }, [queryClient])

  const handleSave = useCallback(
    async (draft: SemesterDraft, existingId?: number) => {
      setIsSaving(true)
      try {
        const payload = {
          code: draft.code.trim(),
          name: draft.name.trim(),
          academic_year: draft.academic_year.trim() || null,
          term: draft.term,
          start_date: draft.start_date || null,
          end_date: draft.end_date || null,
          is_active: draft.is_active,
        }

        if (existingId) {
          await api(`/api/semesters/${existingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
          toast({ kind: 'success', msg: 'Semester updated' })
        } else {
          await api('/api/semesters', { method: 'POST', body: JSON.stringify(payload) })
          toast({ kind: 'success', msg: 'Semester created' })
        }

        setAddOpen(false)
        setEditing(null)
        refresh()
      } catch (err) {
        showApiError(err, 'Failed to save semester')
      } finally {
        setIsSaving(false)
      }
    },
    [refresh, toast, showApiError],
  )

  const handleSetActive = useCallback(
    async (semester: Semester) => {
      try {
        await api(`/api/semesters/${semester.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: true }),
        })
        toast({ kind: 'success', msg: `"${semester.name}" is now the active semester` })
        refresh()
      } catch (err) {
        showApiError(err, 'Failed to set active semester')
      }
    },
    [refresh, toast, showApiError],
  )

  const confirmDelete = useCallback(async () => {
    if (!semesterToDelete) return
    setIsDeleting(true)
    try {
      await api(`/api/semesters/${semesterToDelete.id}`, { method: 'DELETE' })
      toast({ kind: 'success', msg: 'Semester deleted' })
      setSemesterToDelete(null)
      refresh()
    } catch (err) {
      showApiError(err, 'Failed to delete semester')
    } finally {
      setIsDeleting(false)
    }
  }, [semesterToDelete, refresh, toast, showApiError])

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedSemesters.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedSemesters.map(s => s.id)))
    }
  }, [paginatedSemesters, selectedIds.size])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      for (const id of selectedIds) {
        await api(`/api/semesters/${id}`, { method: 'DELETE' })
      }
      toast({ kind: 'success', msg: `Deleted ${selectedIds.size} semester(s)` })
      setSelectedIds(new Set())
      setBulkDeleteConfirmOpen(false)
      refresh()
    } catch {
      toast({ kind: 'error', msg: 'Some deletions failed' })
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedIds, toast, refresh])

  const headerActions = (
    <>
      {/* Desktop / Tablet layout */}
      <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <AnimatedActionBtn
          icon={RefreshCw}
          label="Reload"
          onClick={refresh}
          disabled={isFetching}
          isLoading={reloadSpinning}
          loadingLabel="Reloading..."
          variant="secondary"
          spinner="framer"
        />
        <AnimatedActionBtn
          icon={Plus}
          label="Add Semester"
          onClick={() => setAddOpen(true)}
          variant="primary"
        />
      </div>

      {/* Mobile layout */}
      <div className="flex flex-col gap-2 sm:hidden">
        <AnimatedActionBtn
          icon={Plus}
          label="Add Semester"
          onClick={() => setAddOpen(true)}
          variant="primary"
          className="w-full justify-center"
        />
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Semesters</h1>
            <p className="text-muted-foreground">Manage academic terms and semesters.</p>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="order-1 grid grid-cols-2 gap-3 sm:order-none sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            <StatsCard
              icon={Calendar}
              label="Total Semesters"
              value={String(stats.total)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Check}
              label="Active"
              value={activeSemester?.name ?? 'None'}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Hash}
              label="Inactive"
              value={String(stats.inactive)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Clock}
              label="With Dates"
              value={String(stats.withDates)}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
          </div>

          {/* Filters */}
          <CardSurface className="order-2 space-y-4 shadow-sm border-border hover:border-border/80 transition-colors sm:order-none">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">Semester filters</h2>
                <p className="text-sm text-muted-foreground">Filter by status to find semesters.</p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center lg:flex-row lg:items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <AnimatedActionBtn
                      label={
                        statusFilter === 'all'
                          ? 'All Semesters'
                          : statusFilter === 'active'
                            ? 'Active Only'
                            : 'Inactive Only'
                      }
                      icon={ChevronDown}
                      variant="secondary"
                      className="justify-between gap-2 px-4"
                      aria-label="Choose status filter"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 p-0">
                    <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        All Semesters
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                        Active Only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                        Inactive Only
                      </DropdownMenuItem>
                    </ReactLenis>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardSurface>

          {/* Table */}
          <div className="relative">
            {isFetching && !isLoading ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Refreshing semesters...</span>
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
              loading={isLoading}
              loadingLabel={null}
              error={semestersQuery.error ? (semestersQuery.error as Error).message : null}
              isEmpty={!isLoading && paginatedSemesters.length === 0}
              emptyMessage="No semesters found. Create your first semester to start organizing schedules."
              colSpan={7}
              minWidthClass="min-w-[900px] table-fixed"
              pagination={
                <div className="flex w-full flex-wrap items-center gap-3 sm:justify-between">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
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
                      checked={paginatedSemesters.length > 0 && selectedIds.size === paginatedSemesters.length}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < paginatedSemesters.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th scope="col" className="w-[280px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Semester
                  </th>
                  <th scope="col" className="w-[140px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Term
                  </th>
                  <th scope="col" className="w-[140px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Academic Year
                  </th>
                  <th scope="col" className="w-[220px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Date Range
                  </th>
                  <th scope="col" className="w-[120px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Status
                  </th>
                  <th scope="col" className="w-[60px] sticky right-0 z-10 rounded-tr-lg border-l border-border bg-background dark:bg-black px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3" style={{ backgroundColor: 'var(--background)' }}>
                    Actions
                  </th>
                </tr>
              }
            >
              {paginatedSemesters.map(row => {
                const isSelected = selectedIds.has(row.id)
                return (
                  <tr key={row.id} className={`group transition-colors duration-200 h-[52px] ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <td className="w-12 px-3 py-2.5 sm:px-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="w-[280px] px-3 py-2.5 text-sm font-medium text-foreground sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{row.name}</div>
                          <div className="text-xs text-muted-foreground">{row.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="w-40 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
                      {row.term ? TERM_LABELS[row.term] : '—'}
                    </td>
                    <td className="w-40 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
                      {row.academic_year || '—'}
                    </td>
                    <td className="w-56 whitespace-nowrap px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
                      {row.start_date && row.end_date
                        ? `${formatDate(row.start_date)} – ${formatDate(row.end_date)}`
                        : row.start_date
                          ? `From ${formatDate(row.start_date)}`
                          : '—'}
                    </td>
                    <td className="w-32 whitespace-nowrap px-3 py-2.5 sm:px-4">
                      {row.is_active ? (
                        <StatusPill tone="success">Active</StatusPill>
                      ) : (
                        <StatusPill tone="info">Inactive</StatusPill>
                      )}
                    </td>
                    <td
                      className="sticky right-0 px-3 py-2.5 text-right sm:px-4 border-l border-border w-16 bg-background dark:bg-black group-hover:bg-muted/50 transition-colors duration-200"
                      style={{ backgroundColor: 'var(--background)' }}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <ActionMenuTrigger ariaLabel="Semester actions" icon={MoreVertical} size="sm" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {!row.is_active && (
                            <DropdownMenuItem onClick={() => handleSetActive(row)}>
                              <Check className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                              Set as Active
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setEditing(row)}>
                            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => setSemesterToDelete(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {/* Spacer rows to maintain consistent height */}
              {!isLoading && Array.from({ length: Math.max(0, pageSize - paginatedSemesters.length) }).map((_, index) => (
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

        {/* Add/Edit Dialog */}
        <SemesterFormDialog
          open={addOpen || !!editing}
          onClose={() => {
            setAddOpen(false)
            setEditing(null)
          }}
          semester={editing}
          onSave={handleSave}
          isSaving={isSaving}
          semesters={semesters}
        />

        {/* Delete Confirmation */}
        <DeleteConfirmationDialog
          open={!!semesterToDelete}
          onOpenChange={(open) => !open && setSemesterToDelete(null)}
          onConfirm={confirmDelete}
          isDeleting={isDeleting}
          title="Delete Semester"
          description={`Are you sure you want to delete "${semesterToDelete?.name}"? This action cannot be undone.`}
        />
        <DeleteConfirmationDialog
          open={bulkDeleteConfirmOpen}
          onOpenChange={setBulkDeleteConfirmOpen}
          title="Delete Selected Semesters"
          description={`Are you sure you want to delete ${selectedIds.size} semester(s)? This action cannot be undone.`}
          onConfirm={() => void handleBulkDelete()}
          isDeleting={isBulkDeleting}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Semester Form Dialog
   ───────────────────────────────────────────────────────────────────────────── */

function SemesterFormDialog({
  open,
  onClose,
  semester,
  onSave,
  isSaving,
  semesters
}: {
  open: boolean
  onClose: () => void
  semester: Semester | null
  onSave: (draft: SemesterDraft, existingId?: number) => Promise<void>
  isSaving: boolean
  semesters: Semester[]
}) {
  const [draft, setDraft] = useState<SemesterDraft>(EMPTY_DRAFT)
  const [validationError, setValidationError] = useState<string | null>(null)
  // Only allow one active semester
  const anotherActive = semesters.some((s: Semester) => s.is_active && (!semester || s.id !== semester.id))

  React.useEffect(() => {
    if (semester) {
      setDraft({
        code: semester.code,
        name: semester.name,
        academic_year: semester.academic_year ?? '',
        term: semester.term,
        start_date: semester.start_date ?? '',
        end_date: semester.end_date ?? '',
        is_active: semester.is_active,
      })
    } else {
      setDraft(EMPTY_DRAFT)
    }
    setValidationError(null)
  }, [semester, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.code.trim()) {
      setValidationError('Code is required')
      return
    }
    if (!draft.name.trim()) {
      setValidationError('Name is required')
      return
    }
    if (draft.is_active && anotherActive) {
      setValidationError('Only one semester can be active at a time.')
      return
    }
    setValidationError(null)
    onSave(draft, semester?.id)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isSaving && onClose()}
      className="max-w-2xl"
    >
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">
          {semester ? 'Edit Semester' : 'Add New Semester'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {semester
            ? 'Update semester details below.'
            : 'Create a new academic semester to organize your schedules.'}
        </p>
      </DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
          {validationError ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {validationError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Code <span className="text-destructive">*</span>
              <input
                type="text"
                className={inputClasses({ className: 'mt-2' })}
                placeholder="e.g., 2025-2026-1"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              Name <span className="text-destructive">*</span>
              <input
                type="text"
                className={inputClasses({ className: 'mt-2' })}
                placeholder="e.g., 1st Semester 2025-2026"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Academic Year
              <input
                type="text"
                className={inputClasses({ className: 'mt-2' })}
                placeholder="e.g., 2025-2026"
                value={draft.academic_year}
                onChange={(e) => setDraft((d) => ({ ...d, academic_year: e.target.value }))}
              />
            </label>
            <div className="text-sm font-medium text-foreground">
              Term
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <AnimatedActionBtn
                    label={draft.term ? TERM_LABELS[draft.term] : 'Select term...'}
                    icon={ChevronDown}
                    variant="secondary"
                    className="w-full justify-between h-11 px-3 mt-2 rounded-full"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0">
                  <ReactLenis className="max-h-72 overflow-y-auto p-1" options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
                    <DropdownMenuItem onClick={() => setDraft((d) => ({ ...d, term: null }))}>
                      Select term...
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDraft((d) => ({ ...d, term: 1 }))}>
                      1st Semester
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDraft((d) => ({ ...d, term: 2 }))}>
                      2nd Semester
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDraft((d) => ({ ...d, term: 3 }))}>
                      Summer
                    </DropdownMenuItem>
                  </ReactLenis>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground">
              Start Date
              <input
                type="date"
                className={inputClasses({ className: 'mt-2' })}
                value={draft.start_date}
                onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))}
              />
            </label>
            <label className="text-sm font-medium text-foreground">
              End Date
              <input
                type="date"
                className={inputClasses({ className: 'mt-2' })}
                value={draft.end_date}
                onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))}
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              checked={draft.is_active}
              disabled={anotherActive && !draft.is_active}
              onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-foreground"
            >
              Set as active semester
              {anotherActive && !draft.is_active ? (
                <span className="ml-2 text-xs text-muted-foreground">(Another semester is already active)</span>
              ) : null}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !draft.code.trim() || !draft.name.trim()}>
              {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {semester ? 'Save Changes' : 'Create Semester'}
            </Button>
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}
