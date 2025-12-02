import React from 'react'
import Image from 'next/image'
import { useMemo, type ReactNode } from 'react'
import { Eye, Mail, Pencil, Shield, Trash2 } from 'lucide-react'
import { CARD_BASE, StatusPill } from '../../_components/design-system'
import { TableActions } from '../../_components/TableActions'
import { UserGridRow, UserGridCell, UserGridActionCell } from './table'

import { Virtuoso } from 'react-virtuoso'
import { displayName, formatDateTime, getInitials } from '../utils'
import type { UserRow, UserRole, UserStatus } from '../types'

type UsersTableProps = {
  users: UserRow[]
  loading: boolean
  error: string | null
  onView: (user: UserRow) => void
  onEdit: (user: UserRow) => void
  onManage: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  deletingId: string | null
  totalCount: number
  pagination?: ReactNode
}

export function UsersTable({
  users,
  loading,
  error,
  onView,
  onEdit,
  onManage,
  onDelete,
  deletingId,
  totalCount,
  pagination,
}: UsersTableProps) {
  const emptyStateMessage = useMemo(() => {
    if (loading) return null
    if (users.length > 0) return null
    if (totalCount === 0) {
      return 'No users found. Add your first user to get started.'
    }
    return 'No users match your current filters.'
  }, [loading, totalCount, users.length])

  const gridTemplate =
    'minmax(200px, 2fr) minmax(100px, 1fr) minmax(200px, 1.5fr) minmax(100px, 0.8fr) minmax(100px, 1fr) minmax(150px, 1fr) minmax(100px, 0.8fr) 80px'

  return (
    <section className="flex h-full flex-col space-y-3">
      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading users...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className={`${CARD_BASE} flex flex-1 flex-col overflow-hidden`}>
        {/* Header */}
        <div
          className="grid items-center gap-4 border-b border-border bg-card px-4 py-3 text-xs font-medium text-muted-foreground min-w-[1000px]"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <div>User</div>
          <div>Student ID</div>
          <div>Email</div>
          <div>Role</div>
          <div>App User ID</div>
          <div>Created</div>
          <div>Status</div>
          <div
            className="sticky right-0 z-10 bg-background dark:bg-black text-right pr-4 -mr-4 pl-2 border-l border-border rounded-tr-lg"
            style={{ backgroundColor: 'var(--background)' }}
          >
            Actions
          </div>
        </div>

        {/* List */}
        <div className="flex-1 bg-card">
          {!loading && users.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--muted-foreground)]">
              {emptyStateMessage}
            </div>
          ) : (
            <Virtuoso
              useWindowScroll
              data={users}
              itemContent={(_index: number, user: UserRow) => (
                <UserGridRow gridTemplate={gridTemplate}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <AvatarDisplay name={user.full_name} avatarUrl={user.avatar_url} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{displayName(user)}</p>
                      <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                    </div>
                  </div>
                  <UserGridCell>{user.student_id ?? '—'}</UserGridCell>
                  <UserGridCell className="overflow-hidden">
                    <EmailDisplay email={user.email} />
                  </UserGridCell>
                  <UserGridCell>
                    <RoleBadge role={user.role} />
                  </UserGridCell>
                  <UserGridCell>{user.app_user_id != null ? user.app_user_id : '—'}</UserGridCell>
                  <UserGridCell>{formatDateTime(user.created_at)}</UserGridCell>
                  <UserGridCell>
                    <StatusBadge status={user.status} />
                  </UserGridCell>
                  <UserGridActionCell>
                    <TableActions
                      ariaLabel={`User actions for ${displayName(user)}`}
                      variant="accent"
                      items={[
                        {
                          label: 'View',
                          icon: Eye,
                          onSelect: () => onView(user),
                        },
                        {
                          label: 'Edit',
                          icon: Pencil,
                          onSelect: () => onEdit(user),
                        },
                        {
                          label: 'Permissions',
                          icon: Shield,
                          onSelect: () => onManage(user),
                        },
                        {
                          label: deletingId === user.id ? 'Deleting...' : 'Delete',
                          icon: Trash2,
                          onSelect: () => onDelete(user),
                          tone: 'danger',
                          disabled: deletingId === user.id,
                        },
                      ]}
                    />
                  </UserGridActionCell>
                </UserGridRow>
              )}
            />
          )}
        </div>
      </div>
      {pagination ? <div className="mt-4">{pagination}</div> : null}
    </section>
  )
}

function AvatarDisplay({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <span className="inline-flex h-9 w-9 overflow-hidden rounded-full bg-muted" style={{ borderRadius: '9999px' }}>
        <Image
          src={avatarUrl}
          alt={name ?? 'User avatar'}
          width={36}
          height={36}
          className="h-full w-full object-cover rounded-full"
          unoptimized
        />
      </span>
    )
  }

  return (
    <span
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      style={{ borderRadius: '9999px' }}
    >
      {getInitials(name)}
    </span>
  )
}

function EmailDisplay({ email }: { email: string | null }) {
  if (!email) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <Mail className="h-4 w-4 text-muted-foreground/50" aria-hidden />
      <span>{email}</span>
    </span>
  )
}

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
      <span>{role}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const tone = status === 'active' ? 'success' : status === 'inactive' ? 'danger' : 'info'
  const label = status === 'active' ? 'Active' : status === 'inactive' ? 'Inactive' : 'Pending'
  return (
    <StatusPill tone={tone}>
      <span className="capitalize">{label}</span>
    </StatusPill>
  )
}
