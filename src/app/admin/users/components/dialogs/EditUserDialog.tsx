
import React, { useEffect, useRef, useState } from 'react'

import { Button, PrimaryButton } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, Check } from 'lucide-react'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

import type { UserRow } from '../../types'
import { inputClasses, parseAppUserIdInput, type UserFormErrors, EMAIL_REGEX, useDialogFocusTrap } from './shared'

type EditUserDialogProps = {
  user: UserRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: () => Promise<void> | void
}

export function EditUserDialog({ user, open, onOpenChange, onUpdated }: EditUserDialogProps) {
  const toast = useToast()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [studentId, setStudentId] = useState('')
  const [appUserId, setAppUserId] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const fullNameRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open && user) {
      setFullName(user.full_name ?? '')
      setEmail(user.email ?? '')
      setStudentId(user.student_id ?? '')
      setAppUserId(user.app_user_id != null ? String(user.app_user_id) : '')
      setPassword('')
      setErrors({})
      setFormError(null)
      setSubmitting(false)
    }
    if (!open) {
      setSubmitting(false)
    }
  }, [open, user])

  useDialogFocusTrap(dialogRef, Boolean(open && user), () => {
    if (!submitting) onOpenChange(false)
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) {
      setFormError('Selected user is no longer available.')
      return
    }
    const name = fullName.trim()
    const mail = email.trim().toLowerCase()
    const pwd = password.trim()
    const nextErrors: UserFormErrors = {}

    if (!name) {
      nextErrors.fullName = 'Full name is required'
    }
    if (!mail) {
      nextErrors.email = 'Email is required'
    } else if (!EMAIL_REGEX.test(mail)) {
      nextErrors.email = 'Enter a valid email address'
    }

    const { value: parsedAppUserId, error: appUserIdError } = parseAppUserIdInput(appUserId)
    if (appUserIdError) {
      nextErrors.appUserId = appUserIdError
    }

    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const payload: Record<string, unknown> = {}
    if (name !== (user.full_name ?? '').trim()) {
      payload.full_name = name
    }
    const normalizedEmail = mail || null
    const originalEmail = user.email?.trim().toLowerCase() ?? null
    if (normalizedEmail !== originalEmail) {
      payload.email = mail
    }

    const student = studentId.trim()
    const normalizedStudent = student || null
    const originalStudent = user.student_id?.trim() ?? null
    if (normalizedStudent !== originalStudent) {
      payload.student_id = normalizedStudent
    }

    const originalAppUserId = user.app_user_id ?? null
    if (parsedAppUserId !== originalAppUserId) {
      payload.app_user_id = parsedAppUserId
    }

    if (pwd) {
      if (pwd.length < 8) {
        setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }))
        return
      }
      payload.password = pwd
    }

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
      toast({ kind: 'success', msg: 'User updated.' })
      await onUpdated()
      onOpenChange(false)
    } catch (error) {
      const { message } = normalizeApiError(error, 'Failed to update user')
      const msg = message ?? 'Failed to update user'
      setFormError(msg)
      toast({ kind: 'error', msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && !submitting) onOpenChange(false)
      }}
      ref={dialogRef}
      className="max-w-3xl"
      initialFocus={fullNameRef as React.RefObject<HTMLElement>}
    >
      {user ? (
        <>
          <DialogHeader>
            <h2 className="text-xl font-semibold text-foreground">Edit user</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update account details or reset the user&rsquo;s password.</p>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Full name</span>
                  <input
                    type="text"
                    ref={(node) => {
                      fullNameRef.current = node
                    }}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClasses(Boolean(errors.fullName))}
                    placeholder="Sarah Johnson"
                  />
                  {errors.fullName ? <p className="mt-1 text-xs text-destructive">{errors.fullName}</p> : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses(Boolean(errors.email))}
                    placeholder="sarah@example.com"
                  />
                  {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">Student ID</span>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className={inputClasses(Boolean(errors.studentId))}
                    placeholder="STU001"
                  />
                  {errors.studentId ? <p className="mt-1 text-xs text-destructive">{errors.studentId}</p> : null}
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-foreground">App user ID</span>
                  <input
                    type="text"
                    value={appUserId}
                    onChange={(e) => setAppUserId(e.target.value)}
                    className={inputClasses(Boolean(errors.appUserId))}
                    placeholder="1001"
                  />
                  {errors.appUserId ? <p className="mt-1 text-xs text-destructive">{errors.appUserId}</p> : null}
                </label>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground">Reset password</h3>
                <label className="block">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses(false)}
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    The user will receive the provided password with their email already confirmed so they can sign in immediately.
                  </p>
                </label>
              </div>

              {formError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <AnimatedActionBtn
                  icon={X}
                  label="Cancel"
                  onClick={() => onOpenChange(false)}
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
