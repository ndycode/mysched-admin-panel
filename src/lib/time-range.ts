import { z } from 'zod'

type ParsedTime = {
  hour: number
  minute: number
  meridiem: 'am' | 'pm' | null
  explicitMeridiem: boolean
}

const TIME_NUMBER_RE = /^(\d{1,4})(?:\s*(am|pm|a|p))?$/i
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|a|p)?$/i

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return NaN
  if (hour < 0) return NaN
  if (hour > 24) return NaN
  return Math.trunc(hour)
}

function clampMinute(minute: number): number {
  if (!Number.isFinite(minute)) return NaN
  if (minute < 0) return NaN
  if (minute > 59) return NaN
  return Math.trunc(minute)
}

function normalizeMeridiem(value: string | undefined | null): 'am' | 'pm' | null {
  if (!value) return null
  const lower = value.toLowerCase().replaceAll('.', '')
  if (lower === 'am' || lower === 'a') return 'am'
  if (lower === 'pm' || lower === 'p') return 'pm'
  return null
}

function parseNumericTime(value: string): ParsedTime | null {
  const match = TIME_NUMBER_RE.exec(value)
  if (!match) return null
  const digits = match[1]
  const meridiem = normalizeMeridiem(match[2])

  let hour: number
  let minute: number

  if (digits.length <= 2) {
    hour = Number(digits)
    minute = 0
  } else if (digits.length === 3) {
    hour = Number(digits.slice(0, 1))
    minute = Number(digits.slice(1))
  } else {
    hour = Number(digits.slice(0, digits.length - 2))
    minute = Number(digits.slice(-2))
  }

  hour = clampHour(hour)
  minute = clampMinute(minute)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null

  return {
    hour,
    minute,
    meridiem,
    explicitMeridiem: meridiem !== null,
  }
}

function parseColonTime(value: string): ParsedTime | null {
  const match = TIME_RE.exec(value)
  if (!match) return null

  const hour = clampHour(Number(match[1]))
  const minute = clampMinute(match[2] ? Number(match[2]) : 0)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null

  const meridiem = normalizeMeridiem(match[3])

  return {
    hour,
    minute,
    meridiem,
    explicitMeridiem: meridiem !== null,
  }
}

function parseTime(value: string): ParsedTime | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  return parseColonTime(trimmed) ?? parseNumericTime(trimmed)
}

function applyMeridiem(time: ParsedTime, desired: 'am' | 'pm' | null): ParsedTime {
  if (desired === null) return time
  if (time.explicitMeridiem) return time
  return { ...time, meridiem: desired }
}

/**
 * Infers meridiem for academic schedules when not explicitly provided.
 * Academic schedules typically run 7:00 AM - 9:00 PM.
 *
 * Rules:
 * - Hours 1-6: assumed PM (afternoon/evening classes)
 * - Hours 7-11: assumed AM (morning classes)
 * - Hour 12: assumed PM (noon, not midnight)
 * - Hours 13-23: already 24-hour format, no inference needed
 */
function inferAcademicMeridiem(hour: number): 'am' | 'pm' | null {
  if (hour >= 1 && hour <= 6) return 'pm'
  if (hour >= 7 && hour <= 11) return 'am'
  if (hour === 12) return 'pm' // 12:00 is noon, not midnight
  return null // Already 24-hour format or midnight
}

function to24Hour(time: ParsedTime): string {
  let meridiem = time.meridiem
  let hour = clampHour(time.hour)
  const minute = clampMinute(time.minute)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    throw new Error('Invalid time components')
  }

  // If no explicit meridiem and hour is in 12-hour range, infer based on academic schedule
  if (meridiem === null && hour >= 1 && hour <= 12) {
    meridiem = inferAcademicMeridiem(hour)
  }

  if (meridiem === 'am') {
    hour = hour % 12
  } else if (meridiem === 'pm') {
    hour = hour % 12 + 12
  }

  const hh = hour.toString().padStart(2, '0')
  const mm = minute.toString().padStart(2, '0')
  return `${hh}:${mm}`
}

function combineTimes(
  start: ParsedTime,
  end: ParsedTime,
): { start: string; end: string } | null {
  let startTime = start
  let endTime = end

  if (start.meridiem && !end.explicitMeridiem) {
    endTime = applyMeridiem(end, start.meridiem)
  } else if (end.meridiem && !start.explicitMeridiem) {
    startTime = applyMeridiem(start, end.meridiem)
  }

  let start24 = to24Hour(startTime)
  const end24 = to24Hour(endTime)

  if (start24 >= end24) {
    if (!start.explicitMeridiem && end.explicitMeridiem && end.meridiem) {
      const flipped = applyMeridiem(start, end.meridiem === 'am' ? 'pm' : 'am')
      const candidate = to24Hour(flipped)
      if (candidate < end24) {
        startTime = flipped
        start24 = candidate
      }
    }
  }

  if (start24 >= end24) return null

  return { start: start24, end: end24 }
}

const RANGE_SPLIT_RE = /\s*(?:-|–|—|to)\s*/i

function cleanRangeInput(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s*(?:–|—)\s*/g, '-')
    .replace(/\s+to\s+/gi, '-')
    .replace(/\s+-\s+/g, '-')
    .trim()
}

export function parseTimeRange(value: string): { start: string; end: string } | null {
  if (!value) return null
  const cleaned = cleanRangeInput(value)
  if (!cleaned) return null

  const parts = cleaned.split(RANGE_SPLIT_RE).filter(Boolean)
  if (parts.length < 2) return null

  const start = parseTime(parts[0])
  const end = parseTime(parts[1])
  if (!start || !end) return null

  return combineTimes(start, end)
}

export function resolveTimeRange(
  input: {
    start?: string | null
    end?: string | null
    range?: string | null
  },
): { start: string; end: string } | null {
  const startInput = input.start?.trim()
  const endInput = input.end?.trim()
  const rangeInput = input.range?.trim()

  if (startInput && endInput) {
    const start = parseTime(startInput)
    const end = parseTime(endInput)
    if (!start || !end) return null
    return combineTimes(start, end)
  }

  if (rangeInput) {
    return parseTimeRange(rangeInput)
  }

  return null
}

export const TimeRangeSchema = z
  .object({
    start: z.string().trim().min(1),
    end: z.string().trim().min(1),
  })
  .strict()
