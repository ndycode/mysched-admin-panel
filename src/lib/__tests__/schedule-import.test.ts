import { describe, it, expect } from 'vitest'
import {
  cleanText,
  normalizeSectionCode,
  toDowValue,
  parseUnitsValue,
  sanitizePreviewRow,
  compactPreviewRows,
  type SchedulePreviewRow,
} from '../schedule-import'

describe('schedule-import', () => {
  describe('cleanText', () => {
    it('returns null for null/undefined', () => {
      expect(cleanText(null)).toBeNull()
      expect(cleanText(undefined)).toBeNull()
    })

    it('returns null for non-strings', () => {
      expect(cleanText(123)).toBeNull()
      expect(cleanText({})).toBeNull()
      expect(cleanText([])).toBeNull()
    })

    it('returns null for empty or whitespace-only strings', () => {
      expect(cleanText('')).toBeNull()
      expect(cleanText('   ')).toBeNull()
      expect(cleanText('\n\t')).toBeNull()
    })

    it('collapses whitespace and newlines', () => {
      expect(cleanText('hello\n\nworld')).toBe('hello world')
      expect(cleanText('foo   bar   baz')).toBe('foo bar baz')
      expect(cleanText('  test  \r\n  value  ')).toBe('test value')
    })

    it('preserves normal text', () => {
      expect(cleanText('Hello World')).toBe('Hello World')
    })
  })

  describe('normalizeSectionCode', () => {
    it('returns null for non-strings', () => {
      expect(normalizeSectionCode(null)).toBeNull()
      expect(normalizeSectionCode(123)).toBeNull()
      expect(normalizeSectionCode(undefined)).toBeNull()
    })

    it('returns null for empty strings', () => {
      expect(normalizeSectionCode('')).toBeNull()
      expect(normalizeSectionCode('   ')).toBeNull()
    })

    it('removes section labels', () => {
      expect(normalizeSectionCode('Section: BSIT 2-1')).toBe('BSIT 2-1')
      expect(normalizeSectionCode('Section Code: CS 101')).toBe('CS 101')
      expect(normalizeSectionCode('section - abc')).toBe('ABC')
    })

    it('normalizes dashes and whitespace', () => {
      expect(normalizeSectionCode('BSIT\u20132-1')).toBe('BSIT-2-1') // en-dash
      expect(normalizeSectionCode('BSIT\u20142-1')).toBe('BSIT-2-1') // em-dash
      expect(normalizeSectionCode('CS  101 - A')).toBe('CS 101-A')
    })

    it('uppercases lowercase letters', () => {
      expect(normalizeSectionCode('bsit 2-1')).toBe('BSIT 2-1')
      expect(normalizeSectionCode('cs101a')).toBe('CS101A')
    })
  })

  describe('toDowValue', () => {
    it('returns nulls for invalid input', () => {
      expect(toDowValue(null)).toEqual({ code: null, label: null })
      expect(toDowValue('')).toEqual({ code: null, label: null })
      expect(toDowValue('invalid')).toEqual({ code: null, label: null })
    })

    it('parses full day names', () => {
      expect(toDowValue('Monday')).toEqual({ code: 'Mon', label: 'Monday' })
      expect(toDowValue('tuesday')).toEqual({ code: 'Tue', label: 'Tuesday' })
      expect(toDowValue('WEDNESDAY')).toEqual({ code: 'Wed', label: 'Wednesday' })
      expect(toDowValue('Thursday')).toEqual({ code: 'Thu', label: 'Thursday' })
      expect(toDowValue('Friday')).toEqual({ code: 'Fri', label: 'Friday' })
      expect(toDowValue('Saturday')).toEqual({ code: 'Sat', label: 'Saturday' })
      expect(toDowValue('Sunday')).toEqual({ code: 'Sun', label: 'Sunday' })
    })

    it('parses abbreviations', () => {
      expect(toDowValue('Mon')).toEqual({ code: 'Mon', label: 'Monday' })
      expect(toDowValue('Tue')).toEqual({ code: 'Tue', label: 'Tuesday' })
      expect(toDowValue('Wed')).toEqual({ code: 'Wed', label: 'Wednesday' })
      expect(toDowValue('Thu')).toEqual({ code: 'Thu', label: 'Thursday' })
      expect(toDowValue('Fri')).toEqual({ code: 'Fri', label: 'Friday' })
    })
  })

  describe('parseUnitsValue', () => {
    it('returns null for null/undefined', () => {
      expect(parseUnitsValue(null)).toEqual({ value: null })
      expect(parseUnitsValue(undefined)).toEqual({ value: null })
    })

    it('parses finite numbers', () => {
      expect(parseUnitsValue(3)).toEqual({ value: 3 })
      expect(parseUnitsValue(0)).toEqual({ value: 0 })
      expect(parseUnitsValue(1.5)).toEqual({ value: 1.5 })
    })

    it('returns warning for non-finite numbers', () => {
      const result = parseUnitsValue(Infinity)
      expect(result.value).toBeNull()
      expect(result.warning).toBeDefined()
    })

    it('parses string numbers', () => {
      expect(parseUnitsValue('3')).toEqual({ value: 3 })
      expect(parseUnitsValue('  2.5  ')).toEqual({ value: 2.5 })
      expect(parseUnitsValue('3 units')).toEqual({ value: 3 })
    })

    it('returns null for empty strings', () => {
      expect(parseUnitsValue('')).toEqual({ value: null })
      expect(parseUnitsValue('   ')).toEqual({ value: null })
    })

    it('returns warning for unparseable strings', () => {
      const result = parseUnitsValue('none')
      expect(result.value).toBeNull()
      expect(result.warning).toContain('Unable to parse')
    })

    it('returns warning for unsupported types', () => {
      const result = parseUnitsValue({})
      expect(result.value).toBeNull()
      expect(result.warning).toContain('Unsupported')
    })
  })

  describe('sanitizePreviewRow', () => {
    it('extracts and cleans all fields', () => {
      const warnings: string[] = []
      const row = sanitizePreviewRow(
        {
          day: '  Monday  ',
          start_time: '9:00',
          end_time: '10:30',
          code: 'CS101',
          title: 'Intro to CS',
          units: 3,
          room: 'Room 201',
          instructor_name: 'Dr. Smith',
        },
        warnings,
      )

      expect(row.day).toBe('Monday')
      expect(row.code).toBe('CS101')
      expect(row.title).toBe('Intro to CS')
      expect(row.units).toBe(3)
      expect(row.room).toBe('Room 201')
      expect(row.instructor_name).toBe('Dr. Smith')
    })

    it('handles alternative field names', () => {
      const warnings: string[] = []
      const row = sanitizePreviewRow(
        {
          Day: 'Tuesday',
          time_range: '14:00-15:30',
          instructor: 'Prof. Jones',
        },
        warnings,
      )

      expect(row.day).toBe('Tuesday')
      expect(row.time).toBe('14:00-15:30')
      expect(row.instructor_name).toBe('Prof. Jones')
    })

    it('adds warnings for unparseable units', () => {
      const warnings: string[] = []
      sanitizePreviewRow({ units: 'invalid' }, warnings)
      expect(warnings.length).toBeGreaterThan(0)
    })

    it('returns nulls for missing fields', () => {
      const warnings: string[] = []
      const row = sanitizePreviewRow({}, warnings)
      expect(row.day).toBeNull()
      expect(row.code).toBeNull()
      expect(row.title).toBeNull()
      expect(row.units).toBeNull()
      expect(row.room).toBeNull()
      expect(row.instructor_name).toBeNull()
    })
  })

  describe('compactPreviewRows', () => {
    it('removes completely empty rows', () => {
      const rows: SchedulePreviewRow[] = [
        { day: null, time: null, start: null, end: null, code: null, title: null, units: null, room: null, instructor_name: null },
        { day: 'Monday', time: null, start: null, end: null, code: 'CS101', title: null, units: null, room: null, instructor_name: null },
        { day: null, time: null, start: null, end: null, code: null, title: null, units: null, room: null, instructor_name: null },
      ]

      const result = compactPreviewRows(rows)
      expect(result).toHaveLength(1)
      expect(result[0].day).toBe('Monday')
      expect(result[0].code).toBe('CS101')
    })

    it('keeps rows with at least one non-null field', () => {
      const rows: SchedulePreviewRow[] = [
        { day: 'Tuesday', time: null, start: null, end: null, code: null, title: null, units: null, room: null, instructor_name: null },
        { day: null, time: '9:00-10:00', start: null, end: null, code: null, title: null, units: null, room: null, instructor_name: null },
        { day: null, time: null, start: null, end: null, code: 'CS102', title: null, units: null, room: null, instructor_name: null },
        { day: null, time: null, start: null, end: null, code: null, title: 'Math', units: null, room: null, instructor_name: null },
        { day: null, time: null, start: null, end: null, code: null, title: null, units: 3, room: null, instructor_name: null },
        { day: null, time: null, start: null, end: null, code: null, title: null, units: null, room: '101', instructor_name: null },
      ]

      const result = compactPreviewRows(rows)
      expect(result).toHaveLength(6)
    })

    it('returns empty array for all-empty rows', () => {
      const rows: SchedulePreviewRow[] = [
        { day: null, time: null, start: null, end: null, code: null, title: null, units: null, room: null, instructor_name: null },
      ]
      expect(compactPreviewRows(rows)).toHaveLength(0)
    })
  })
})
