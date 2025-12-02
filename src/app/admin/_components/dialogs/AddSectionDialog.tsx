'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { X, Plus } from 'lucide-react'

type AddSectionDialogProps = {
    open: boolean
    onOpenChange: (next: boolean) => void
    onCreated: () => Promise<void> | void
}

export function AddSectionDialog({ open, onOpenChange, onCreated }: AddSectionDialogProps) {
    const toast = useToast()
    const [code, setCode] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const codeRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!open) {
            setCode('')
            setSubmitting(false)
        }
    }, [open])

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()
        if (!normalizedCode) {
            toast({ kind: 'error', msg: 'Section code is required' })
            return
        }

        setSubmitting(true)
        try {
            await api('/api/sections', {
                method: 'POST',
                body: JSON.stringify({ code: normalizedCode }),
            })
            toast({ kind: 'success', msg: 'Section created' })
            await onCreated()
            onOpenChange(false)
        } catch (error) {
            const { message } = normalizeApiError(error, 'Failed to create section')
            toast({ kind: 'error', msg: message })
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !val && !submitting && onOpenChange(false)}
            className="max-w-md"
            initialFocus={codeRef as React.RefObject<HTMLElement>}
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">Add Section</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Create a new section by entering its code.
                </p>
            </DialogHeader>
            <DialogBody>
                <form onSubmit={handleSubmit} className="grid gap-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Section Code
                        </label>
                        <input
                            ref={(node) => {
                                codeRef.current = node
                            }}
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="CS101-A"
                            required
                            disabled={submitting}
                        />
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
                            icon={Plus}
                            label="Create Section"
                            onClick={() => {
                                const form = document.querySelector('form')
                                if (form) form.requestSubmit()
                            }}
                            isLoading={submitting}
                            loadingLabel="Creating..."
                            variant="primary"
                        />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
