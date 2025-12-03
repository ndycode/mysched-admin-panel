'use client'

import { useEffect, useMemo, useState, useActionState } from 'react'
import { Dialog, DialogBody, DialogHeader } from '@/components/ui/Dialog'
import { useFormStatus } from 'react-dom'

import { Button, Input } from '@/components/ui'
import { updateProfile, type UpdateProfileState } from '@/app/admin/actions'
import { useToast } from '@/components/toast'
import { AvatarThumbnail } from './AvatarThumbnail'
import { AnimatedActionBtn } from './ui/AnimatedActionBtn'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/DropdownMenu'
import { ChevronDown } from 'lucide-react'

type ProfileSettingsDialogProps = {
    open: boolean
    initialData: {
        fullName: string
        avatarUrl: string | null
        email: string
        studentId?: string | null
    }
    onClose: () => void
}

const initialState: UpdateProfileState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
        <Button type="submit" variant="primary" disabled={pending} className="min-w-[140px] justify-center">
            {pending ? 'Saving...' : 'Save changes'}
        </Button>
    )
}

export function ProfileSettingsDialog({ open, initialData, onClose }: ProfileSettingsDialogProps) {
    const [state, formAction] = useActionState(updateProfile, initialState)
    const toast = useToast()

    const [mounted, setMounted] = useState(false)

    // Local state for controlled inputs to allow editing
    const [fullName, setFullName] = useState(initialData.fullName)
    const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl ?? '')
    const [email, setEmail] = useState(initialData.email)
    const [studentId, setStudentId] = useState(initialData.studentId ?? '')
    const sectionOptions = useMemo(
        () => [
            { value: '', label: 'All Sections' },
            { value: 'ACT 1-1', label: 'ACT 1-1' },
            { value: 'ACT 2-1', label: 'ACT 2-1' },
            { value: 'BSCS 1-1', label: 'BSCS 1-1' },
            { value: 'BSCS 2-1', label: 'BSCS 2-1' },
            { value: 'BSIS 2-1', label: 'BSIS 2-1' },
        ],
        [],
    )
    const selectedSectionLabel = useMemo(() => {
        const found = sectionOptions.find(option => option.value === studentId)
        return found ? found.label : (studentId ? studentId : 'All Sections')
    }, [sectionOptions, studentId])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (open) {
            setFullName(initialData.fullName)
            setAvatarUrl(initialData.avatarUrl ?? '')
            setEmail(initialData.email)
            setStudentId(initialData.studentId ?? '')
        }
    }, [open, initialData])

    useEffect(() => {
        if (state.success) {
            toast({ kind: 'success', msg: 'Profile updated successfully' })
            onClose()
        } else if (state.error) {
            toast({ kind: 'error', msg: state.error })
        }
    }, [state, toast, onClose])

    if (!open || !mounted) return null

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()} className="max-w-4xl">
            <DialogHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">Profile Details</h2>
                <p className="text-sm text-muted-foreground">Keep your account info up to date.</p>
            </DialogHeader>
            <DialogBody className="space-y-6">
                <form action={formAction} className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-lg font-semibold text-foreground">{fullName || 'Your name'}</p>
                            <p className="text-sm text-muted-foreground">{email || 'Email not set'}</p>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
                            <AvatarThumbnail name={fullName} src={avatarUrl || null} size="md" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">Signed in as</p>
                                <p className="truncate text-sm text-muted-foreground">{email}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 border-t border-border pt-4 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="profile-fullname">
                                    Full Name
                                </label>
                                <Input
                                    id="profile-fullname"
                                    name="fullName"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    required
                                    placeholder="e.g. Jane Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="profile-email">
                                    Email
                                </label>
                                <Input
                                    id="profile-email"
                                    name="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    type="email"
                                    required
                                    placeholder="jane@example.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Changing this updates both your profile and login email.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Section
                                </label>
                                <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <AnimatedActionBtn
                                                icon={ChevronDown}
                                                label={selectedSectionLabel}
                                                variant="secondary"
                                                className="justify-between gap-2 px-4 min-w-[180px]"
                                            />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-[220px] max-h-72 overflow-y-auto">
                                            {sectionOptions.map(option => (
                                                <DropdownMenuItem
                                                    key={option.value || 'all'}
                                                    onClick={() => setStudentId(option.value)}
                                                >
                                                    {option.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <input type="hidden" name="studentId" value={studentId} />
                                </div>
                                <p className="text-xs text-muted-foreground">Optional: choose your current section.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="profile-avatar">
                                    Avatar URL
                                </label>
                                <Input
                                    id="profile-avatar"
                                    name="avatarUrl"
                                    value={avatarUrl}
                                    onChange={e => setAvatarUrl(e.target.value)}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <SubmitButton />
                    </div>
                </form>
            </DialogBody>
        </Dialog>
    )
}
