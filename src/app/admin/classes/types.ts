import { DayValue } from '@/lib/days'

export type ClassStatus = 'active' | 'inactive' | 'archived'

export type InstructorSummary = {
    id: string
    full_name: string
    email: string | null
    title: string | null
    department: string | null
    avatar_url: string | null
}

export type Row = {
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
    instructor_profile: InstructorSummary | null
}

export type EditableKey =
    | 'title'
    | 'code'
    | 'section_id'
    | 'day'
    | 'start'
    | 'end'
    | 'room'
    | 'instructor'
    | 'units'

export type Section = { id: number; code: string | null }

export type ClassDetail = Row & {
    created_at: string | null
    updated_at: string | null
    section: {
        id: number
        code: string | null
        section_number: string | null
        class_code: string | null
        class_name: string | null
        instructor: string | null
        time_slot: string | null
        room: string | null
        enrolled: number | null
        capacity: number | null
        status: string | null
    } | null
}

export type ApiRow = Omit<Row, 'day'> & { day: string | number | null }

export type ApiClassDetail = Omit<ClassDetail, 'day'> & { day: string | number | null }

export type EditableImportRow = {
    id: string
    day: string
    time: string
    code: string
    title: string
    units: string
    room: string
}
