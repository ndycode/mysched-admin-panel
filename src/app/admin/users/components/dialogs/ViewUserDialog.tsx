import React, { useRef } from 'react'
import Image from 'next/image'

import { displayName, formatDateTime, getInitials } from '../../utils'
import type { UserRow } from '../../types'
import { Button } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X } from 'lucide-react'
import { useDialogFocusTrap } from './shared'
import { Skeleton } from '@/components/ui/Skeleton'
import { DetailRow } from '../../../_components/DetailRow'

type ViewUserDialogProps = {
  user: UserRow | null
  open: boolean
  onClose: () => void
  loading?: boolean
}

export function ViewUserDialog({ user, open, onClose, loading = false }: ViewUserDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useDialogFocusTrap(dialogRef, Boolean(open && (user || loading)), () => {
    onClose()
  })

  const providerLabel = user?.providers.length ? user.providers.join(', ') : 'Email/password'
  const showSkeleton = loading || (open && !user)

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!val) onClose()
      }}
      ref={dialogRef}
      className="max-w-2xl"
    >
      {user || showSkeleton ? (
        <>
          <DialogHeader>
            <h2 className="text-xl font-semibold text-foreground">User overview</h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                {showSkeleton ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <AvatarDisplay name={user!.full_name} avatarUrl={user!.avatar_url} />
                )}
                <div className="space-y-1.5">
                  {showSkeleton ? (
                    <>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-foreground">{displayName(user!)}</div>
                      <div className="text-sm text-muted-foreground">User ID: {user!.id}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">Account Info</h4>
                  <dl className="space-y-3">
                    <DetailRow label="Email" value={user?.email} loading={showSkeleton} />
                    <DetailRow label="Student ID" value={user?.student_id} loading={showSkeleton} />
                    <DetailRow label="Role" value={user?.role ? <span className="capitalize">{user.role}</span> : null} loading={showSkeleton} />
                    <DetailRow label="Status" value={user?.status ? <span className="capitalize">{user.status}</span> : null} loading={showSkeleton} />
                  </dl>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground border-b border-border pb-2">System Info</h4>
                  <dl className="space-y-3">
                    <DetailRow label="Created" value={user?.created_at ? formatDateTime(user.created_at) : null} loading={showSkeleton} />
                    <DetailRow label="Last sign-in" value={user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : null} loading={showSkeleton} />
                    <DetailRow label="Auth providers" value={user ? providerLabel : null} loading={showSkeleton} />
                    <DetailRow label="App user ID" value={user?.app_user_id != null ? String(user.app_user_id) : null} loading={showSkeleton} />
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
          </DialogBody>
        </>
      ) : null}
    </Dialog>
  )
}

type AvatarDisplayProps = { name: string | null; avatarUrl: string | null }

function AvatarDisplay({ name, avatarUrl }: AvatarDisplayProps) {
  if (avatarUrl) {
    return (
      <span className="inline-flex h-12 w-12 overflow-hidden rounded-full bg-[rgba(15,23,42,0.08)]">
        <Image
          src={avatarUrl}
          alt={name ?? 'User avatar'}
          width={48}
          height={48}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    )
  }

  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(15,23,42,0.08)] text-sm font-semibold text-[var(--foreground)]">
      {getInitials(name)}
    </span>
  )
}
