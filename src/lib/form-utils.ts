/**
 * Shared form utility functions
 */

/**
 * Normalize time values to HH:MM format
 * Handles various input formats including 12-hour with AM/PM
 */
export function normalizeTimeValue(value: string | null | undefined): string {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d{1,6})?)?(?:\s*([ap]m))?$/i)
    if (!match) return trimmed
    let hours = Number(match[1])
    const minutes = match[2]
    const meridiem = match[3]?.toLowerCase()
    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0
    const hoursStr = hours.toString().padStart(2, '0')
    return `${hoursStr}:${minutes}`
}

/**
 * Parse a section code to extract course prefix
 * Example: "BSIT 1-1" → "BSIT", "ACT 2-1" → "ACT"
 */
export function parseSectionCoursePrefix(code: string | null): string {
    if (!code) return 'Other'
    const match = code.match(/^(.+?)\s+(\d+-\d+)$/)
    return match ? match[1].trim() : 'Other'
}
