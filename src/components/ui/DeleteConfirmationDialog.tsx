'use client'

import React from 'react'
import { Trash2, X } from 'lucide-react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'

interface DeleteConfirmationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmationMessage?: string
    onConfirm: () => void
    isDeleting: boolean
    deleteLabel?: string
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmationMessage,
    onConfirm,
    isDeleting,
    deleteLabel = 'Delete',
}: DeleteConfirmationDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md">
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </DialogHeader>
            <DialogBody>
                <div className="space-y-4">
                    {confirmationMessage && (
                        <p className="text-sm text-muted-foreground">{confirmationMessage}</p>
                    )}
                    <div className="flex justify-end gap-3">
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                            disabled={isDeleting}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={Trash2}
                            label={deleteLabel}
                            onClick={onConfirm}
                            isLoading={isDeleting}
                            loadingLabel="Deleting..."
                            variant="primary"
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        />
                    </div>
                </div>
            </DialogBody>
        </Dialog>
    )
}
