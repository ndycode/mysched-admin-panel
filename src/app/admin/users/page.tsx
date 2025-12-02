'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Download,
  Eye,
  GraduationCap,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  ChevronDown,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from 'lucide-react'

import { AvatarThumbnail } from '@/components/AvatarThumbnail'
import { Button } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { CardSurface, StatsCard, StatusPill, ActionMenuTrigger } from '../_components/design-system'
import { AdminTable } from '../_components/AdminTable'
import { SortableTableHeader } from '../_components/SortableTableHeader'
import { ActiveFiltersPills } from '../_components/ActiveFiltersPills'
import { TableActions } from '../_components/TableActions'

import { AddUserDialog, EditUserDialog, ManagePermissionsDialog, ViewUserDialog } from './components/dialogs'
import { useUsersDirectory } from './useUsersDirectory'
import { displayName, formatDateTime, normalizeSearchValue } from './utils'
import type { SortOption, UserRole, UserStatus, UserRow } from './types'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { inputClasses } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === 'admin'
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : role === 'instructor'
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize shadow-sm ${tone}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const tone = status === 'active' ? 'success' : status === 'inactive' ? 'danger' : 'info'
  const label = status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Pending'
  return <StatusPill tone={tone}>{label}</StatusPill>
}



export default function UsersPage() {
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [sort, setSort] = useState<SortOption>('recent')
  const [userSorted, setUserSorted] = useState(false)

  const { currentSortKey, currentSortDirection } = useMemo(() => {
    if (sort === 'recent') return { currentSortKey: 'created', currentSortDirection: 'desc' as const }
    if (sort === 'oldest') return { currentSortKey: 'created', currentSortDirection: 'asc' as const }
    const [key, dir] = sort.split('-')
    return {
      currentSortKey: key as 'name' | 'created' | 'student' | 'email' | 'role' | 'app' | 'status',
      currentSortDirection: dir as 'asc' | 'desc'
    }
  }, [sort])
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [statsPulse, setStatsPulse] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserRow | null>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [permissionsUser, setPermissionsUser] = useState<UserRow | null>(null)

  const {
    users,
    count,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
    deleteUser,
    deletingId,
    hasNextPage,
    loadMore,
    isLoadingMore,
    loadAll,
  } = useUsersDirectory()

  const filterUsers = useCallback(
    (source: UserRow[]) => {
      const term = search.trim().toLowerCase()

      const filtered = source.filter(row => {
        if (statusFilter !== 'all' && row.status !== statusFilter) return false
        if (roleFilter !== 'all' && row.role !== roleFilter) return false
        if (!term) return true

        const values = [
          normalizeSearchValue(row.full_name),
          normalizeSearchValue(row.email),
          normalizeSearchValue(row.student_id),
          normalizeSearchValue(row.id),
          row.app_user_id != null ? String(row.app_user_id).toLowerCase() : '',
        ]

        return values.some(value => value.includes(term))
      })

      const sorted = [...filtered]
      const compareStrings = (a: string | null, b: string | null, direction: 'asc' | 'desc') => {
        const aVal = (a ?? '').toLowerCase()
        const bVal = (b ?? '').toLowerCase()
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      const compareDates = (aDate: string | null, bDate: string | null, direction: 'asc' | 'desc') => {
        const aTime = aDate ? new Date(aDate).getTime() : 0
        const bTime = bDate ? new Date(bDate).getTime() : 0
        return direction === 'asc' ? aTime - bTime : bTime - aTime
      }

      const statusOrder: Record<UserStatus, number> = { active: 1, inactive: 2, suspended: 3 }

      sorted.sort((a, b) => {
        switch (sort) {
          case 'recent':
            return compareDates(a.created_at, b.created_at, 'desc')
          case 'oldest':
            return compareDates(a.created_at, b.created_at, 'asc')
          case 'name-asc':
            return compareStrings(displayName(a), displayName(b), 'asc')
          case 'name-desc':
            return compareStrings(displayName(a), displayName(b), 'desc')
          case 'student-asc':
            return compareStrings(a.student_id, b.student_id, 'asc')
          case 'student-desc':
            return compareStrings(a.student_id, b.student_id, 'desc')
          case 'email-asc':
            return compareStrings(a.email, b.email, 'asc')
          case 'email-desc':
            return compareStrings(a.email, b.email, 'desc')
          case 'role-asc':
            return compareStrings(a.role, b.role, 'asc')
          case 'role-desc':
            return compareStrings(a.role, b.role, 'desc')
          case 'app-asc': {
            const aVal = a.app_user_id ?? Number.MAX_SAFE_INTEGER
            const bVal = b.app_user_id ?? Number.MAX_SAFE_INTEGER
            return aVal - bVal
          }
          case 'app-desc': {
            const aVal = a.app_user_id ?? Number.MIN_SAFE_INTEGER
            const bVal = b.app_user_id ?? Number.MIN_SAFE_INTEGER
            return bVal - aVal
          }
          case 'status-asc': {
            const aVal = statusOrder[a.status] ?? Number.MAX_SAFE_INTEGER
            const bVal = statusOrder[b.status] ?? Number.MAX_SAFE_INTEGER
            if (aVal !== bVal) return aVal - bVal
            return compareDates(a.created_at, b.created_at, 'desc')
          }
          case 'status-desc': {
            const aVal = statusOrder[a.status] ?? Number.MAX_SAFE_INTEGER
            const bVal = statusOrder[b.status] ?? Number.MAX_SAFE_INTEGER
            if (aVal !== bVal) return bVal - aVal
            return compareDates(a.created_at, b.created_at, 'desc')
          }
          default:
            return compareDates(a.created_at, b.created_at, 'desc')
        }
      })

      return sorted
    },
    [roleFilter, search, sort, statusFilter],
  )

  const filteredUsers = useMemo(() => filterUsers(users), [filterUsers, users])

  const isRefined =
    Boolean(search.trim()) || statusFilter !== 'all' || roleFilter !== 'all' || sort !== 'recent'

  const totalItemsForPaging = isRefined ? filteredUsers.length : count
  const totalPages = Math.max(1, Math.ceil(totalItemsForPaging / pageSize))
  const boundedPage = Math.max(1, page)
  const currentPage = hasNextPage ? boundedPage : Math.min(boundedPage, totalPages)

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredUsers.slice(start, end)
  }, [currentPage, filteredUsers, pageSize])

  const activeFilters = useMemo(() => {
    const pills: string[] = []
    if (search.trim()) pills.push('Search: "' + search.trim() + '"')
    if (statusFilter !== 'all') pills.push('Status: ' + statusFilter)
    if (roleFilter !== 'all') pills.push('Role: ' + roleFilter)
    const sortLabel = (() => {
      switch (sort) {
        case 'oldest':
          return 'Sort: Oldest'
        case 'name-asc':
          return 'Sort: Name (A-Z)'
        case 'name-desc':
          return 'Sort: Name (Z-A)'
        case 'student-asc':
          return 'Sort: Student ID (A-Z)'
        case 'student-desc':
          return 'Sort: Student ID (Z-A)'
        case 'email-asc':
          return 'Sort: Email (A-Z)'
        case 'email-desc':
          return 'Sort: Email (Z-A)'
        case 'role-asc':
          return 'Sort: Role (A-Z)'
        case 'role-desc':
          return 'Sort: Role (Z-A)'
        case 'app-asc':
          return 'Sort: App ID (Low-High)'
        case 'app-desc':
          return 'Sort: App ID (High-Low)'
        case 'status-asc':
          return 'Sort: Status (A-Z)'
        case 'status-desc':
          return 'Sort: Status (Z-A)'
        default:
          return null
      }
    })()
    if (sortLabel) pills.push(sortLabel)
    return pills
  }, [roleFilter, search, sort, statusFilter])

  const handleSortChange = useCallback(
    (key: 'name' | 'created' | 'student' | 'email' | 'role' | 'app' | 'status') => {
      setUserSorted(true)
      setSort(prev => {
        switch (key) {
          case 'name':
            return prev === 'name-asc' ? 'name-desc' : 'name-asc'
          case 'created':
            return prev === 'recent' ? 'oldest' : 'recent'
          case 'student':
            return prev === 'student-asc' ? 'student-desc' : 'student-asc'
          case 'email':
            return prev === 'email-asc' ? 'email-desc' : 'email-asc'
          case 'role':
            return prev === 'role-asc' ? 'role-desc' : 'role-asc'
          case 'app':
            return prev === 'app-asc' ? 'app-desc' : 'app-asc'
          case 'status':
            return prev === 'status-asc' ? 'status-desc' : 'status-asc'
          default:
            return prev
        }
      })
    },
    [],
  )



  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, roleFilter, sort, pageSize])

  useEffect(() => {
    if (hasNextPage) return
    setPage(current => Math.min(current, totalPages))
  }, [hasNextPage, totalPages])

  useEffect(() => {
    if (!hasNextPage || isLoadingMore) return
    if (currentPage * pageSize <= users.length) return
    void loadMore().catch(() => { })
  }, [currentPage, hasNextPage, isLoadingMore, loadMore, pageSize, users.length])

  useEffect(() => {
    if (!isRefined || !hasNextPage || isLoadingMore) return
    void loadAll().catch(() => { })
  }, [hasNextPage, isLoadingMore, isRefined, loadAll, users.length])

  async function handleExport() {
    if (exporting || isLoadingMore) return
    setExporting(true)
    try {
      const source = hasNextPage ? await loadAll() : users
      const ready = filterUsers(source)
      if (!ready.length) return
      downloadCsv(ready)
    } catch (error) {
      console.error(error)
    } finally {
      setExporting(false)
    }
  }

  function downloadCsv(rows: UserRow[]) {
    if (!rows.length) return

    const header = ['User', 'Student ID', 'Email', 'Role', 'App User ID', 'Created At', 'Status']
    const data = rows.map(user => [
      displayName(user),
      user.student_id ?? '',
      user.email ?? '',
      user.role,
      user.app_user_id != null ? String(user.app_user_id) : '',
      formatDateTime(user.created_at),
      user.status,
    ])

    const csv = [header, ...data]
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'users.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  async function handleDelete(user: UserRow) {
    if (!window.confirm(`Delete ${displayName(user)}?`)) return
    await deleteUser(user.id)
  }

  const refreshing = isFetching && true
  const tableLoading = isFetching
  const handleRetryUsers = useCallback(() => {
    void refetch()
  }, [refetch])

  const renderRow = useCallback(
    (user: UserRow) => (
      <tr key={user.id} className="group h-13 transition-colors duration-200 hover:bg-muted/50">
        <td className="w-64 px-3 py-2.5 text-sm font-medium text-foreground sm:px-4">
          <div className="flex items-center gap-3">
            <AvatarThumbnail name={user.full_name} src={user.avatar_url} size="sm" />
            <div className="min-w-0">
              <div className="truncate" title={displayName(user)}>
                {displayName(user)}
              </div>
            </div>
          </div>
        </td>
        <td className="w-32 px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
          {user.student_id ?? '-'}
        </td>
        <td className="w-56 px-3 py-2.5 text-sm text-muted-foreground sm:px-4 truncate" title={user.email ?? undefined}>
          {user.email ?? '-'}
        </td>
        <td className="w-32 px-3 py-2.5 sm:px-4">
          <RoleBadge role={user.role} />
        </td>
        <td className="w-32 px-3 py-2.5 text-sm text-muted-foreground sm:px-4">
          {user.app_user_id != null ? user.app_user_id : '-'}
        </td>
        <td className="w-44 px-3 py-2.5 text-sm text-muted-foreground sm:px-4 whitespace-nowrap">
          {formatDateTime(user.created_at)}
        </td>
        <td className="w-32 px-3 py-2.5 sm:px-4">
          <StatusBadge status={user.status} />
        </td>
        <td
          className="sticky right-0 w-16 border-l border-border bg-background px-3 py-2.5 text-right transition-colors duration-200 group-hover:bg-muted/50 sm:px-4 dark:bg-black"
          style={{ backgroundColor: 'var(--background)' }}
        >
          <div className="relative inline-flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionMenuTrigger
                  ariaLabel={`Actions for ${displayName(user)}`}
                  icon={MoreVertical}
                  size="sm"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setViewingUser(user)}>
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPermissionsUser(user)}>
                  <ShieldAlert className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
                  Permissions
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => void handleDelete(user)}
                  disabled={deletingId === user.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    ),
    [deletingId, handleDelete],
  )

  const headerActions = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <AnimatedActionBtn
        icon={Download}
        label={exporting ? 'Preparing...' : 'Export'}
        onClick={() => {
          void handleExport()
        }}
        isLoading={exporting}
        loadingLabel="Preparing..."
      />
      <AnimatedActionBtn
        icon={RefreshCw}
        label="Reload"
        onClick={() => {
          setStatsPulse(p => p + 1)
          void refetch()
        }}
        isLoading={isFetching}
        loadingLabel="Reloading..."
        variant="secondary"
        spinner="framer"
        className="hidden sm:inline-flex"
      />
      <AnimatedActionBtn
        icon={UserPlus}
        label="Add User"
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
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Manage admin, instructor, and student access.</p>
          </div>
          {headerActions}
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <CardSurface className="space-y-4 shadow-sm border-border hover:border-border/80 transition-colors">
            <div className="p-1">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filters</h3>
                <h2 className="text-lg font-bold text-foreground">User filters</h2>
                <p className="text-sm text-muted-foreground">Search and filter by status or role.</p>
              </div>
              <ActiveFiltersPills
                activeFilters={activeFilters}
                onClearFilters={() => {
                  setSearch('')
                  setStatusFilter('all')
                  setRoleFilter('all')
                  setSort('recent')
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
                    placeholder="Search users..."
                    className={inputClasses({ className: 'pl-10 pr-4' })}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          statusFilter === 'all'
                            ? 'All Statuses'
                            : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                        All Statuses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                        Inactive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('suspended')}>
                        Pending
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <AnimatedActionBtn
                        label={
                          roleFilter === 'all'
                            ? 'All Roles'
                            : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)
                        }
                        icon={ChevronDown}
                        variant="secondary"
                        className="justify-between gap-2 px-4"
                      />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setRoleFilter('all')}>
                        All Roles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('admin')}>
                        Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('instructor')}>
                        Instructor
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRoleFilter('student')}>
                        Student
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </CardSurface>

          {error ? (
            <CardSurface className="flex flex-wrap items-start justify-between gap-3 border-destructive/30 bg-destructive/5 text-destructive">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Failed to load users</p>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRetryUsers}
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
              label="Total Users"
              value={stats.total.toLocaleString()}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={UserCheck}
              label="Active Users"
              value={stats.activeUsers.toLocaleString()}
              status={{ text: 'Active', tone: 'success' }}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={GraduationCap}
              label="Instructors"
              value={stats.instructorCount.toLocaleString()}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
            <StatsCard
              icon={Shield}
              label="Admins"
              value={stats.adminCount.toLocaleString()}
              className="shadow-sm border-border"
              animateKey={statsPulse}
            />
          </div>
        </div>
        <div className="relative">
          {refreshing ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground">
                <Spinner />
                <span>Refreshing users...</span>
              </div>
            </div>
          ) : null}
          <AdminTable
            loading={tableLoading}
            loadingLabel={null}
            error={error}
            isEmpty={!tableLoading && filteredUsers.length === 0}
            emptyMessage={
              users.length === 0
                ? 'No users found. Add your first user to get started.'
                : 'No users match your current filters.'
            }
            colSpan={8}
            minWidthClass="min-w-[1200px] table-fixed"
            pagination={
              <div className="flex w-full flex-wrap items-center gap-3 sm:justify-between">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.max(totalPages, currentPage)}
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
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                    disabled={currentPage === 1}
                    onClick={() => setPage(current => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                    disabled={currentPage * pageSize >= totalItemsForPaging && !hasNextPage}
                    onClick={() => {
                      setPage(current => current + 1)
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            }
            header={
              <tr>
                <th className="w-[260px] rounded-tl-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="name" label="User" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[130px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="student" label="Student ID" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[220px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="email" label="Email" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[120px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="role" label="Role" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[130px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="app" label="App User ID" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[180px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="created" label="Created" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="w-[120px] px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:px-4 sm:py-3">
                  <SortableTableHeader sortKey="status" label="Status" currentSort={currentSortKey} sortDirection={currentSortDirection} userSorted={userSorted} onSortChange={handleSortChange} />
                </th>
                <th className="sticky right-0 w-[60px] rounded-tr-lg border-l border-border bg-background px-3 py-2 text-right text-xs font-medium text-muted-foreground sm:px-4 sm:py-3 dark:bg-black" style={{ backgroundColor: 'var(--background)' }}>
                  Actions
                </th>
              </tr>
            }
          >
            {paginatedUsers.map(user => renderRow(user))}
            {!isLoading && Array.from({ length: Math.max(0, pageSize - paginatedUsers.length) }).map((_, index) => (
              <tr key={`spacer-${index}`} aria-hidden="true" className="h-[52px]">
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
      </div >

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={async () => {
          await refetch()
        }}
      />
      <EditUserDialog
        user={editingUser}
        open={Boolean(editingUser)}
        onOpenChange={open => {
          if (!open) setEditingUser(null)
        }}
        onUpdated={async () => {
          await refetch()
        }}
      />
      <ViewUserDialog user={viewingUser} open={Boolean(viewingUser)} onClose={() => setViewingUser(null)} />
      <ManagePermissionsDialog
        user={permissionsUser}
        open={Boolean(permissionsUser)}
        onClose={() => setPermissionsUser(null)}
        onUpdated={async () => {
          await refetch()
        }}
      />
    </div >
  )
}
