import { dayLabel } from '@/lib/days'
import { ClassStatus, Row } from './types'

export const STATUS_META = {
    active: {
        label: 'Active',
        className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    },
    inactive: {
        label: 'Inactive',
        className: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
    },
    archived: {
        label: 'Archived',
        className: 'border-muted bg-muted/50 text-muted-foreground',
    },
} satisfies Record<
    ClassStatus,
    {
        label: string
        className: string
    }
>

export function classStatus(row: Row): ClassStatus {
    if (!row.start || !row.end || !row.day) return 'inactive'
    if (!row.section_id) return 'archived'
    return 'active'
}

function formatTime(value: string | null) {
    if (!value) return null
    // Accept "HH:mm" or "HH:mm:ss"
    const [hoursStr, minutesStr] = value.split(':')
    const hours = Number(hoursStr)
    const minutes = Number(minutesStr ?? '0')
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return value

    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = ((hours + 11) % 12) + 1
    const paddedMinutes = minutes.toString().padStart(2, '0')
    return `${hour12}:${paddedMinutes} ${period}`
}

export function formatSchedule(row: Row) {
    if (!row.day && !row.start && !row.end) return '-'
    const day = dayLabel(row.day)
    const start = formatTime(row.start)
    const end = formatTime(row.end)

    if (!start && !end) return day
    if (start && end) return `${day}, ${start} - ${end}`
    return `${day}${start ? `, ${start}` : ''}${end ? ` - ${end}` : ''}`
}
