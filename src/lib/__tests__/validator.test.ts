/**
 * Validator tests - Zod schemas and helpers
 */
import { describe, test, expect } from 'vitest'
import { SectionSchema, ClassCreateSchema, ClassPatchSchema, issues, timeRe } from '../validator'
import { ZodError } from 'zod'

describe('timeRe regex', () => {
  test('matches valid 24-hour time formats', () => {
    expect(timeRe.test('00:00')).toBe(true)
    expect(timeRe.test('09:30')).toBe(true)
    expect(timeRe.test('12:00')).toBe(true)
    expect(timeRe.test('23:59')).toBe(true)
    expect(timeRe.test('14:45')).toBe(true)
  })

  test('rejects invalid time formats', () => {
    expect(timeRe.test('24:00')).toBe(false)
    expect(timeRe.test('25:00')).toBe(false)
    expect(timeRe.test('12:60')).toBe(false)
    expect(timeRe.test('9:30')).toBe(false)  // missing leading zero
    expect(timeRe.test('12:5')).toBe(false)  // missing trailing zero
    expect(timeRe.test('12')).toBe(false)
    expect(timeRe.test('')).toBe(false)
    expect(timeRe.test('noon')).toBe(false)
  })
})

describe('SectionSchema', () => {
  test('validates correct section', () => {
    const result = SectionSchema.safeParse({ code: 'CS101' })
    expect(result.success).toBe(true)
  })

  test('trims whitespace from code', () => {
    const result = SectionSchema.safeParse({ code: '  CS101  ' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('CS101')
    }
  })

  test('rejects empty code', () => {
    const result = SectionSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })

  test('rejects code with only whitespace', () => {
    const result = SectionSchema.safeParse({ code: '   ' })
    expect(result.success).toBe(false)
  })

  test('rejects code over 40 characters', () => {
    const result = SectionSchema.safeParse({ code: 'A'.repeat(41) })
    expect(result.success).toBe(false)
  })
})

describe('ClassCreateSchema', () => {
  const validClass = {
    title: 'Introduction to Programming',
    code: 'CS101',
    section_id: 1,
    start: '09:00',
    end: '10:30',
  }

  test('validates a minimal valid class', () => {
    const result = ClassCreateSchema.safeParse(validClass)
    expect(result.success).toBe(true)
  })

  test('validates a full class with all optional fields', () => {
    const fullClass = {
      ...validClass,
      day: 1,
      units: 3,
      room: 'Room 101',
      instructor: 'Dr. Smith',
    }
    const result = ClassCreateSchema.safeParse(fullClass)
    expect(result.success).toBe(true)
  })

  test('rejects missing title', () => {
    const { title: _, ...noTitle } = validClass
    const result = ClassCreateSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  test('rejects empty title', () => {
    const result = ClassCreateSchema.safeParse({ ...validClass, title: '' })
    expect(result.success).toBe(false)
  })

  test('rejects title over 120 characters', () => {
    const result = ClassCreateSchema.safeParse({ ...validClass, title: 'A'.repeat(121) })
    expect(result.success).toBe(false)
  })

  test('rejects invalid time format for start', () => {
    const result = ClassCreateSchema.safeParse({ ...validClass, start: 'invalid' })
    expect(result.success).toBe(false)
  })

  test('rejects invalid time format for end', () => {
    const result = ClassCreateSchema.safeParse({ ...validClass, end: '25:00' })
    expect(result.success).toBe(false)
  })

  test('rejects end time before start time', () => {
    const result = ClassCreateSchema.safeParse({
      ...validClass,
      start: '14:00',
      end: '10:00',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const endError = result.error.issues.find(i => i.path.includes('end'))
      expect(endError?.message).toContain('End time must be after start time')
    }
  })

  test('rejects end time equal to start time', () => {
    const result = ClassCreateSchema.safeParse({
      ...validClass,
      start: '10:00',
      end: '10:00',
    })
    expect(result.success).toBe(false)
  })

  test('validates day between 1 and 7', () => {
    expect(ClassCreateSchema.safeParse({ ...validClass, day: 1 }).success).toBe(true)
    expect(ClassCreateSchema.safeParse({ ...validClass, day: 7 }).success).toBe(true)
    expect(ClassCreateSchema.safeParse({ ...validClass, day: 0 }).success).toBe(false)
    expect(ClassCreateSchema.safeParse({ ...validClass, day: 8 }).success).toBe(false)
  })

  test('validates units between 0 and 12', () => {
    expect(ClassCreateSchema.safeParse({ ...validClass, units: 0 }).success).toBe(true)
    expect(ClassCreateSchema.safeParse({ ...validClass, units: 12 }).success).toBe(true)
    expect(ClassCreateSchema.safeParse({ ...validClass, units: -1 }).success).toBe(false)
    expect(ClassCreateSchema.safeParse({ ...validClass, units: 13 }).success).toBe(false)
  })

  test('coerces string section_id to number', () => {
    const result = ClassCreateSchema.safeParse({ ...validClass, section_id: '5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.section_id).toBe(5)
    }
  })

  test('rejects non-positive section_id', () => {
    expect(ClassCreateSchema.safeParse({ ...validClass, section_id: 0 }).success).toBe(false)
    expect(ClassCreateSchema.safeParse({ ...validClass, section_id: -1 }).success).toBe(false)
  })
})

describe('ClassPatchSchema', () => {
  test('allows partial updates', () => {
    const result = ClassPatchSchema.safeParse({ title: 'New Title' })
    expect(result.success).toBe(true)
  })

  test('rejects empty updates', () => {
    const result = ClassPatchSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Nothing to update')
    }
  })

  test('validates partial time updates', () => {
    const result = ClassPatchSchema.safeParse({ start: '10:00' })
    expect(result.success).toBe(true)
  })
})

describe('issues helper', () => {
  test('extracts issues from ZodError', () => {
    const result = SectionSchema.safeParse({ code: '' })
    if (!result.success) {
      const extracted = issues(result.error)
      expect(extracted.length).toBeGreaterThan(0)
      expect(extracted[0]).toHaveProperty('path')
      expect(extracted[0]).toHaveProperty('message')
    }
  })

  test('returns generic error for non-ZodError', () => {
    const extracted = issues(new Error('Random error'))
    expect(extracted).toEqual([{ path: '', message: 'Unexpected error' }])
  })

  test('returns generic error for null/undefined', () => {
    expect(issues(null)).toEqual([{ path: '', message: 'Unexpected error' }])
    expect(issues(undefined)).toEqual([{ path: '', message: 'Unexpected error' }])
  })

  test('handles nested paths', () => {
    // Create a schema with nested paths
    const schema = ClassCreateSchema
    const result = schema.safeParse({
      title: 'Test',
      code: 'CS101',
      section_id: 1,
      start: '14:00',
      end: '10:00', // Invalid - before start
    })
    if (!result.success) {
      const extracted = issues(result.error)
      const endIssue = extracted.find(i => i.path === 'end')
      expect(endIssue).toBeDefined()
    }
  })
})
