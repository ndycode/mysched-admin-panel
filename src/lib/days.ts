export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export type DayValue = (typeof DAY_NAMES)[number]
export type DayNumeric = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type DayDbValue = string | DayNumeric

export const DAY_NAME_BY_NUMBER: Record<number, DayValue> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

const DAY_NUMBER_BY_NAME: Record<DayValue, DayNumeric> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
}

const DAY_ALIASES = [
  ['m', 'Monday'],
  ['mon', 'Monday'],
  ['t', 'Tuesday'],
  ['tu', 'Tuesday'],
  ['tue', 'Tuesday'],
  ['tues', 'Tuesday'],
  ['w', 'Wednesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['thur', 'Thursday'],
  ['thurs', 'Thursday'],
  ['th', 'Thursday'],
  ['r', 'Thursday'],
  ['f', 'Friday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sa', 'Saturday'],
  ['sun', 'Sunday'],
  ['su', 'Sunday'],
] as const satisfies ReadonlyArray<readonly [string, DayValue]>

const DAY_LOOKUP = new Map<string, DayValue>([
  ...DAY_NAMES.map<[string, DayValue]>(name => [name.toLowerCase(), name]),
  ...DAY_ALIASES,
])

export const DAY_ABBREVIATIONS: Record<DayValue, readonly string[]> = {
  Monday: ['Mon', 'M'],
  Tuesday: ['Tue', 'Tues', 'Tu', 'T'],
  Wednesday: ['Wed', 'W'],
  Thursday: ['Thu', 'Thur', 'Th', 'R'],
  Friday: ['Fri', 'F'],
  Saturday: ['Sat', 'Sa'],
  Sunday: ['Sun', 'Su'],
}

export const DAY_SELECT_OPTIONS = DAY_NAMES.map(name => ({
  value: name as DayValue,
  label: name,
}))

export function canonicalDay(value: unknown): DayValue | null {
  if (value == null) return null

  if (typeof value === 'number' && Number.isFinite(value)) {
    const mapped = DAY_NAME_BY_NUMBER[Math.trunc(value)]
    return mapped ?? null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const numeric = Number(trimmed)
    if (Number.isInteger(numeric)) {
      const mapped = DAY_NAME_BY_NUMBER[numeric]
      if (mapped) return mapped
    }

    const lowered = trimmed.toLowerCase()
    return DAY_LOOKUP.get(lowered) ?? null
  }

  return null
}

export function dayDbValue(value: unknown): DayDbValue | null {
  const canonical = canonicalDay(value)
  if (!canonical) return null
  return canonical.toLowerCase() as DayDbValue
}

export function canonicalDayNumber(value: unknown): DayNumeric | null {
  const canonical = canonicalDay(value)
  if (!canonical) return null
  return DAY_NUMBER_BY_NAME[canonical] ?? null
}

export function dayLabel(value: unknown): string {
  const canonical = canonicalDay(value)
  if (canonical) return canonical

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `Day ${Math.trunc(value)}`
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return '—'
}
