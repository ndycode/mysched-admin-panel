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
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
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
    // Multi-image upload state
    const [files, setFiles] = useState<File[]>([])
    const [uploading, setUploading] = useState(false)
    const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 })

    // Multi-preview state: array of preview data for each analyzed image
    const [allPreviewData, setAllPreviewData] = useState<ImportPreviewResponse[]>([])
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)

    // Per-preview selections (section/semester stored per image)
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([])
    const [pendingSectionCodes, setPendingSectionCodes] = useState<(string | null)[]>([])

    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Derived state for current preview
    const currentPreviewData = allPreviewData[currentPreviewIndex] ?? null
    const selectedSectionId = selectedSectionIds[currentPreviewIndex] ?? 'none'
    const pendingSectionCode = pendingSectionCodes[currentPreviewIndex] ?? null

    // Handle paste from clipboard (for screenshots) - add to existing files
    const handlePaste = useCallback((e: ClipboardEvent) => {
        if (!open || allPreviewData.length > 0 || isMobile) return

        const items = e.clipboardData?.items
        if (!items) return

        const pastedFiles: File[] = []
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const blob = item.getAsFile()
                if (blob) {
                    const pastedFile = new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type })
                    pastedFiles.push(pastedFile)
                }
            }
        }
        if (pastedFiles.length > 0) {
            setFiles(prev => [...prev, ...pastedFiles])
        }
    }, [open, allPreviewData.length, isMobile])

    // Listen for paste events when dialog is open
    useEffect(() => {
        if (!open || allPreviewData.length > 0 || isMobile) return

        document.addEventListener('paste', handlePaste)
        return () => document.removeEventListener('paste', handlePaste)
    }, [open, allPreviewData.length, isMobile, handlePaste])

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

    // Fetch sections when semester changes
    useEffect(() => {
        const fetchSections = async () => {
            if (!selectedSemesterId) return
            try {
                const data = await api<Section[]>(`/api/sections?semester_id=${selectedSemesterId}`)
                setSections(data)
            } catch (err) {
                console.error('Failed to fetch sections:', err)
            }
        }
        fetchSections()
    }, [selectedSemesterId])

    const selectedSection = useMemo(() =>
        sections.find(s => String(s.id) === selectedSectionId),
        [sections, selectedSectionId])

    // Group sections by course prefix (e.g., ACT, BAC FE DM, BSCRIM)
    const groupedSections = useMemo(() => {
        const groups = new Map<string, Section[]>()

        for (const section of sections) {
            // Parse section code like "ACT 1-1" into course="ACT" and year-section="1-1"
            const match = section.code?.match(/^(.+?)\s+(\d+-\d+)$/)
            const course = match ? match[1].trim() : 'Other'
            if (!groups.has(course)) groups.set(course, [])
            groups.get(course)!.push(section)
        }

        // Sort groups alphabetically, sort sections within each group
        return Array.from(groups.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([course, secs]) => ({
                course,
                sections: secs.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? ''))
            }))
    }, [sections])

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
        if (files.length === 0) return
        setUploading(true)
        setError(null)
        setAnalyzeProgress({ current: 0, total: files.length })

        const previews: ImportPreviewResponse[] = []
        const sectionIds: string[] = []
        const sectionCodes: (string | null)[] = []

        try {
            // Fetch fresh sections for the selected semester to ensure accurate auto-selection
            let currentSections = sections
            if (selectedSemesterId) {
                try {
                    const freshSections = await api<Section[]>(`/api/sections?semester_id=${selectedSemesterId}`)
                    currentSections = freshSections
                    setSections(freshSections)
                } catch {
                    // Fall back to existing sections if fetch fails
                    console.warn('Failed to fetch fresh sections, using cached sections')
                }
            }
            for (let i = 0; i < files.length; i++) {
                setAnalyzeProgress({ current: i + 1, total: files.length })

                const currentFile = files[i]
                const resizedBlob = await resizeImage(currentFile)
                const formData = new FormData()
                formData.append('image', resizedBlob, currentFile.name)

                const res = await fetch('/api/classes/import-image', {
                    method: 'POST',
                    body: formData,
                })

                if (!res.ok) {
                    const data = await res.json()
                    throw new Error(`Image ${i + 1}: ${data.error || 'Failed to upload image'}`)
                }

                const data: ImportPreviewResponse = await res.json()

                // Auto-populate matched_instructor for detected instructors not in DB
                // Normalize name for comparison: lowercase, remove punctuation, collapse spaces
                const normalizeName = (name: string | null | undefined) =>
                    (name ?? '')
                        .toLowerCase()
                        .replace(/[.,\-_]/g, ' ')  // Replace punctuation with space
                        .replace(/\s+/g, ' ')      // Collapse multiple spaces
                        .trim()

                const processedRows = data.rows.map((row: SchedulePreviewRow) => {
                    if (row.instructor_name && !row.matched_instructor) {
                        const normalizedRowName = normalizeName(row.instructor_name)
                        const existingInstructor = instructors.find(
                            inst => normalizeName(inst.full_name) === normalizedRowName
                        )
                        if (existingInstructor) {
                            return { ...row, matched_instructor: existingInstructor }
                        } else {
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

                previews.push({ ...data, rows: processedRows })

                // Determine section selection for this image
                if (data.section) {
                    sectionIds.push(String(data.section.id))
                    sectionCodes.push(null)
                } else if (data.detectedSectionCode) {
                    // Check if section with this code already exists in the current semester's sections
                    // Normalize: trim, collapse spaces, uppercase
                    const normalizeCode = (code: string | null | undefined) =>
                        (code ?? '').trim().replace(/\s+/g, ' ').toUpperCase()

                    const normalizedCode = normalizeCode(data.detectedSectionCode)
                    const existingSection = currentSections.find(
                        s => normalizeCode(s.code) === normalizedCode
                    )
                    if (existingSection) {
                        // Auto-select the existing section
                        sectionIds.push(String(existingSection.id))
                        sectionCodes.push(null)
                    } else {
                        // Offer to create a new section
                        sectionIds.push(`create:${data.detectedSectionCode}`)
                        sectionCodes.push(data.detectedSectionCode)
                    }
                } else {
                    sectionIds.push('none')
                    sectionCodes.push(null)
                }
            }

            setAllPreviewData(previews)
            setSelectedSectionIds(sectionIds)
            setPendingSectionCodes(sectionCodes)
            setCurrentPreviewIndex(0)

        } catch (err) {
            setError((err as Error).message)
        } finally {
            setUploading(false)
            setAnalyzeProgress({ current: 0, total: 0 })
        }
    }

    const createSection = async (code: string): Promise<Section> => {
        const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()
        const res = await api('/api/sections', {
            method: 'POST',
            body: JSON.stringify({
                code: normalizedCode,
                semester_id: selectedSemesterId,
            }),
        })
        return res as Section
    }



    const createInstructor = async (name: string): Promise<InstructorSummary> => {
        const trimmedName = name.trim()

        // Normalize name for comparison: lowercase, remove punctuation, collapse spaces
        const normalizeName = (n: string) =>
            n.toLowerCase()
                .replace(/[.,\-_]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()

        const normalizedSearch = normalizeName(trimmedName)

        // First, check if an instructor with this name already exists
        const existingInstructor = instructors.find(
            inst => normalizeName(inst.full_name) === normalizedSearch
        )
        if (existingInstructor) {
            console.log(`[Import] Found existing instructor in local list: "${existingInstructor.full_name}" (id: ${existingInstructor.id})`)
            return { id: existingInstructor.id, full_name: existingInstructor.full_name }
        }

        // Also search the API in case our local list is stale
        try {
            const searchResult = await api<{ rows: Array<{ id: string; full_name: string }> }>(
                `/api/instructors?search=${encodeURIComponent(trimmedName)}&limit=10`
            )
            const exactMatch = searchResult.rows.find(
                inst => normalizeName(inst.full_name) === normalizedSearch
            )
            if (exactMatch) {
                console.log(`[Import] Found existing instructor via API: "${exactMatch.full_name}" (id: ${exactMatch.id})`)
                return { id: exactMatch.id, full_name: exactMatch.full_name }
            }
        } catch {
            // Ignore search errors, proceed to create
        }

        // Create new instructor
        console.log(`[Import] No match found, creating new instructor: "${trimmedName}"`)
        const res = await api('/api/instructors', {
            method: 'POST',
            body: JSON.stringify({
                full_name: trimmedName,
            }),
        })
        // The API returns the full instructor object, we just need the summary
        const data = res as { id: string; full_name: string }
        return { id: data.id, full_name: data.full_name }
    }

    const handleConfirm = async () => {
        if (allPreviewData.length === 0) return

        setConfirming(true)
        setError(null)

        let totalImported = 0

        // Track instructors created across ALL images to avoid duplicate creation
        const createdInstructorsMap = new Map<string, string>()
        // Track sections created across ALL images to avoid duplicate creation
        const createdSectionsMap = new Map<string, number>()

        try {
            // Process each image's preview data
            for (let idx = 0; idx < allPreviewData.length; idx++) {
                const preview = allPreviewData[idx]
                let finalSectionId = selectedSectionIds[idx] ?? 'none'

                console.log(`[Import] Processing Image ${idx + 1}/${allPreviewData.length}`)
                console.log(`[Import] Section selection: "${finalSectionId}"`)

                // If we have a pending section code, create it first
                if (finalSectionId.startsWith('create:')) {
                    const code = finalSectionId.replace('create:', '')
                    const normalizedCode = code.trim().replace(/\s+/g, ' ').toUpperCase()

                    // Check if we already created this section in a previous image
                    const existingCreatedId = createdSectionsMap.get(normalizedCode)
                    if (existingCreatedId) {
                        console.log(`[Import] Reusing section "${code}" from previous image (id: ${existingCreatedId})`)
                        finalSectionId = String(existingCreatedId)
                    } else {
                        try {
                            console.log(`[Import] Creating section: "${code}"`)
                            const newSection = await createSection(code)
                            console.log(`[Import] Created section "${code}" with id: ${newSection.id}`)
                            setSections(prev => [...prev, newSection])
                            createdSectionsMap.set(normalizedCode, newSection.id)
                            finalSectionId = String(newSection.id)
                        } catch (error) {
                            console.error(`[Import] Failed to create section:`, error)
                            const { message } = normalizeApiError(error, 'Failed to create section')
                            throw new Error(`Image ${idx + 1}: ${message}`)
                        }
                    }
                }

                // Create any pending instructors first
                const pendingInstructorNames = new Set<string>()
                preview.rows.forEach((row: SchedulePreviewRow) => {
                    const instructorValue = row.matched_instructor?.id
                    if (instructorValue && instructorValue.startsWith('create:')) {
                        const name = instructorValue.replace('create:', '')
                        // Only add if not already created in a previous image
                        if (!createdInstructorsMap.has(name)) {
                            pendingInstructorNames.add(name)
                        } else {
                            console.log(`[Import] Reusing instructor "${name}" from previous image (id: ${createdInstructorsMap.get(name)})`)
                        }
                    }
                })

                console.log(`[Import] Image ${idx + 1}: ${pendingInstructorNames.size} new instructors to create:`, [...pendingInstructorNames])

                if (pendingInstructorNames.size > 0) {
                    try {
                        for (const name of pendingInstructorNames) {
                            console.log(`[Import] Creating instructor: "${name}"`)
                            const newInstructor = await createInstructor(name)
                            console.log(`[Import] Created instructor "${name}" with id: ${newInstructor.id}`)
                            createdInstructorsMap.set(name, newInstructor.id)
                        }
                    } catch (error) {
                        console.error(`[Import] Failed to create instructor:`, error)
                        const { message } = normalizeApiError(error, 'Failed to create instructor')
                        throw new Error(`Image ${idx + 1}: ${message}`)
                    }
                }

                if (finalSectionId === 'none' || !finalSectionId) {
                    throw new Error(`Image ${idx + 1}: Please select or create a section.`)
                }

                if (!selectedSemesterId) {
                    throw new Error(`Please select a semester.`)
                }

                const payload = {
                    section_id: parseInt(finalSectionId, 10),
                    semester_id: selectedSemesterId,
                    classes: preview.rows.map((row: SchedulePreviewRow) => {
                        let instructorId = row.matched_instructor?.id ?? null

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
                    throw new Error(`Image ${idx + 1}: ${data.error || 'Failed to confirm import'}`)
                }

                const result = await res.json()
                totalImported += result.count
            }

            onImported(totalImported)
            handleClose()
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setConfirming(false)
        }
    }

    const handleClose = () => {
        setFiles([])
        setAllPreviewData([])
        setCurrentPreviewIndex(0)
        setSelectedSectionIds([])
        setPendingSectionCodes([])
        setSelectedSemesterId(null)
        setError(null)
        setAnalyzeProgress({ current: 0, total: 0 })
        onClose()
    }

    const updateRow = (index: number, field: keyof SchedulePreviewRow, value: string) => {
        if (!currentPreviewData) return
        const newRows = [...currentPreviewData.rows]
        newRows[index] = { ...newRows[index], [field]: value }
        setAllPreviewData(prev => {
            const updated = [...prev]
            updated[currentPreviewIndex] = { ...currentPreviewData, rows: newRows }
            return updated
        })
    }

    const handleSectionChange = async (value: string) => {
        setSelectedSectionIds(prev => {
            const updated = [...prev]
            updated[currentPreviewIndex] = value
            return updated
        })
        if (value.startsWith('create:')) {
            setPendingSectionCodes(prev => {
                const updated = [...prev]
                updated[currentPreviewIndex] = value.replace('create:', '')
                return updated
            })
        } else {
            setPendingSectionCodes(prev => {
                const updated = [...prev]
                updated[currentPreviewIndex] = null
                return updated
            })
        }
    }

    const updateRowInstructor = (index: number, value: string) => {
        if (!currentPreviewData) return
        const newRows = [...currentPreviewData.rows]

        let newInstructor: { id: string, full_name: string } | null = null

        if (value === 'none') {
            newInstructor = null
        } else if (value.startsWith('create:')) {
            const name = value.replace('create:', '')
            newInstructor = { id: value, full_name: name }
        } else {
            const found = instructors.find(inst => inst.id === value)
            if (found) newInstructor = found
        }

        newRows[index] = { ...newRows[index], matched_instructor: newInstructor }
        setAllPreviewData(prev => {
            const updated = [...prev]
            updated[currentPreviewIndex] = { ...currentPreviewData, rows: newRows }
            return updated
        })
    }



    const renderPreview = () => {
        if (!currentPreviewData) return null

        return (
            <div className="flex flex-col h-full gap-4">
                <div className="grid grid-cols-3 gap-4 flex-none">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Detected section</label>
                        <div className="flex h-11 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm shadow-sm">
                            {currentPreviewData.detectedSectionCode || currentPreviewData.section?.code || 'None'}
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
                                <ReactLenis root={false} options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }} className="max-h-80 overflow-y-auto p-1">
                                    {currentPreviewData.detectedSectionCode && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() => handleSectionChange(`create:${currentPreviewData.detectedSectionCode}`)}
                                            >
                                                Create {currentPreviewData.detectedSectionCode}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuLabel className="font-normal text-muted-foreground">Select a section</DropdownMenuLabel>
                                    {groupedSections.map(({ course, sections: courseSections }) => (
                                        <DropdownMenuSub key={course}>
                                            <DropdownMenuSubTrigger className="text-sm">
                                                {course}
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                {courseSections.map(section => (
                                                    <DropdownMenuItem
                                                        key={section.id}
                                                        onClick={() => handleSectionChange(String(section.id))}
                                                    >
                                                        {section.code || `Section ${section.id}`}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
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
                                            ? (() => {
                                                const sem = semesters.find(s => s.id === selectedSemesterId)
                                                return sem ? (
                                                    <span className="flex items-center gap-2">
                                                        {sem.name}
                                                        {sem.is_active && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Active</span>}
                                                    </span>
                                                ) : 'Select semester...'
                                            })()
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
                    currentPreviewData.message && (
                        <p className="text-xs text-muted-foreground">{currentPreviewData.message}</p>
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
                                {currentPreviewData.rows.map((row: SchedulePreviewRow, i: number) => (
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
                                                        {row.instructor_name && !instructors.some(inst => inst.full_name.toLowerCase() === row.instructor_name?.toLowerCase()) && (
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
                                {currentPreviewData.rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                                            No classes detected.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </ReactLenis>

                    {currentPreviewData.warnings.length > 0 && (
                        <div className="mt-4 rounded-md bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400 mx-1 mb-1">
                            <div className="mb-1 flex items-center gap-1 font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                Warnings
                            </div>
                            <ul className="list-inside list-disc space-y-0.5">
                                {currentPreviewData.warnings.slice(0, 3).map((w: string, i: number) => (
                                    <li key={i}>{w}</li>
                                ))}
                                {currentPreviewData.warnings.length > 3 && (
                                    <li>+ {currentPreviewData.warnings.length - 3} more warnings</li>
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
            className={allPreviewData.length > 0 && !isMobile ? "max-w-[95vw] xl:max-w-screen-2xl" : "max-w-md"}
        >
            <DialogHeader>
                <h2 className="text-xl font-semibold text-foreground">
                    {allPreviewData.length > 0 ? 'Import classes from image' : 'Import Classes'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {isMobile
                        ? 'This feature requires a larger screen.'
                        : allPreviewData.length > 0
                            ? 'Review the detected rows and import them into a section.'
                            : 'Upload one or more schedule images to import classes.'}
                </p>
            </DialogHeader>
            <DialogBody className={allPreviewData.length > 0 && !isMobile ? "overflow-hidden flex flex-col" : ""} scrollable={allPreviewData.length === 0 || isMobile}>
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

                        {allPreviewData.length === 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border p-10 transition-colors hover:border-muted-foreground/50">
                                    <div className="text-center">
                                        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Drag and drop files here, or click to select
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground/70">
                                            Supports multiple images • or press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-muted rounded border border-border">V</kbd> to paste
                                        </p>
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="file-upload"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => {
                                                const selectedFiles = e.target.files
                                                if (selectedFiles) {
                                                    setFiles(prev => [...prev, ...Array.from(selectedFiles)])
                                                }
                                            }}
                                        />
                                        <motion.label
                                            htmlFor="file-upload"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="mt-4 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black/80 hover:shadow-xl focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                        >
                                            Select Files
                                        </motion.label>
                                        {files.length > 0 && (
                                            <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-foreground px-4">
                                                <FileText className="h-4 w-4 shrink-0" />
                                                <span className="truncate max-w-64">
                                                    {files.length === 1 ? files[0].name : `${files.length} files selected`}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles([])}
                                                    className="ml-1 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                    aria-label="Clear selected files"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
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
                ) : allPreviewData.length === 0 ? (
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
                            label={analyzeProgress.total > 0 ? `Analyzing ${analyzeProgress.current} of ${analyzeProgress.total}...` : "Analyze images"}
                            onClick={handleUpload}
                            disabled={files.length === 0 || uploading}
                            isLoading={uploading}
                            loadingLabel={analyzeProgress.total > 1 ? `Analyzing ${analyzeProgress.current} of ${analyzeProgress.total}...` : "Analyzing..."}
                            variant="primary"
                        />
                    </>
                ) : (
                    <>
                        {/* Progress indicator */}
                        {allPreviewData.length > 1 && (
                            <span className="text-sm text-muted-foreground mr-auto">
                                Image {currentPreviewIndex + 1} of {allPreviewData.length}
                            </span>
                        )}

                        {/* Left button: Start over or Back */}
                        {currentPreviewIndex === 0 ? (
                            <AnimatedActionBtn
                                icon={X}
                                label="Start over"
                                onClick={handleClose}
                                disabled={confirming}
                                variant="secondary"
                            />
                        ) : (
                            <AnimatedActionBtn
                                icon={ChevronDown}
                                label="Back"
                                onClick={() => setCurrentPreviewIndex(prev => prev - 1)}
                                disabled={confirming}
                                variant="secondary"
                                className="[&>svg]:rotate-90"
                            />
                        )}

                        {/* Right button: Next or Confirm import */}
                        {currentPreviewIndex < allPreviewData.length - 1 ? (
                            <AnimatedActionBtn
                                icon={ChevronDown}
                                label="Next"
                                onClick={() => setCurrentPreviewIndex(prev => prev + 1)}
                                disabled={confirming}
                                variant="primary"
                                className="[&>svg]:-rotate-90"
                            />
                        ) : (
                            <AnimatedActionBtn
                                icon={Check}
                                label="Confirm import"
                                onClick={handleConfirm}
                                disabled={(selectedSectionId === 'none' && !pendingSectionCode) || confirming}
                                isLoading={confirming}
                                loadingLabel="Importing..."
                                variant="primary"
                            />
                        )}
                    </>
                )}
            </DialogFooter>
        </Dialog>
    )
}
