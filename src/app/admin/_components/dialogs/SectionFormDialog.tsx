'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { SemesterSelector } from '@/components/selectors'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { inputClasses } from '@/components/ui/Input'
import { useSemesters } from '@/hooks/useAdminOptions'
import type { Section } from '@/types/admin'

type SectionFormDialogProps = {
    mode: 'add' | 'edit'
    sectionData?: {
        id?: number | null
        code?: string | null
        section_number?: string | null
        sectionNumber?: string | null  // Alternative naming
        semester_id?: number | null
        semesterId?: number | null  // Alternative naming
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: () => void
}

export function SectionFormDialog({
    mode,
    sectionData,
    open,
    onOpenChange,
    onComplete,
}: SectionFormDialogProps) {
    const toast = useToast()
    const { activeSemester } = useSemesters({ enabled: open })

    // Form state
    const [code, setCode] = useState('')
    const [sectionNumber, setSectionNumber] = useState('')
    const [semesterId, setSemesterId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            if (mode === 'edit' && sectionData) {
                setCode(sectionData.code ?? '')
                // Handle both naming conventions
                setSectionNumber(sectionData.section_number ?? sectionData.sectionNumber ?? '')
                const semId = sectionData.semester_id ?? sectionData.semesterId
                setSemesterId(semId ? String(semId) : '')
            } else {
                // Reset for add mode, auto-select active semester
                setCode('')
                setSectionNumber('')
                setSemesterId(activeSemester ? String(activeSemester.id) : '')
            }
            setSubmitting(false)
            setFormError(null)
        }
    }, [open, mode, sectionData, activeSemester])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()

        if (!normalizedCode) {
            setFormError('Section code is required')
            toast({ kind: 'error', msg: 'Section code is required' })
            return
        }

        setSubmitting(true)
        setFormError(null)

        try {
            const payload: Record<string, unknown> = {
                code: normalizedCode,
                semester_id: semesterId ? Number(semesterId) : null,
            }

            if (mode === 'edit' && sectionData) {
                // Only send changed fields for edit
                const editPayload: Record<string, unknown> = {}

                const normalizedNumber = sectionNumber.trim()
                const originalNumber = sectionData.section_number ?? ''
                if (normalizedNumber !== originalNumber) {
                    editPayload.section_number = normalizedNumber || null
                }

                const originalCode = sectionData.code ?? ''
                if (normalizedCode !== originalCode) {
                    editPayload.code = normalizedCode
                }

                const newSemesterId = semesterId ? Number(semesterId) : null
                const originalSemesterId = sectionData.semester_id ?? sectionData.semesterId ?? null
                if (newSemesterId !== originalSemesterId) {
                    editPayload.semester_id = newSemesterId
                }

                if (Object.keys(editPayload).length === 0) {
                    setFormError('No changes to save.')
                    setSubmitting(false)
                    return
                }

                await api(`/api/sections/${sectionData.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(editPayload),
                })
                toast({ kind: 'success', msg: 'Section updated' })
            } else {
                await api('/api/sections', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                })
                toast({ kind: 'success', msg: 'Section created' })
            }

            onComplete()
            onOpenChange(false)
        } catch (error) {
            const { message } = normalizeApiError(error, `Failed to ${mode} section`)
            toast({ kind: 'error', msg: message })
            setFormError(message)
        } finally {
            setSubmitting(false)
        }
    }

    const isAdd = mode === 'add'
    const dialogTitle = isAdd ? 'Add Section' : 'Edit section'
    const dialogDescription = isAdd
        ? 'Create a new section by entering its code.'
        : `Update metadata for ${sectionData?.code ?? 'section'}.`

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !val && !submitting && onOpenChange(false)}
            className="max-w-md"
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">{dialogTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{dialogDescription}</p>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    {formError && (
                        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {formError}
                        </p>
                    )}

                    {/* Section Code */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Section Code
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className={inputClasses({})}
                            placeholder="BSIT 1-1"
                            required
                            disabled={submitting}
                        />
                    </div>

                    {/* Section Number (edit mode only) */}
                    {!isAdd && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                                Section Number
                            </label>
                            <input
                                type="text"
                                value={sectionNumber}
                                onChange={(e) => setSectionNumber(e.target.value)}
                                className={inputClasses({})}
                                disabled={submitting}
                            />
                        </div>
                    )}

                    {/* Semester */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Semester
                        </label>
                        <SemesterSelector
                            value={semesterId}
                            onChange={setSemesterId}
                            noneLabel="No semester"
                            className="w-full justify-between h-11 px-4"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={isAdd ? Plus : Check}
                            label={isAdd ? 'Create Section' : 'Save changes'}
                            onClick={() => {
                                const form = document.querySelector('form')
                                if (form) form.requestSubmit()
                            }}
                            isLoading={submitting}
                            loadingLabel={isAdd ? 'Creating...' : 'Saving...'}
                            variant="primary"
                        />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
