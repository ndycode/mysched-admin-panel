'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactLenis } from 'lenis/react'
import {
  Calendar,
  Download,
  Eye,
  FileCode,
  Filter,
  MoreVertical,
  Search,
  SquareCode,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { format } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'
import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'

import { Button, PrimaryButton } from '@/components/ui'
import { Spinner } from '@/components/ui/Spinner'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { buttonClasses } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Skeleton } from '@/components/ui/Skeleton'
import { inputClasses } from '@/components/ui/Input'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { AdminTable } from '../_components/AdminTable'
import { ActionMenuTrigger, CardSurface, StatsCard, StatusPill } from '../_components/design-system'
import { SortableTableHeader } from '../_components/SortableTableHeader'
import { ActiveFiltersPills } from '../_components/ActiveFiltersPills'
import { TableActions } from '../_components/TableActions'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import { DetailRow } from '../_components/DetailRow'
import {
  ACTION_OPTIONS,
  compareLogs,
  formatActionLabel,
  formatDateRangeLabel,
  formatDetails,
  formatDetailsTooltip,
  formatTimestamp,
  inputToIso,
  isSameDay,
  isoToInput,
  mapAuditLogRow,
  prettyPrint,
  QUICK_RANGES,
  SORT_OPTIONS,
  TABLE_OPTIONS,
} from './utils'
import {
  ActionFilter,
  AuditLogApiRow,
  AuditLogRecord,
  DateRange,
  DetailState,
  SortOption,
  TableFilter,
} from './types'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'




export default function AuditLogPage() {
  const toast = useToast()
  const [pageSize, setPageSize] = useState(10)

  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [tableFilter, setTableFilter] = useState<TableFilter>('all')
  const [userFilter, setUserFilter] = useState<'all' | string>('all')
  const [actors, setActors] = useState<Array<{ id: string; name: string }>>([])
  const [sortKey, setSortKey] = useState<SortOption>('timestamp')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [userSorted, setUserSorted] = useState(false)
  const [detailState, setDetailState] = useState<DetailState>(null)
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null })
  const [page, setPage] = useState(1)
  const [resetting, setResetting] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, actionFilter, tableFilter, userFilter, sortKey, sortDirection, dateRange])

  useEffect(() => {
    const loadActors = async () => {
      try {
        const data = await api<AuditLogApiRow[]>('/api/audit?limit=200&sort=recent')
        const seen = new Map<string, string>()
        data.forEach(row => {
          if (row.user_id && !seen.has(row.user_id)) {
            seen.set(row.user_id, row.user_name ?? row.user_id)
          }
        })
        setActors(Array.from(seen.entries()).map(([id, name]) => ({ id, name })))
      } catch {
        // ignore
      }
    }
    void loadActors()
  }, [])

  const debouncedSearch = useDebounced(search, 300)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '200')
      if (tableFilter !== 'all') params.set('table', tableFilter)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (userFilter !== 'all') params.set('user_id', userFilter)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (dateRange.start) params.set('start', dateRange.start)
      if (dateRange.end) params.set('end', dateRange.end)
      const serverSort =
        sortKey === 'user'
          ? 'user'
          : sortKey === 'table'
            ? 'table'
            : sortDirection === 'asc'
              ? 'oldest'
              : 'recent'
      params.set('sort', serverSort)

      const url = params.size > 0 ? `/api/audit?${params.toString()}` : '/api/audit'
      const data = await api<AuditLogApiRow[]>(url)

      const mapped = data.map((row, index) => mapAuditLogRow(row, index))
      const deduped = dedupeLogs(mapped)
      setLogs(deduped)
    } catch (err) {
      const message = (err as { message?: string } | null)?.message || 'Failed to load audit logs'
      setError(message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [actionFilter, dateRange.end, dateRange.start, debouncedSearch, sortDirection, sortKey, tableFilter, userFilter])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  const rangeLabel = useMemo(() => formatDateRangeLabel(dateRange), [dateRange])
  const hasDateRange = Boolean(dateRange.start || dateRange.end)

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase()
    const action = actionFilter
    const table = tableFilter

    const filtered = logs.filter((log) => {
      if (action !== 'all' && log.action !== action) return false
      if (table !== 'all' && (log.tableName ?? 'all') !== table) return false
      if (!term) return true

      const haystack = [
        log.id.toString(),
        log.userId ?? '',
        log.userName?.toLowerCase() ?? '',
        log.tableName ?? '',
        log.rowId ? log.rowId.toString() : '',
      ]
      return haystack.some((value) => value.toLowerCase().includes(term))
    })

    const sorted = [...filtered]
    sorted.sort((a, b) => compareLogs(a, b, sortKey, sortDirection))
    return sorted
  }, [actionFilter, logs, search, sortDirection, sortKey, tableFilter])

  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredLogs.slice(start, end)
  }, [filteredLogs, page, pageSize])

  const stats = useMemo(() => {
    const totalLogs = logs.length
    const today = new Date()
    const todayCount = logs.filter((log) => isSameDay(log.timestampMs, today)).length
    const activeUsers = new Set(logs.map((log) => log.userId ?? log.userName).filter(Boolean)).size
    const criticalEvents = logs.filter(
      (log) => log.action === 'DELETE' || (log.tableName ?? '').toLowerCase() === 'users',
    ).length

    return {
      totalLogs,
      todayCount,
      activeUsers,
      criticalEvents,
    }
  }, [logs])

  const activeFilters = useMemo(() => {
    const pills: string[] = []
    if (actionFilter !== 'all') {
      const label = ACTION_OPTIONS.find(option => option.value === actionFilter)?.label ?? actionFilter
      pills.push(`Action: ${label}`)
    }
    if (tableFilter !== 'all') {
      const label = TABLE_OPTIONS.find(option => option.value === tableFilter)?.label ?? tableFilter
      pills.push(`Table: ${label}`)
    }
    if (userFilter !== 'all') {
      const label = actors.find(actor => actor.id === userFilter)?.name ?? 'User selected'
      pills.push(`User: ${label}`)
    }
    if (search.trim()) {
      pills.push(`Search: "${search.trim()}"`)
    }
    if (dateRange.start || dateRange.end) {
      pills.push(formatDateRangeLabel(dateRange))
    }
    if (userSorted) {
      const sortLabel = (() => {
        switch (sortKey) {
          case 'user':
            return 'User'
          case 'table':
            return 'Table'
          default:
            return 'Timestamp'
        }
      })()
      pills.push(`Sort: ${sortLabel} (${sortDirection === 'asc' ? 'Asc' : 'Desc'})`)
    }
    return pills
  }, [actionFilter, actors, dateRange, search, sortDirection, sortKey, tableFilter, userFilter, userSorted])

  const handleClearFilters = useCallback(() => {
    setSearch('')
    setActionFilter('all')
    setTableFilter('all')
    setUserFilter('all')
    setDateRange({ start: null, end: null })
    setSortKey('timestamp')
    setSortDirection('desc')
    setUserSorted(false)
    setPage(1)
  }, [])

  useEffect(() => {
    if (logs.length === 0) return
    setActors((current) => {
      const seen = new Map<string, string>()
      current.forEach((actor) => seen.set(actor.id, actor.name))
      logs.forEach((log) => {
        if (log.userId) {
          const label = log.userName ?? log.userId
          if (!seen.has(log.userId)) {
            seen.set(log.userId, label)
          }
        }
      })
      const next = Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
      const unchanged =
        next.length === current.length &&
        next.every((actor, index) => actor.id === current[index]?.id && actor.name === current[index]?.name)
      return unchanged ? current : next
    })
  }, [logs])

  const handleOpenDateRange = useCallback(() => {
    setDateRangeDialogOpen(true)
  }, [])

  const handleApplyDateRange = useCallback((range: DateRange) => {
    setDateRange(range)
    setDateRangeDialogOpen(false)
  }, [])

  const handleClearDateRange = useCallback(() => {
    setDateRange({ start: null, end: null })
    setDateRangeDialogOpen(false)
  }, [])

  const handleExportLogs = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast({ kind: 'info', msg: 'No audit entries available to export' })
      return
    }

    const payload = filteredLogs.map((log) => ({
      id: log.id,
      at: log.timestamp,
      user_id: log.userId,
      action: log.action,
      table_name: log.tableName,
      row_id: log.rowId,
      details: log.details,
      created_at: log.createdAt,
    }))

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `audit-logs-${Date.now()}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    toast({ kind: 'success', msg: `Exported ${filteredLogs.length} log${filteredLogs.length === 1 ? '' : 's'}` })
  }, [filteredLogs, toast])

  const handleViewDetails = useCallback((log: AuditLogRecord) => {
    setDetailState({ log, mode: 'summary' })
  }, [])

  const handleViewJson = useCallback((log: AuditLogRecord) => {
    setDetailState({ log, mode: 'json' })
  }, [])

  const handleExportEntry = useCallback(
    (log: AuditLogRecord) => {
      const payload = {
        id: log.id,
        at: log.timestamp,
        user_id: log.userId,
        action: log.action,
        table_name: log.tableName,
        row_id: log.rowId,
        details: log.details,
        created_at: log.createdAt,
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `audit-log-${log.id}.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      toast({ kind: 'success', msg: `Audit log #${log.id} exported` })
    },
    [toast],
  )

  const renderRow = useCallback(
    (log: AuditLogRecord) => (
      <tr key={log.id} className="group h-[52px] transition-colors duration-200 hover:bg-muted/50">
        <td className="w-[90px] px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{log.id}</td>
        <td className="w-[220px] px-3 py-2.5 text-sm text-foreground sm:px-4 whitespace-nowrap truncate" title={formatTimestamp(log.timestamp)}>{formatTimestamp(log.timestamp)}</td>
        <td className="w-[200px] px-3 py-2.5 sm:px-4">
          <UserIdDisplay userId={log.userId} userName={log.userName} />
        </td>
        <td className="w-[140px] px-3 py-2.5 sm:px-4">
          <ActionBadge action={log.action} />
        </td>
        <td className="w-[140px] px-3 py-2.5 sm:px-4">
          <TableBadge tableName={log.tableName} />
        </td>
        <td className="w-[120px] px-3 py-2.5 text-sm text-muted-foreground sm:px-4">{log.rowId ?? '-'}</td>
        <td className="px-3 py-2.5 sm:px-4">
          <span className="block max-w-[280px] truncate text-sm text-muted-foreground" title={formatDetailsTooltip(log.details)}>
            {formatDetails(log.details)}
          </span>
        </td>
        <td className="sticky right-0 w-[60px] border-l border-border bg-background px-3 py-2.5 text-right transition-colors duration-200 group-hover:bg-muted/50 sm:px-4 dark:bg-black" style={{ backgroundColor: 'var(--background)' }}>
          <div className="relative inline-flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionMenuTrigger
                  ariaLabel="Audit log actions"
                  icon={MoreVertical}
                  size="sm"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleViewDetails(log)}>
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  View Full Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewJson(log)}>
                  <FileCode className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  View JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportEntry(log)}>
                  <Download className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  Export Entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    ),
    [handleExportEntry, handleViewDetails, handleViewJson],
  )

  const handleSortChange = useCallback(
    (key: SortOption) => {
      setUserSorted(true)
      setSortKey(prev => {
        if (prev === key) {
          setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'))
          return prev
        }
        setSortDirection(key === 'timestamp' ? 'desc' : 'asc')
        return key
      })
    },
    [],
  )



  const handleResetLogs = useCallback(async () => {
    if (resetting) return
    setResetting(true)
    try {
      const resp = await fetch('/api/audit', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
      if (!resp.ok) {
        const message = (await resp.json().catch(() => null))?.error ?? 'Failed to reset audit log'
        throw new Error(message)
      }
      setLogs([])
      setPage(1)
      toast({ kind: 'success', msg: 'Audit log cleared' })
      setResetDialogOpen(false)
      void loadLogs()
    } catch (error) {
      toast({
        kind: 'error',
        msg: (error as { message?: string } | null)?.message || 'Failed to reset audit log',
      })
    } finally {
      setResetting(false)
    }
  }, [loadLogs, resetting, toast])

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <AnimatedActionBtn
          icon={Calendar}
          label={rangeLabel}
          onClick={handleOpenDateRange}
          variant="secondary"
        />
        {hasDateRange ? (
          <AnimatedActionBtn
            icon={X}
            label="Clear"
            onClick={handleClearDateRange}
            variant="secondary"
          />
        ) : null}
        <AnimatedActionBtn
          icon={RefreshCw}
          label="Reload"
          onClick={() => void loadLogs()}
          isLoading={loading}
          loadingLabel="Reloading..."
          variant="secondary"
          spinner="framer"
        />
        <AnimatedActionBtn
          icon={Download}
          label="Export Logs"
          onClick={handleExportLogs}
          variant="secondary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <AnimatedActionBtn
          icon={Trash2}
          label="Reset log"
          onClick={() => setResetDialogOpen(true)}
          isLoading={resetting}
          loadingLabel="Resetting..."
          variant="secondary"
          className="bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 hover:text-destructive"
        />
      </div>
    </div>
  )

  const isRefined = Boolean(search.trim()) || actionFilter !== 'all' || tableFilter !== 'all' || hasDateRange
  const refreshing = loading
  const tableLoading = loading
  const totalPages = Math.ceil(filteredLogs.length / pageSize)

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-screen-xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Audit log</h1>
            <p className="text-muted-foreground">Review system changes and activity.</p>
          </div>
          {headerActions}
        </div>

        <DateRangeDialog
          open={dateRangeDialogOpen}
          initial={dateRange}
          onApply={handleApplyDateRange}
          onClose={() => setDateRangeDialogOpen(false)}
          onClear={() => {
            handleClearDateRange()
            setDateRangeDialogOpen(false)
          }}
        />
        <AuditDetailsDialog detail={detailState} onClose={() => setDetailState(null)} />
        <AuditDetailsDialog detail={detailState} onClose={() => setDetailState(null)} />
        <DeleteConfirmationDialog
          open={resetDialogOpen}
          onOpenChange={setResetDialogOpen}
          title="Reset audit log"
          description="This will permanently delete all audit entries. This action cannot be undone."
          confirmationMessage="Are you sure you want to reset the audit log?"
          onConfirm={handleResetLogs}
          isDeleting={resetting}
          deleteLabel="Reset log"
        />

        <div className="space-y-6">
          {/* Filters */}
          <CardSurface className="space-y-4 shadow-sm border-border hover:border-border/80 transition-colors">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">Audit controls</h2>
                <p className="text-sm text-muted-foreground">Search and refine audit activity.</p>
              </div>
              <ActiveFiltersPills
                activeFilters={activeFilters}
                onClearFilters={handleClearFilters}
              />

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search by user ID, table, or row ID..."
                    className={inputClasses({ className: 'pl-10 pr-4' })}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        icon={ChevronDown}
                        label={
                          actionFilter === 'all'
                            ? 'All Actions'
                            : ACTION_OPTIONS.find((o) => o.value === actionFilter)?.label ||
                            actionFilter
                        }
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 p-0">
                      <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                        {ACTION_OPTIONS.map(option => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setActionFilter(option.value as ActionFilter)}
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
                        icon={ChevronDown}
                        label={
                          tableFilter === 'all'
                            ? 'All Tables'
                            : TABLE_OPTIONS.find((o) => o.value === tableFilter)?.label ||
                            tableFilter
                        }
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44 p-0">
                      <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                        {TABLE_OPTIONS.map(option => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setTableFilter(option.value as TableFilter)}
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
                        icon={ChevronDown}
                        label={
                          userFilter === 'all'
                            ? 'All Users'
                            : actors.find((a) => a.id === userFilter)?.name ?? 'User'
                        }
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 p-0">
                      <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                        <DropdownMenuItem onClick={() => setUserFilter('all')}>
                          All Users
                        </DropdownMenuItem>
                        {actors.map(actor => (
                          <DropdownMenuItem key={actor.id} onClick={() => setUserFilter(actor.id)}>
                            {actor.name}
                          </DropdownMenuItem>
                        ))}
                      </ReactLenis>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </div>
            </div>
          </CardSurface>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
            <StatsCard
              icon={Activity}
              label="Total logs"
              value={String(stats.totalLogs)}
              className="shadow-sm border-border"
            />
            <StatsCard
              icon={Clock}
              label="Today's actions"
              value={String(stats.todayCount)}
              className="shadow-sm border-border"
            />
            <StatsCard
              icon={CheckCircle}
              label="Active users"
              value={String(stats.activeUsers)}
              className="shadow-sm border-border"
            />
            <StatsCard
              icon={AlertTriangle}
              label="Critical events"
              value={String(stats.criticalEvents)}
              className="shadow-sm border-border"
            />
          </div>

          {/* Table Card */}
          <div className="relative">
            {refreshing ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                  <Spinner />
                  <span>Refreshing audit log...</span>
                </div>
              </div>
            ) : null}
            <AdminTable
              loading={tableLoading}
              loadingLabel={null}
              error={error}
              isEmpty={!tableLoading && paginatedLogs.length === 0}
              emptyMessage={
                logs.length === 0
                  ? 'No audit logs yet. System activities will appear here.'
                  : 'No logs match your current filters.'
              }
              colSpan={8}
              minWidthClass="min-w-screen-xl table-fixed"
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
                  <div className="flex items-center gap-2 w-full justify-end sm:w-auto sm:justify-start">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      disabled={page === 1}
                      onClick={() => setPage(current => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      disabled={page * pageSize >= filteredLogs.length}
                      onClick={() => setPage(current => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              }
              header={
                <tr>
                  <th className="w-24 rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="id" label="ID" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-56 px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="timestamp" label="Timestamp" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-48 px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="user" label="User" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-36 px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="action" label="Action" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-36 px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="table" label="Table" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="w-32 px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    <SortableTableHeader sortKey="row" label="Row ID" currentSort={sortKey} sortDirection={sortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                    Details
                  </th>
                  <th className="sticky right-0 w-16 rounded-tr-lg border-l border-border bg-background px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 dark:bg-black" style={{ backgroundColor: 'var(--background)' }}>
                    Actions
                  </th>
                </tr>
              }
            >
              {paginatedLogs.map(log => renderRow(log))}
              {!tableLoading && Array.from({ length: Math.max(0, pageSize - paginatedLogs.length) }).map((_, index) => (
                <tr key={`spacer-${index}`} aria-hidden="true" className="h-13">
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="px-3 py-2.5 sm:px-4">&nbsp;</td>
                  <td className="border-l border-transparent px-3 py-2.5 sm:px-4">&nbsp;</td>
                </tr>
              ))}
            </AdminTable>
          </div>
        </div>
      </div>
    </div>
  )
}

type UserIdDisplayProps = {
  userId: string | null
  userName: string | null
}

function UserIdDisplay({ userId, userName }: UserIdDisplayProps) {
  const display = userName?.split(' ')?.[0] || getUserDisplay(userId)
  const label = userName ?? userId ?? 'System'

  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground max-w-[220px] truncate" title={label} aria-label={label}>
      <SquareCode className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <span className="font-mono truncate">{display}</span>
    </span>
  )
}

function getUserDisplay(userId: string | null) {
  if (!userId) return 'System'
  if (userId.length <= 12) return userId
  return `${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}`
}

type ActionBadgeProps = {
  action: string
}

function ActionBadge({ action }: ActionBadgeProps) {
  const tone = action.trim().toUpperCase()
  const display = tone ? `${tone[0]}${tone.slice(1).toLowerCase()}` : 'Unknown'

  if (tone === 'INSERT' || tone === 'CREATE') {
    return (
      <StatusPill tone="success">
        {display}
      </StatusPill>
    )
  }
  if (tone === 'UPDATE' || tone === 'MODIFY') {
    return (
      <StatusPill tone="info">
        {display}
      </StatusPill>
    )
  }
  if (tone === 'DELETE' || tone === 'REMOVE' || tone === 'ERROR') {
    return (
      <StatusPill tone="danger">
        {display}
      </StatusPill>
    )
  }
  if (tone === 'WARNING') {
    return (
      <StatusPill tone="warning">
        {display}
      </StatusPill>
    )
  }
  return (
    <StatusPill tone="info">
      {display}
    </StatusPill>
  )
}

type TableBadgeProps = {
  tableName: string | null
}

function TableBadge({ tableName }: TableBadgeProps) {
  const value = (tableName ?? 'unknown').toLowerCase()

  return (
    <StatusPill tone="info">
      {value}
    </StatusPill>
  )
}

type DateRangeDialogProps = {
  open: boolean
  initial: DateRange
  onApply: (range: DateRange) => void
  onClose: () => void
  onClear: () => void
}



// ...

function DateRangeDialog({ open, initial, onApply, onClose, onClear }: DateRangeDialogProps) {
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStartInput(isoToInput(initial.start))
    setEndInput(isoToInput(initial.end))
    setError(null)
  }, [initial.end, initial.start, open])

  const applyRange = (startIso: string | null, endIso: string | null) => {
    if (startIso && endIso && new Date(startIso).getTime() > new Date(endIso).getTime()) {
      setError('Start date must be before end date.')
      return
    }
    onApply({ start: startIso, end: endIso })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const startIso = inputToIso(startInput, 'start')
    const endIso = inputToIso(endInput, 'end')
    applyRange(startIso, endIso)
  }

  const handleQuickRange = (range: DateRange) => {
    setStartInput(isoToInput(range.start))
    setEndInput(isoToInput(range.end))
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-3xl">
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">Filter by date</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a custom window or use a quick preset to focus the audit trail.
        </p>
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="audit-date-start">
                Start date
              </label>
              <DatePicker
                date={startInput ? new Date(startInput) : undefined}
                setDate={(date) => setStartInput(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Pick a start date"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="audit-date-end">
                End date
              </label>
              <DatePicker
                date={endInput ? new Date(endInput) : undefined}
                setDate={(date) => setEndInput(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Pick an end date"
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <AnimatedActionBtn
                icon={X}
                label="Clear"
                onClick={() => {
                  setStartInput('')
                  setEndInput('')
                  setError(null)
                  onClear()
                }}
                variant="secondary"
              />
              <AnimatedActionBtn
                icon={Check}
                label="Apply"
                onClick={() => {
                  // Trigger form submission programmatically since AnimatedActionBtn is type="button"
                  const form = document.querySelector('form')
                  if (form) form.requestSubmit()
                }}
                variant="primary"
              />
            </div>
          </form>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick ranges</p>
            <div className="mt-3 grid gap-2">
              {QUICK_RANGES.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleQuickRange(option.compute())}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogBody >
    </Dialog >
  )
}



type AuditDetailsDialogProps = {
  detail: DetailState
  onClose: () => void
  loading?: boolean
}

function AuditDetailsDialog({ detail, onClose, loading = false }: AuditDetailsDialogProps) {
  const log = detail?.log
  const mode = detail?.mode
  const pretty = log ? prettyPrint(log.details) : ''
  const showSkeleton = loading || (!!detail && !log)

  return (
    <Dialog open={!!detail} onOpenChange={(open) => !open && onClose()} className="max-w-3xl">
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">
          {mode === 'json' ? 'Audit Entry JSON' : 'Audit Entry Details'}
        </h2>
      </DialogHeader>
      <DialogBody>
        {detail && (log || showSkeleton) ? (
          <div className="space-y-6">
            {/* Top Section: Info & User Card */}
            <div className="flex items-start justify-between gap-4">
              {showSkeleton ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-bold text-foreground">Log #{log!.id}</h3>
                  <p className="text-sm text-muted-foreground">{formatTimestamp(log!.timestamp)}</p>
                </div>
              )}

              {showSkeleton ? (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <AvatarThumbnail
                    name={log!.userName}
                    src={null}
                    size="md"
                  />
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {log!.userName || 'System'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log!.userId ? `User ID: ${log!.userId}` : 'System Action'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grid Section */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Entry Info</h4>
                <dl className="space-y-3">
                  <DetailRow label="Action" value={log ? formatActionLabel(log.action) : null} loading={showSkeleton} />
                  <DetailRow label="Table" value={log?.tableName} loading={showSkeleton} />
                  <DetailRow label="Row ID" value={log?.rowId} loading={showSkeleton} />
                </dl>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Change Data</h4>
                <div className="max-h-[200px] overflow-auto rounded-lg border border-border bg-muted/30 p-3">
                  {showSkeleton ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words text-xs text-foreground font-mono">{pretty}</pre>
                  )}
                </div>
              </div>
            </div>

            {/* Close Button */}
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

type UseDebouncedReturn<T> = T

function useDebounced<T>(value: T, delay: number): UseDebouncedReturn<T> {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [value, delay])

  return debouncedValue
}

function dedupeLogs(logs: AuditLogRecord[]): AuditLogRecord[] {
  const windowMs = 2000
  const result: AuditLogRecord[] = []

  for (const log of logs) {
    const matchIndex = result.findIndex((existing) => {
      if (existing.action !== log.action) return false
      if ((existing.tableName ?? '') !== (log.tableName ?? '')) return false
      if ((existing.rowId ?? null) !== (log.rowId ?? null)) return false
      if (!existing.timestampMs || !log.timestampMs) return false
      return Math.abs(existing.timestampMs - log.timestampMs) <= windowMs
    })

    if (matchIndex === -1) {
      result.push(log)
      continue
    }

    const existing = result[matchIndex]
    const existingHasUser = Boolean(existing.userId)
    const incomingHasUser = Boolean(log.userId)

    if (!existingHasUser && incomingHasUser) {
      result[matchIndex] = log
      continue
    }

    const bothHaveUser = existingHasUser && incomingHasUser
    if (bothHaveUser && (log.timestampMs ?? 0) > (existing.timestampMs ?? 0)) {
      result[matchIndex] = log
    }
  }

  return result
}
