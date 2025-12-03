'use client'

import React from 'react'
import { Trash2, X } from 'lucide-react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'

interface DeleteConfirmationDialogProps {
    open: boolean
    onOpenChange?: (open: boolean) => void
    onCancel?: () => void
    title: string
    message?: string
    description?: string
    confirmationMessage?: string
    onConfirm: () => void
    isDeleting?: boolean
    loading?: boolean
    deleteLabel?: string
    confirmText?: string
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    title,
    message,
    description,
    confirmationMessage,
    onConfirm,
    onCancel,
    isDeleting = false,
    loading,
    deleteLabel = 'Delete',
    confirmText,
}: DeleteConfirmationDialogProps) {
    const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null)
    const resolvedLoading = loading ?? isDeleting
    const resolvedLabel = confirmText ?? deleteLabel ?? 'Delete'
    const resolvedDescription = description ?? null
    const resolvedBodyMessage = confirmationMessage ?? message ?? null
    const close = (next: boolean) => {
        if (onOpenChange) onOpenChange(next)
        if (!next && onCancel) onCancel()
    }
    return (
        <Dialog open={open} onOpenChange={close} className="max-w-md" initialFocus={confirmButtonRef as React.RefObject<HTMLElement>}>
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                {resolvedDescription ? <p className="mt-1 text-sm text-muted-foreground">{resolvedDescription}</p> : null}
            </DialogHeader>
            <DialogBody>
                <div className="space-y-4">
                    {resolvedBodyMessage && (
                        <p className="text-sm text-muted-foreground">{resolvedBodyMessage}</p>
                    )}
                    <div className="flex justify-end gap-3">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => close(false)}
                            disabled={resolvedLoading}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={Trash2}
                            label={resolvedLabel}
                            onClick={() => {
                                if (!resolvedLoading) onConfirm()
                            }}
                            isLoading={resolvedLoading}
                            loadingLabel="Deleting..."
                            variant="primary"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            ref={confirmButtonRef}
                            autoFocus
                        />
                    </div>
                </div>
            </DialogBody>
        </Dialog>
    )
}
