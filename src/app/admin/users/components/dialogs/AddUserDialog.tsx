
import React, { useEffect, useRef, useState } from 'react'

import { Button, PrimaryButton } from '@/components/ui'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, UserPlus } from 'lucide-react'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

import type { UserFormErrors } from './shared'
import { EMAIL_REGEX, inputClasses, parseAppUserIdInput, useDialogFocusTrap } from './shared'

type AddUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void> | void
}

export function AddUserDialog({ open, onOpenChange, onCreated }: AddUserDialogProps) {
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

  useDialogFocusTrap(dialogRef, open, () => {
    if (!submitting) onOpenChange(false)
  })

  useEffect(() => {
    if (!open) {
      setFullName('')
      setEmail('')
      setStudentId('')
      setAppUserId('')
      setPassword('')
      setErrors({})
      setFormError(null)
      setSubmitting(false)
    }
  }, [open])



  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    if (!pwd) {
      nextErrors.password = 'Temporary password is required'
    } else if (pwd.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters'
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

    setSubmitting(true)
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name,
          email: mail,
          password: pwd,
          student_id: studentId.trim() || null,
          app_user_id: parsedAppUserId,
        }),
      })
      toast({ kind: 'success', msg: 'User created.' })
      await onCreated()
      onOpenChange(false)
    } catch (error) {
      const { message } = normalizeApiError(error, 'Failed to create user')
      const msg = message ?? 'Failed to create user'
      setFormError(msg)
      toast({ kind: 'error', msg })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val: boolean) => {
        if (!val && !submitting) onOpenChange(false)
      }}
      ref={dialogRef}
      className="max-w-3xl"
      initialFocus={fullNameRef as React.RefObject<HTMLElement>}
    >
      <DialogHeader>
        <h2 className="text-xl font-semibold text-foreground">Add user</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Provision a new account with a confirmed email and temporary password.
        </p>
      </DialogHeader>
      <DialogBody>
        <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
          {formError ? (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground" htmlFor="add-user-full-name">
              Full name
              <input
                id="add-user-full-name"
                type="text"
                ref={(node) => {
                  fullNameRef.current = node
                }}
                value={fullName}
                onChange={event => setFullName(event.target.value)}
                className={inputClasses(Boolean(errors.fullName))}
                placeholder="Sarah Johnson"
                aria-invalid={Boolean(errors.fullName)}
                aria-describedby={errors.fullName ? 'add-user-full-name-error' : undefined}
              />
              {errors.fullName ? (
                <span id="add-user-full-name-error" className="mt-1 block text-xs text-destructive">
                  {errors.fullName}
                </span>
              ) : null}
            </label>
            <label className="text-sm font-medium text-foreground" htmlFor="add-user-email">
              Email
              <input
                id="add-user-email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className={inputClasses(Boolean(errors.email))}
                placeholder="sarah@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'add-user-email-error' : undefined}
              />
              {errors.email ? (
                <span id="add-user-email-error" className="mt-1 block text-xs text-destructive">
                  {errors.email}
                </span>
              ) : null}
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-foreground" htmlFor="add-user-student-id">
              Student ID
              <input
                id="add-user-student-id"
                type="text"
                value={studentId}
                onChange={event => setStudentId(event.target.value)}
                className={inputClasses(false)}
                placeholder="STU001"
              />
            </label>
            <label className="text-sm font-medium text-foreground" htmlFor="add-user-app-id">
              App user ID
              <input
                id="add-user-app-id"
                type="text"
                inputMode="numeric"
                value={appUserId}
                onChange={event => setAppUserId(event.target.value)}
                className={inputClasses(Boolean(errors.appUserId))}
                placeholder="1001"
                aria-invalid={Boolean(errors.appUserId)}
                aria-describedby={errors.appUserId ? 'add-user-app-id-error' : undefined}
              />
              {errors.appUserId ? (
                <span id="add-user-app-id-error" className="mt-1 block text-xs text-destructive">
                  {errors.appUserId}
                </span>
              ) : null}
            </label>
          </div>
          <label className="block text-sm font-medium text-foreground" htmlFor="add-user-password">
            Temporary password
            <input
              id="add-user-password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className={inputClasses(Boolean(errors.password))}
              placeholder="At least 8 characters"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'add-user-password-error' : undefined}
            />
            {errors.password ? (
              <span id="add-user-password-error" className="mt-1 block text-xs text-destructive">
                {errors.password}
              </span>
            ) : null}
          </label>
          <p className="text-xs text-muted-foreground">
            The user will receive the provided password with their email already confirmed so they can sign in immediately.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <AnimatedActionBtn
              icon={X}
              label="Cancel"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              variant="secondary"
            />
            <AnimatedActionBtn
              icon={UserPlus}
              label="Add User"
              onClick={() => {
                const form = document.querySelector('form')
                if (form) form.requestSubmit()
              }}
              isLoading={submitting}
              loadingLabel="Adding..."
              variant="primary"
            />
          </div>
        </form>
      </DialogBody>
    </Dialog>
  )
}

