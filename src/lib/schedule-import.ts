import { canonicalDay, DAY_ABBREVIATIONS, type DayValue } from './days'
import { resolveTimeRange } from './time-range'

export type SchedulePreviewRow = {
  day: string | null
  time: string | null
  start: string | null
  end: string | null
  code: string | null
  title: string | null
  units: number | null
  room: string | null
  instructor_name: string | null
  matched_instructor?: { id: string; full_name: string } | null
}

export function cleanText(value: unknown): string | null {
  if (value == null) return null
  if (typeof value !== 'string') return null
  const collapsed = value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  return collapsed.length > 0 ? collapsed : null
}

export function normalizeSectionCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const withoutLabel = value.replace(/section\s*(?:code)?\s*[:\-]/i, ' ')
  const normalized = withoutLabel
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+-\s+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return null
  return normalized.replace(/[a-z]+/g, segment => segment.toUpperCase())
}

function firstAbbreviation(day: DayValue): string {
  const options = DAY_ABBREVIATIONS[day]
  if (options && options.length > 0) return options[0]
  return day.slice(0, 3)
}

export function toDowValue(value: unknown): { code: string | null; label: string | null } {
  const canonical = canonicalDay(value)
  if (!canonical) return { code: null, label: null }
  return { code: firstAbbreviation(canonical), label: canonical }
}

export function parseUnitsValue(value: unknown): { value: number | null; warning?: string } {
  if (value == null) return { value: null }
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return { value }
    return { value: null, warning: 'Units value is not a finite number.' }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return { value: null }
    const match = trimmed.match(/-?\d+(?:\.\d+)?/)
    if (!match) {
      return { value: null, warning: `Unable to parse units from "${trimmed}".` }
    }
    const parsed = Number(match[0])
    if (!Number.isFinite(parsed)) {
      return { value: null, warning: `Units value "${match[0]}" is not a number.` }
    }
    return { value: parsed }
  }
  return { value: null, warning: `Unsupported units value: ${String(value)}` }
}

export function sanitizePreviewRow(
  row: Partial<Record<string, unknown>>,
  warnings: string[],
): SchedulePreviewRow {
  const day = cleanText(row.day ?? row.Day)
  const time = cleanText((row.time_range ?? row.timeRange ?? row.time) as unknown)
  let start = cleanText(row.start ?? row.start_time)
  let end = cleanText(row.end ?? row.end_time)
  const code = cleanText(row.code)
  const title = cleanText(row.title)
  const room = cleanText(row.room)
  const instructor_name = cleanText(row.instructor_name ?? row.instructor)
  const unitsResult = parseUnitsValue(row.units)
  if (unitsResult.warning) warnings.push(unitsResult.warning)

  // Normalize times using academic schedule inference
  // This handles ambiguous times like "2:00" → "14:00" (2 PM)
  const resolved = resolveTimeRange({ start, end, range: time })
  if (resolved) {
    start = resolved.start
    end = resolved.end
  } else if (start || end || time) {
    // If we have time data but couldn't parse it, add a warning
    const timeInfo = time ?? `${start ?? ''}-${end ?? ''}`
    warnings.push(`Could not parse time "${timeInfo}".`)
  }

  return {
    day,
    time,
    start,
    end,
    code,
    title,
    units: unitsResult.value,
    room,
    instructor_name,
  }
}

export function compactPreviewRows(rows: SchedulePreviewRow[]): SchedulePreviewRow[] {
  return rows.filter(row => {
    return (
      row.day !== null ||
      row.time !== null ||
      row.code !== null ||
      row.title !== null ||
      row.units !== null ||
      row.room !== null
    )
  })
}
