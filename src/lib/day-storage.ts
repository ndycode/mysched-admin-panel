import type { PostgrestError } from '@supabase/supabase-js'

import { DAY_ABBREVIATIONS, canonicalDay, canonicalDayNumber, type DayDbValue } from './days'

const DAY_ERROR_CODES = new Set([
  '22p02',
  '42804',
  '22007',
  '22008',
  '22018',
  '42846',
  '23514',
])

export function dayDbVariants(value: unknown): DayDbValue[] {
  const variants: DayDbValue[] = []

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed) {
      variants.push(trimmed as DayDbValue)
      variants.push(trimmed.toLowerCase() as DayDbValue)
      variants.push(trimmed.toUpperCase() as DayDbValue)
    }
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    variants.push(Math.trunc(value) as DayDbValue)
  }

  const canonical = canonicalDay(value)
  if (!canonical) {
    return dedupeDayVariants(variants)
  }

  variants.push(canonical as DayDbValue)
  variants.push(canonical.toLowerCase() as DayDbValue)
  variants.push(canonical.toUpperCase() as DayDbValue)

  const numeric = canonicalDayNumber(canonical)
  if (numeric) {
    variants.push(numeric)
  }

  const abbreviations = DAY_ABBREVIATIONS[canonical] ?? []
  for (const abbr of abbreviations) {
    variants.push(abbr as DayDbValue)
    variants.push(abbr.toLowerCase() as DayDbValue)
    variants.push(abbr.toUpperCase() as DayDbValue)
  }

  return dedupeDayVariants(variants)
}

function dedupeDayVariants(values: DayDbValue[]): DayDbValue[] {
  const seen = new Set<string>()
  const result: DayDbValue[] = []
  for (const value of values) {
    if (value == null) continue
    const key = typeof value === 'string' ? value : `#${value}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

export function isDayColumnError(error: unknown): error is PostgrestError {
  if (!error || typeof error !== 'object') return false

  const code = (error as { code?: string | null }).code
  if (code && DAY_ERROR_CODES.has(code.toLowerCase())) {
    return true
  }

  const message = ((error as { message?: string | null }).message ?? '').toLowerCase()
  const details = ((error as { details?: string | null }).details ?? '').toLowerCase()
  const hint = ((error as { hint?: string | null }).hint ?? '').toLowerCase()
  const combined = `${message} ${details} ${hint}`

  if (!combined) return false
  if (combined.includes('invalid input') && combined.includes('day')) return true
  if (combined.includes('enum') && combined.includes('day')) return true
  if (combined.includes('cannot cast') && combined.includes('day')) return true
  if (combined.includes('check constraint') && combined.includes('day')) return true
  if (combined.includes('column') && combined.includes('day') && combined.includes('type')) return true

  return false
}
