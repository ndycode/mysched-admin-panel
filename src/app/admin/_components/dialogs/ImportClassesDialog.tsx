'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ReactLenis } from 'lenis/react'
import { Dialog, DialogBody, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { ChevronDown, X, Upload, Check, AlertTriangle, FileText, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu'
import { TimeInput } from '@/components/ui/TimeInput'
import { type SchedulePreviewRow } from '@/lib/schedule-import'
import { api } from '@/lib/fetcher'
import { normalizeApiError } from '@/lib/api-error-client'

type Section = { id: number; code: string | null }
type Semester = { id: number; code: string; name: string; is_active: boolean }
type InstructorSummary = {
    id: string
    full_name: string
}

type ImportClassesDialogProps = {
    open: boolean
    onClose: () => void
    sections: Section[]
    instructors: InstructorSummary[]
    onImported: (count: number) => void
}

type ImportPreviewResponse = {
    section: { id: number; code: string | null } | null
    detectedSectionCode: string | null
    requiresSectionSelection: boolean
    message: string | null
    rows: SchedulePreviewRow[]
    warnings: string[]
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}

export function ImportClassesDialog({
    open,
    onClose,
    sections: initialSections,
    instructors,
    onImported,
}: ImportClassesDialogProps) {
    const isMobile = useIsMobile()
    const [sections, setSections] = useState(initialSections)
    const [semesters, setSemesters] = useState<Semester[]>([])
    const [semestersLoading, setSemestersLoading] = useState(true)
    const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null)
    const [selectedSectionId, setSelectedSectionId] = useState<string>('none')
    const [pendingSectionCode, setPendingSectionCode] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Handle paste from clipboard (for screenshots)
    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!open || previewData || isMobile) return

        const items = e.clipboardData?.items
        if (!items) return

        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const blob = item.getAsFile()
                if (blob) {
                    // Create a file with a name for the pasted image
                    const pastedFile = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type })
                    setFile(pastedFile)
                }
                break
            }
        }
    }, [open, previewData, isMobile])

    // Listen for paste events when dialog is open
    useEffect(() => {
        if (!open || previewData || isMobile) return

        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [open, previewData, isMobile, handlePaste])

    useEffect(() => {
        setSections(initialSections)
    }, [initialSections])

    // Fetch semesters on mount
    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                const data = await api<Semester[]>('/api/semesters')
                setSemesters(data)
                // Auto-select active semester
                const active = data.find(s => s.is_active)
                if (active) {
                    setSelectedSemesterId(active.id)
                }
            } catch (err) {
                console.error('Failed to fetch semesters:', err)
            } finally {
                setSemestersLoading(false)
            }
        }
        if (open) {
            fetchSemesters()
        }
    }, [open])

    const selectedSection = useMemo(() =>
        sections.find(s => String(s.id) === selectedSectionId),
        [sections, selectedSectionId])

    const resizeImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.src = URL.createObjectURL(file)
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height
                const maxDim = 1500

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width)
                        width = maxDim
                    } else {
                        width = Math.round((width * maxDim) / height)
                        height = maxDim
                    }
                }

                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'))
                    return
                }
                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob)
                        else reject(new Error('Canvas to Blob failed'))
                    },
                    'image/jpeg',
                    0.85
                )
            }
            img.onerror = (err) => reject(err)
        })
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setError(null)
        setPendingSectionCode(null)
        setSelectedSectionId('none')

        try {
            const resizedBlob = await resizeImage(file)
            const formData = new FormData()
            formData.append('image', resizedBlob, file.name)

            const res = await fetch('/api/classes/import-image', {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to upload image')
            }

            const data: ImportPreviewResponse = await res.json()

            // Auto-populate matched_instructor for detected instructors not in DB
            const processedRows = data.rows.map(row => {
                // If instructor_name exists but no matched_instructor, check if it's in the DB
                if (row.instructor_name && !row.matched_instructor) {
                    const existingInstructor = instructors.find(
                        i => i.full_name.toLowerCase() === row.instructor_name?.toLowerCase()
                    )
                    if (existingInstructor) {
                        // Match found, use it
                        return { ...row, matched_instructor: existingInstructor }
                    } else {
                        // Not found, auto-select "create" option
                        return {
                            ...row,
                            matched_instructor: {
                                id: `create:${row.instructor_name}`,
                                full_name: row.instructor_name
                            }
                        }
                    }
                }
                return row
            })

            setPreviewData({ ...data, rows: processedRows })

            if (data.section) {
                setSelectedSectionId(String(data.section.id))
            } else if (data.detectedSectionCode) {
                // If section not found but code detected, set as pending creation
                setPendingSectionCode(data.detectedSectionCode)
                // Auto-select the "create" option
                setSelectedSectionId(`create:${data.detectedSectionCode}`)
            }

        } catch (err) {
            setError((err as Error).message)
        } finally {
            setUploading(false)
        }
    }

    const createSection = async (code: string): Promise<Section> => {
        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()
        const res = await api('/api/sections', {
            method: 'POST',
            body: JSON.stringify({ code: normalizedCode }),
        })
        return res as Section
    }

    const handleCreateSection = async (codeToCreate?: string) => {
        const code = codeToCreate ?? pendingSectionCode
        if (!code) return

        try {
            const newSection = await createSection(code)

            setSections(prev => [...prev, newSection])
            setSelectedSectionId(String(newSection.id))
            setPendingSectionCode(null)
        } catch (error) {
            const { message } = normalizeApiError(error, 'Failed to create section')
            setError(message)
        }
    }

    const createInstructor = async (name: string): Promise<InstructorSummary> => {
        const res = await api('/api/instructors', {
            method: 'POST',
            body: JSON.stringify({
                full_name: name.trim(),
            }),
        })
        // The API returns the full instructor object, we just need the summary
        const data = res as { id: string; full_name: string }
        return { id: data.id, full_name: data.full_name }
    }

    const handleConfirm = async () => {
        if (!previewData) return

        // If we have a pending section code, create it first
        let finalSectionId = selectedSectionId
        if (finalSectionId.startsWith('create:')) {
            const code = finalSectionId.replace('create:', '')
            setConfirming(true) // Show loading state early
            try {
                const newSection = await createSection(code)
                setSections(prev => [...prev, newSection])
                finalSectionId = String(newSection.id)
            } catch (error) {
                const { message } = normalizeApiError(error, 'Failed to create section')
                setError(message)
                setConfirming(false)
                return
            }
        }

        // Create any pending instructors first
        const pendingInstructorNames = new Set<string>()
        previewData.rows.forEach(row => {
            const instructorValue = row.matched_instructor?.id
            if (instructorValue && instructorValue.startsWith('create:')) {
                pendingInstructorNames.add(instructorValue.replace('create:', ''))
            }
        })

        const createdInstructorsMap = new Map<string, string>() // name -> id

        if (pendingInstructorNames.size > 0) {
            setConfirming(true)
            try {
                for (const name of pendingInstructorNames) {
                    const newInstructor = await createInstructor(name)
                    createdInstructorsMap.set(name, newInstructor.id)
                }
            } catch (error) {
                const { message } = normalizeApiError(error, 'Failed to create instructor')
                setError(message)
                setConfirming(false)
                return
            }
        }

        if (finalSectionId === 'none' || !finalSectionId) {
            setError("Please select or create a section.")
            return
        }

        if (!selectedSemesterId) {
            setError("Please select a semester.")
            return
        }

        setConfirming(true)
        setError(null)

        try {
            const payload = {
                section_id: parseInt(finalSectionId, 10),
                semester_id: selectedSemesterId,
                classes: previewData.rows.map(row => {
                    let instructorId = row.matched_instructor?.id ?? null

                    // If it was a create request, map to the new ID
                    if (instructorId && instructorId.startsWith('create:')) {
                        const name = instructorId.replace('create:', '')
                        instructorId = createdInstructorsMap.get(name) ?? null
                    }

                    return {
                        day: row.day,
                        start: row.start,
                        end: row.end,
                        code: row.code || 'UNKNOWN',
                        title: row.title || 'Unknown Class',
                        units: row.units,
                        room: row.room,
                        instructor_id: instructorId,
                    }
                })
            }

            const res = await fetch('/api/classes/import-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to confirm import')
            }

            const result = await res.json()
            onImported(result.count)
            handleClose()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setConfirming(false)
        }
    }

    const handleClose = () => {
        setFile(null)
        setPreviewData(null)
        setSelectedSectionId('none')
        setSelectedSemesterId(null)
        setPendingSectionCode(null)
        setError(null)
        onClose()
    }

    const updateRow = (index: number, field: keyof SchedulePreviewRow, value: string) => {
        if (!previewData) return
        const newRows = [...previewData.rows]
        newRows[index] = { ...newRows[index], [field]: value }
        setPreviewData({ ...previewData, rows: newRows })
    }

    const handleSectionChange = async (value: string) => {
        setSelectedSectionId(value)
        if (value.startsWith('create:')) {
            setPendingSectionCode(value.replace('create:', ''))
        } else {
            setPendingSectionCode(null)
        }
    }

    const updateRowInstructor = (index: number, value: string) => {
        if (!previewData) return
        const newRows = [...previewData.rows]

        let newInstructor: { id: string, full_name: string } | null = null

        if (value === 'none') {
            newInstructor = null
        } else if (value.startsWith('create:')) {
            const name = value.replace('create:', '')
            newInstructor = { id: value, full_name: name } // Temporary ID for create
        } else {
            const found = instructors.find(i => i.id === value)
            if (found) newInstructor = found
        }

        newRows[index] = { ...newRows[index], matched_instructor: newInstructor }
        setPreviewData({ ...previewData, rows: newRows })
    }

    const renderPreview = () => {
        if (!previewData) return null

        return (
            <div className="flex flex-col h-full gap-4">
                <div className="grid grid-cols-3 gap-4 flex-none">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Detected section</label>
                        <div className="flex h-11 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm">
                            {previewData.detectedSectionCode || previewData.section?.code || 'None'}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Import into section</label>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <AnimatedActionBtn
                                    label={
                                        selectedSection
                                            ? (selectedSection.code || `Section ${selectedSection.id}`)
                                            : (pendingSectionCode
                                                ? `Create ${pendingSectionCode}`
                                                : "Select a section...")
                                    }
                                    icon={ChevronDown}
                                    variant="secondary"
                                    className="w-full justify-between h-11 px-3"
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0" align="start">
                                <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                                    {previewData.detectedSectionCode && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => handleSectionChange(`create:${previewData.detectedSectionCode}`)}
                                            >
                                                Create {previewData.detectedSectionCode}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuLabel className="font-normal text-muted-foreground">Select a section</DropdownMenuLabel>
                                    {sections.map((section) => (
                                        <DropdownMenuItem
                                            key={section.id}
                                            onClick={() => handleSectionChange(String(section.id))}
                                        >
                                            {section.code || `Section ${section.id}`}
                                        </DropdownMenuItem>
                                    ))}
                                </ReactLenis>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Import to semester</label>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <AnimatedActionBtn
                                    label={
                                        selectedSemesterId
                                            ? semesters.find(s => s.id === selectedSemesterId)?.name || 'Select semester...'
                                            : 'Select semester...'
                                    }
                                    icon={ChevronDown}
                                    variant="secondary"
                                    className="w-full justify-between h-11 px-3"
                                    disabled={semestersLoading}
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-52 p-0" align="start">
                                <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-72 overflow-y-auto p-1">
                                    {semesters.map((semester) => (
                                        <DropdownMenuItem
                                            key={semester.id}
                                            onClick={() => setSelectedSemesterId(semester.id)}
                                        >
                                            <span className="flex items-center gap-2">
                                                {semester.name}
                                                {semester.is_active && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
                                            </span>
                                        </DropdownMenuItem>
                                    ))}
                                </ReactLenis>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {
                    previewData.message && (
                        <p className="text-xs text-muted-foreground">{previewData.message}</p>
                    )
                }

                <div className="flex-1 overflow-hidden flex flex-col min-h-0 rounded-md border border-border">
                    <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="flex-1 overflow-auto relative max-h-[50vh]">
                        <table className="w-full table-fixed text-sm text-left border-collapse">
                            <thead className="bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0 z-10">
                                <tr>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-16">Day</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-[72px]">Start</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-[72px]">End</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-[60px]">Code</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-56 max-w-56">Title</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-10">Units</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-14">Room</th>
                                    <th className="px-2 sm:px-3 py-3 font-medium w-[152px]">Instructor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {previewData.rows.map((row, i) => (
                                    <tr key={i} className="group hover:bg-muted/50 transition-colors duration-200">
                                        <td className="px-2 sm:px-3 py-2 align-middle w-16">
                                            <input
                                                value={row.day || ''}
                                                onChange={e => updateRow(i, 'day', e.target.value)}
                                                className="w-full !h-8 !min-h-0 bg-transparent px-2 !rounded-md border border-border focus:border-ring focus:outline-none text-xs sm:text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-[72px]">
                                            <TimeInput
                                                value={row.start || ''}
                                                onChange={val => updateRow(i, 'start', val)}
                                                className="w-full !h-8 !min-h-0 bg-transparent !px-2 !rounded-md border border-border focus:border-ring focus:ring-0 text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-[72px]">
                                            <TimeInput
                                                value={row.end || ''}
                                                onChange={val => updateRow(i, 'end', val)}
                                                className="w-full !h-8 !min-h-0 bg-transparent !px-2 !rounded-md border border-border focus:border-ring focus:ring-0 text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-[60px]">
                                            <input
                                                value={row.code || ''}
                                                onChange={e => updateRow(i, 'code', e.target.value)}
                                                className="w-full !h-8 !min-h-0 bg-transparent px-2 font-medium !rounded-md border border-border focus:border-ring focus:outline-none text-xs sm:text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-56 max-w-56">
                                            <input
                                                value={row.title || ''}
                                                onChange={e => updateRow(i, 'title', e.target.value)}
                                                className="w-full !h-8 !min-h-0 bg-transparent px-2 !rounded-md border border-border focus:border-ring focus:outline-none text-xs sm:text-sm transition-colors truncate"
                                                title={row.title || ''}
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-10">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={row.units || ''}
                                                onChange={e => updateRow(i, 'units', e.target.value)}
                                                className="w-full !h-8 !min-h-0 bg-transparent px-2 !rounded-md border border-border focus:border-ring focus:outline-none text-xs sm:text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-14">
                                            <input
                                                value={row.room || ''}
                                                onChange={e => updateRow(i, 'room', e.target.value)}
                                                className="w-full !h-8 !min-h-0 bg-transparent px-2 !rounded-md border border-border focus:border-ring focus:outline-none text-xs sm:text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-2 sm:px-3 py-2 align-middle w-[152px]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <AnimatedActionBtn
                                                        label={
                                                            row.matched_instructor
                                                                ? (row.matched_instructor.id.startsWith('create:')
                                                                    ? `Create ${row.matched_instructor.full_name}`
                                                                    : row.matched_instructor.full_name)
                                                                : (row.instructor_name ? `Detect: ${row.instructor_name}` : "Unassigned")
                                                        }
                                                        icon={ChevronDown}
                                                        variant="secondary"
                                                        className="w-full justify-between h-8 px-2 text-xs rounded-md"
                                                    />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-52 p-0" align="end">
                                                    <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-52 overflow-y-auto p-1">
                                                        <DropdownMenuItem onClick={() => updateRowInstructor(i, 'none')}>
                                                            Unassigned
                                                        </DropdownMenuItem>
                                                        {row.instructor_name && !instructors.some(i => i.full_name.toLowerCase() === row.instructor_name?.toLowerCase()) && (
                                                            <>
                                                                <DropdownMenuItem
                                                                    onClick={() => updateRowInstructor(i, `create:${row.instructor_name}`)}
                                                                >
                                                                    Create {row.instructor_name}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                            </>
                                                        )}
                                                        <DropdownMenuLabel className="font-normal text-muted-foreground">Select Instructor</DropdownMenuLabel>
                                                        {instructors.map((instructor) => (
                                                            <DropdownMenuItem
                                                                key={instructor.id}
                                                                onClick={() => updateRowInstructor(i, instructor.id)}
                                                            >
                                                                {instructor.full_name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </ReactLenis>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                                {previewData.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                                            No classes detected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </ReactLenis>

                    {previewData.warnings.length > 0 && (
                        <div className="mt-4 rounded-md bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400 mx-1 mb-1">
                            <div className="mb-1 flex items-center gap-1 font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                Warnings
                            </div>
                            <ul className="list-inside list-disc space-y-0.5">
                                {previewData.warnings.slice(0, 3).map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                                {previewData.warnings.length > 3 && (
                                    <li>+ {previewData.warnings.length - 3} more warnings</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => !val && !uploading && !confirming && handleClose()}
            className={previewData && !isMobile ? "max-w-[95vw] xl:max-w-screen-2xl" : "max-w-md"}
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">
                    {previewData ? 'Import classes from image' : 'Import Classes'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isMobile
                        ? 'This feature requires a larger screen.'
                        : previewData
                            ? 'Upload a schedule photo, review the detected rows, and import them into a section.'
                            : 'Upload an image or file to import classes.'}
                </p>
            </DialogHeader>
            <DialogBody className={previewData && !isMobile ? "overflow-hidden flex flex-col" : ""} scrollable={!previewData || isMobile}>
                {isMobile ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <Monitor className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Desktop Required
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Import from image works best on a desktop or tablet. Please use a device with a larger screen to access this feature.
                        </p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {!previewData ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-10 transition-colors hover:border-muted-foreground/50">
                                    <div className="text-center">
                                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Drag and drop a file here, or click to select
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground/70">
                                            or press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">V</kbd> to paste a screenshot
                                        </p>
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="file-upload"
                                            accept="image/*"
                                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                        />
                                        <motion.label
                                            htmlFor="file-upload"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black/80 hover:shadow-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            Select File
                                        </motion.label>
                                        {file && (
                                            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-foreground px-4">
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="truncate max-w-64" title={file.name}>
                                                    {file.name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            renderPreview()
                        )}
                    </>
                )}
            </DialogBody>
            <DialogFooter>
                {isMobile ? (
                    <AnimatedActionBtn
                        icon={X}
                        label="Close"
                        onClick={handleClose}
                        variant="secondary"
                        className="w-full"
                    />
                ) : !previewData ? (
                    <>
                        <AnimatedActionBtn
                            icon={X}
                            label="Cancel"
                            onClick={handleClose}
                            disabled={uploading}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={Upload}
                            label="Analyze image"
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            isLoading={uploading}
                            loadingLabel="Analyzing..."
                            variant="primary"
                        />
                    </>
                ) : (
                    <>
                        <AnimatedActionBtn
                            icon={X}
                            label="Start over"
                            onClick={handleClose}
                            disabled={confirming}
                            variant="secondary"
                        />
                        <AnimatedActionBtn
                            icon={Check}
                            label="Confirm import"
                            onClick={handleConfirm}
                            disabled={(selectedSectionId === 'none' && !pendingSectionCode) || confirming}
                            isLoading={confirming}
                            loadingLabel="Importing..."
                            variant="primary"
                        />
                    </>
                )}
            </DialogFooter>
        </Dialog>
    )
}
