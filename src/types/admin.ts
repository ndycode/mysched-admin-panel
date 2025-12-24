/**
 * Shared admin types used across dialogs, pages, and components
 */

import { DayValue } from '@/lib/days'

// ============ Entity Types ============

export type Semester = {
    id: number
    code: string
    name: string
    is_active: boolean
}

export type Section = {
    id: number
    code: string | null
    section_number?: string | null
    semester_id?: number | null
}

export type InstructorSummary = {
    id: string
    full_name: string
    email?: string | null
    title?: string | null
    department?: string | null
    avatar_url?: string | null
}

export type ClassRow = {
    id: number
    section_id: number | null
    day: DayValue | null
    start: string | null
    end: string | null
    code: string | null
    title: string | null
    units: number | null
    room: string | null
    instructor: string | null
    instructor_id: string | null
}

// ============ Dialog Props ============

export type FormDialogBaseProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export type ClassFormDialogProps = FormDialogBaseProps & {
    mode: 'add' | 'edit'
    classData?: ClassRow | null
    onComplete: () => void
}

export type SectionFormDialogProps = FormDialogBaseProps & {
    mode: 'add' | 'edit'
    sectionData?: Section | null
    onComplete: () => void
}

// ============ Grouped Sections (for cascading dropdown) ============

export type GroupedSections = {
    course: string
    sections: Section[]
}
