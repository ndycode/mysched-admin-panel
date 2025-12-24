import { describe, it, expect } from 'vitest'
import {
  DAY_NAMES,
  DAY_NAME_BY_NUMBER,
  DAY_ABBREVIATIONS,
  DAY_SELECT_OPTIONS,
  canonicalDay,
  dayDbValue,
  canonicalDayNumber,
  dayLabel,
} from '../days'

describe('days', () => {
  describe('DAY_NAMES', () => {
    it('contains 7 days', () => {
      expect(DAY_NAMES).toHaveLength(7)
    })

    it('starts with Monday', () => {
      expect(DAY_NAMES[0]).toBe('Monday')
    })

    it('ends with Sunday', () => {
      expect(DAY_NAMES[6]).toBe('Sunday')
    })
  })

  describe('DAY_NAME_BY_NUMBER', () => {
    it('maps 1 to Monday', () => {
      expect(DAY_NAME_BY_NUMBER[1]).toBe('Monday')
    })

    it('maps 7 to Sunday', () => {
      expect(DAY_NAME_BY_NUMBER[7]).toBe('Sunday')
    })
  })

  describe('DAY_ABBREVIATIONS', () => {
    it('has abbreviations for Monday', () => {
      expect(DAY_ABBREVIATIONS.Monday).toContain('Mon')
      expect(DAY_ABBREVIATIONS.Monday).toContain('M')
    })

    it('has abbreviations for Thursday including R', () => {
      expect(DAY_ABBREVIATIONS.Thursday).toContain('R')
    })
  })

  describe('DAY_SELECT_OPTIONS', () => {
    it('has 7 options', () => {
      expect(DAY_SELECT_OPTIONS).toHaveLength(7)
    })

    it('has value and label properties', () => {
      expect(DAY_SELECT_OPTIONS[0]).toEqual({
        value: 'Monday',
        label: 'Monday',
      })
    })
  })

  describe('canonicalDay', () => {
    it('returns null for null', () => {
      expect(canonicalDay(null)).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(canonicalDay(undefined)).toBeNull()
    })

    it('handles full day names', () => {
      expect(canonicalDay('Monday')).toBe('Monday')
      expect(canonicalDay('TUESDAY')).toBe('Tuesday')
      expect(canonicalDay('wednesday')).toBe('Wednesday')
    })

    it('handles abbreviations', () => {
      expect(canonicalDay('mon')).toBe('Monday')
      expect(canonicalDay('tue')).toBe('Tuesday')
      expect(canonicalDay('wed')).toBe('Wednesday')
      expect(canonicalDay('thu')).toBe('Thursday')
      expect(canonicalDay('fri')).toBe('Friday')
    })

    it('handles single letter codes', () => {
      expect(canonicalDay('m')).toBe('Monday')
      expect(canonicalDay('t')).toBe('Tuesday')
      expect(canonicalDay('w')).toBe('Wednesday')
      expect(canonicalDay('r')).toBe('Thursday')
      expect(canonicalDay('f')).toBe('Friday')
    })

    it('handles numeric days', () => {
      expect(canonicalDay(1)).toBe('Monday')
      expect(canonicalDay(5)).toBe('Friday')
      expect(canonicalDay(7)).toBe('Sunday')
    })

    it('handles numeric strings', () => {
      expect(canonicalDay('1')).toBe('Monday')
      expect(canonicalDay('7')).toBe('Sunday')
    })

    it('returns null for invalid values', () => {
      expect(canonicalDay('notaday')).toBeNull()
      expect(canonicalDay(0)).toBeNull()
      expect(canonicalDay(8)).toBeNull()
      expect(canonicalDay('')).toBeNull()
      expect(canonicalDay('   ')).toBeNull()
    })

    it('handles whitespace', () => {
      expect(canonicalDay('  Monday  ')).toBe('Monday')
    })

    it('returns null for non-string non-number', () => {
      expect(canonicalDay({})).toBeNull()
      expect(canonicalDay([])).toBeNull()
    })

    it('handles non-finite numbers', () => {
      expect(canonicalDay(Infinity)).toBeNull()
      expect(canonicalDay(NaN)).toBeNull()
    })

    it('truncates decimal numbers', () => {
      expect(canonicalDay(1.9)).toBe('Monday')
      expect(canonicalDay(2.1)).toBe('Tuesday')
    })
  })

  describe('dayDbValue', () => {
    it('returns lowercase canonical day', () => {
      expect(dayDbValue('Monday')).toBe('monday')
      expect(dayDbValue('FRIDAY')).toBe('friday')
    })

    it('returns null for invalid input', () => {
      expect(dayDbValue(null)).toBeNull()
      expect(dayDbValue('invalid')).toBeNull()
    })
  })

  describe('canonicalDayNumber', () => {
    it('returns numeric day from string', () => {
      expect(canonicalDayNumber('Monday')).toBe(1)
      expect(canonicalDayNumber('Sunday')).toBe(7)
    })

    it('returns numeric day from number', () => {
      expect(canonicalDayNumber(3)).toBe(3)
    })

    it('returns null for invalid input', () => {
      expect(canonicalDayNumber(null)).toBeNull()
      expect(canonicalDayNumber('invalid')).toBeNull()
    })
  })

  describe('dayLabel', () => {
    it('returns canonical day name for valid input', () => {
      expect(dayLabel('mon')).toBe('Monday')
      expect(dayLabel(1)).toBe('Monday')
    })

    it('returns formatted string for invalid numeric', () => {
      expect(dayLabel(99)).toBe('Day 99')
    })

    it('returns original string for unknown string', () => {
      expect(dayLabel('custom')).toBe('custom')
    })

    it('returns dash for empty/null values', () => {
      expect(dayLabel(null)).toBe('—')
      expect(dayLabel('')).toBe('—')
      expect(dayLabel('   ')).toBe('—')
    })

    it('handles non-finite numbers', () => {
      expect(dayLabel(NaN)).toBe('—')
      expect(dayLabel(Infinity)).toBe('—')
    })
  })
})
