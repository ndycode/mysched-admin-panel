
import React, { useEffect, useRef, useState } from 'react'

import { Button, PrimaryButton } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/SmoothDropdown'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

import type { UserRole, UserRow, UserStatus } from '../../types'
import { displayName } from '../../utils'
import { inputClasses, ROLE_OPTIONS, STATUS_OPTIONS, useDialogFocusTrap } from './shared'

type ManagePermissionsDialogProps = {
  user: UserRow | null
  open: boolean
  onClose: () => void
  onUpdated: () => Promise<void> | void
}

export function ManagePermissionsDialog({ user, open, onClose, onUpdated }: ManagePermissionsDialogProps) {
  const toast = useToast()
  const [role, setRole] = useState<UserRole>('student')
  const [status, setStatus] = useState<UserStatus>('active')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const roleRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open && user) {
      setRole(user.role)
      setStatus(user.status)
      setFormError(null)
      setSubmitting(false)
    }
    if (!open) {
      setSubmitting(false)
    }
  }, [open, user])

  useDialogFocusTrap(dialogRef, Boolean(open && user), () => {
    if (!submitting) onClose()
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setFormError('User details missing. Please reopen and try again.')
      return
    }
    const payload: Partial<{ role: UserRole; status: UserStatus }> = {}
    if (role !== user.role) payload.role = role
    if (status !== user.status) payload.status = status

    if (Object.keys(payload).length === 0) {
      setFormError('No changes to save.')
      return
    }

    setSubmitting(true)
    try {
      await api(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      toast({ kind: 'success', msg: 'Permissions updated.' })
      await onUpdated()
      onClose()
    } catch (error) {
      const { message } = normalizeApiError(error, 'Failed to update permissions.')
      setFormError(message)
      toast({ kind: 'error', msg: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!val && !submitting) onClose()
      }}
      ref={dialogRef}
      className="max-w-3xl"
      initialFocus={roleRef as React.RefObject<HTMLElement>}
    >
      {user ? (
        <>
          <DialogHeader>
            <h2 className="text-xl font-semibold text-foreground">Manage permissions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Adjust the role and status for {displayName(user)}.</p>
          </DialogHeader>
          <DialogBody>

            <form onSubmit={handleSubmit} className="grid gap-5">
              {formError ? (
                <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
              ) : null}
              <label className="block text-sm font-medium text-foreground">
                Role
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      ref={(node) => {
                        roleRef.current = node
                      }}
                      className={inputClasses(false) + " text-left flex items-center justify-between"}
                    >
                      <span>{ROLE_OPTIONS.find(opt => opt.value === role)?.label}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full">
                    {ROLE_OPTIONS.map(opt => (
                      <DropdownMenuItem key={opt.value} onClick={() => setRole(opt.value)}>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Status
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={inputClasses(false) + " text-left flex items-center justify-between"}
                    >
                      <span>{STATUS_OPTIONS.find(opt => opt.value === status)?.label}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-full">
                    {STATUS_OPTIONS.map(opt => (
                      <DropdownMenuItem key={opt.value} onClick={() => setStatus(opt.value)}>
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                  label="Save changes"
                  onClick={() => {
                    const form = document.querySelector('form')
                    if (form) form.requestSubmit()
                  }}
                  isLoading={submitting}
                  loadingLabel="Updating..."
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
