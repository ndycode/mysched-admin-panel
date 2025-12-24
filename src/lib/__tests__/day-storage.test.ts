import { describe, it, expect } from 'vitest'
import { dayDbVariants, isDayColumnError } from '../day-storage'

describe('day-storage', () => {
  describe('dayDbVariants', () => {
    it('returns empty array for null/undefined', () => {
      expect(dayDbVariants(null)).toEqual([])
      expect(dayDbVariants(undefined)).toEqual([])
    })

    it('returns variants for valid day string', () => {
      const variants = dayDbVariants('Monday')
      expect(variants).toContain('Monday')
      expect(variants).toContain('monday')
      expect(variants).toContain('MONDAY')
      expect(variants).toContain('Mon')
      expect(variants).toContain('M')
      expect(variants).toContain(1)
    })

    it('returns variants for lowercase day', () => {
      const variants = dayDbVariants('friday')
      expect(variants).toContain('Friday')
      expect(variants).toContain('friday')
      expect(variants).toContain('FRIDAY')
      expect(variants).toContain('Fri')
    })

    it('returns variants for abbreviation', () => {
      const variants = dayDbVariants('wed')
      expect(variants).toContain('Wednesday')
      expect(variants).toContain('wednesday')
      expect(variants).toContain('Wed')
    })

    it('handles numeric input', () => {
      const variants = dayDbVariants(1)
      expect(variants).toContain(1)
      expect(variants).toContain('Monday')
      expect(variants).toContain('monday')
    })

    it('returns variants for unknown string (without canonical)', () => {
      const variants = dayDbVariants('notaday')
      expect(variants).toContain('notaday')
      expect(variants).toContain('NOTADAY')
      expect(variants.length).toBeGreaterThan(0)
    })

    it('deduplicates variants', () => {
      const variants = dayDbVariants('Monday')
      const uniqueCheck = new Set(variants.map(v => typeof v === 'string' ? v : `#${v}`))
      expect(uniqueCheck.size).toBe(variants.length)
    })

    it('handles empty string', () => {
      const variants = dayDbVariants('')
      expect(variants).toEqual([])
    })

    it('handles whitespace-only string', () => {
      const variants = dayDbVariants('   ')
      expect(variants).toEqual([])
    })
  })

  describe('isDayColumnError', () => {
    it('returns false for null/undefined', () => {
      expect(isDayColumnError(null)).toBe(false)
      expect(isDayColumnError(undefined)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isDayColumnError('error')).toBe(false)
      expect(isDayColumnError(123)).toBe(false)
    })

    it('returns true for known error codes', () => {
      expect(isDayColumnError({ code: '22p02' })).toBe(true)
      expect(isDayColumnError({ code: '42804' })).toBe(true)
      expect(isDayColumnError({ code: '22007' })).toBe(true)
      expect(isDayColumnError({ code: '23514' })).toBe(true)
    })

    it('handles uppercase error codes', () => {
      expect(isDayColumnError({ code: '22P02' })).toBe(true)
    })

    it('returns true for invalid input day message', () => {
      expect(isDayColumnError({ message: 'invalid input for day column' })).toBe(true)
    })

    it('returns true for enum day error', () => {
      expect(isDayColumnError({ message: 'invalid enum value for day' })).toBe(true)
    })

    it('returns true for cannot cast day error', () => {
      expect(isDayColumnError({ details: 'cannot cast to day type' })).toBe(true)
    })

    it('returns true for check constraint day error', () => {
      expect(isDayColumnError({ hint: 'check constraint failed for day' })).toBe(true)
    })

    it('returns true for column type day error', () => {
      expect(isDayColumnError({ message: 'column day has wrong type' })).toBe(true)
    })

    it('returns false for unrelated errors', () => {
      expect(isDayColumnError({ code: 'UNKNOWN', message: 'some other error' })).toBe(false)
    })

    it('returns false for empty error object', () => {
      expect(isDayColumnError({})).toBe(false)
    })

    it('handles null message/details/hint', () => {
      expect(isDayColumnError({ code: null, message: null, details: null, hint: null })).toBe(false)
    })
  })
})
