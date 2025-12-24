
import React, { useEffect, useRef, useState } from 'react'

import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, UserPlus, Check } from 'lucide-react'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

import type { UserRow } from '../../types'
import type { UserFormErrors } from './shared'
import { EMAIL_REGEX, inputClasses, parseAppUserIdInput, useDialogFocusTrap } from './shared'

type UserFormDialogProps = {
    mode: 'add' | 'edit'
    user?: UserRow | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => Promise<void> | void
}

export function UserFormDialog({
    mode,
    user,
    open,
    onOpenChange,
    onComplete,
}: UserFormDialogProps) {
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

    const isAdd = mode === 'add'

    useDialogFocusTrap(dialogRef, open, () => {
        if (!submitting) onOpenChange(false)
    })

    useEffect(() => {
        if (open) {
            if (mode === 'edit' && user) {
                setFullName(user.full_name ?? '')
                setEmail(user.email ?? '')
                setStudentId(user.student_id ?? '')
                setAppUserId(user.app_user_id != null ? String(user.app_user_id) : '')
                setPassword('')
            } else {
                // Reset for add mode
                setFullName('')
                setEmail('')
                setStudentId('')
                setAppUserId('')
                setPassword('')
            }
            setErrors({})
            setFormError(null)
            setSubmitting(false)
        }
    }, [open, mode, user])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const name = fullName.trim()
        const mail = email.trim().toLowerCase()
        const pwd = password.trim()
        const nextErrors: UserFormErrors = {}

        // Validation
        if (!name) {
            nextErrors.fullName = 'Full name is required'
        }
        if (!mail) {
            nextErrors.email = 'Email is required'
        } else if (!EMAIL_REGEX.test(mail)) {
            nextErrors.email = 'Enter a valid email address'
        }

        // Password validation (required for add, optional for edit)
        if (isAdd) {
            if (!pwd) {
                nextErrors.password = 'Temporary password is required'
            } else if (pwd.length < 8) {
                nextErrors.password = 'Password must be at least 8 characters'
            }
        } else if (pwd && pwd.length < 8) {
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

        // Build payload
        if (isAdd) {
            // Create new user
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
                toast({ kind: 'success', msg: 'User created' })
                await onComplete()
                onOpenChange(false)
            } catch (error) {
                const { message } = normalizeApiError(error, 'Failed to create user')
                setFormError(message)
                toast({ kind: 'error', msg: message })
            } finally {
                setSubmitting(false)
            }
        } else {
            // Update existing user
            if (!user) {
                setFormError('Selected user is no longer available.')
                return
            }

            const payload: Record<string, unknown> = {}

            if (name !== (user.full_name ?? '').trim()) {
                payload.full_name = name
            }

            const originalEmail = user.email?.trim().toLowerCase() ?? null
            if ((mail || null) !== originalEmail) {
                payload.email = mail
            }

            const student = studentId.trim()
            const originalStudent = user.student_id?.trim() ?? null
            if ((student || null) !== originalStudent) {
                payload.student_id = student || null
            }

            const originalAppUserId = user.app_user_id ?? null
            if (parsedAppUserId !== originalAppUserId) {
                payload.app_user_id = parsedAppUserId
            }

            if (pwd) {
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
                toast({ kind: 'success', msg: 'User updated' })
                await onComplete()
                onOpenChange(false)
            } catch (error) {
                const { message } = normalizeApiError(error, 'Failed to update user')
                setFormError(message)
                toast({ kind: 'error', msg: message })
            } finally {
                setSubmitting(false)
            }
        }
    }

    const dialogTitle = isAdd ? 'Add user' : 'Edit user'
    const dialogDescription = isAdd
        ? 'Provision a new account with a confirmed email and temporary password.'
        : "Update account details or reset the user\u2019s password."

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
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">{dialogTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{dialogDescription}</p>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
                    {formError && (
                        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {formError}
                        </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Full name
                            <input
                                type="text"
                                ref={(node) => { fullNameRef.current = node }}
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className={inputClasses(Boolean(errors.fullName))}
                                placeholder="Sarah Johnson"
                            />
                            {errors.fullName && (
                                <span className="mt-1 block text-xs text-destructive">{errors.fullName}</span>
                            )}
                        </label>

                        <label className="text-sm font-medium text-foreground">
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={inputClasses(Boolean(errors.email))}
                                placeholder="sarah@example.com"
                            />
                            {errors.email && (
                                <span className="mt-1 block text-xs text-destructive">{errors.email}</span>
                            )}
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium text-foreground">
                            Student ID
                            <input
                                type="text"
                                value={studentId}
                                onChange={e => setStudentId(e.target.value)}
                                className={inputClasses(false)}
                                placeholder="STU001"
                            />
                        </label>

                        <label className="text-sm font-medium text-foreground">
                            App user ID
                            <input
                                type="text"
                                inputMode="numeric"
                                value={appUserId}
                                onChange={e => setAppUserId(e.target.value)}
                                className={inputClasses(Boolean(errors.appUserId))}
                                placeholder="1001"
                            />
                            {errors.appUserId && (
                                <span className="mt-1 block text-xs text-destructive">{errors.appUserId}</span>
                            )}
                        </label>
                    </div>

                    <div className={!isAdd ? 'space-y-2 border-t border-border pt-4' : ''}>
                        {!isAdd && (
                            <h3 className="text-sm font-medium text-foreground mb-2">Reset password</h3>
                        )}
                        <label className="block text-sm font-medium text-foreground">
                            {isAdd ? 'Temporary password' : ''}
                            <input
                                type={isAdd ? 'password' : 'text'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className={inputClasses(Boolean(errors.password))}
                                placeholder={isAdd ? 'At least 8 characters' : 'Leave blank to keep current password'}
                            />
                            {errors.password && (
                                <span className="mt-1 block text-xs text-destructive">{errors.password}</span>
                            )}
                        </label>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isAdd
                                ? 'The user will receive the provided password with their email already confirmed.'
                                : 'The user will receive the new password with their email already confirmed.'
                            }
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={isAdd ? UserPlus : Check}
                            label={isAdd ? 'Add User' : 'Save changes'}
                            onClick={() => {
                                const form = document.querySelector('form')
                                if (form) form.requestSubmit()
                            }}
                            isLoading={submitting}
                            loadingLabel={isAdd ? 'Adding...' : 'Saving...'}
                            variant="primary"
                        />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
