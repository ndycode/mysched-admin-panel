import { describe, it, expect } from 'vitest'
import { normalizeTimeValue, parseSectionCoursePrefix } from '../form-utils'

describe('form-utils', () => {
    describe('normalizeTimeValue', () => {
        it('should return empty string for null', () => {
            expect(normalizeTimeValue(null)).toBe('')
        })

        it('should return empty string for undefined', () => {
            expect(normalizeTimeValue(undefined)).toBe('')
        })

        it('should return empty string for empty string', () => {
            expect(normalizeTimeValue('')).toBe('')
        })

        it('should return empty string for whitespace only', () => {
            expect(normalizeTimeValue('   ')).toBe('')
        })

        it('should normalize 24-hour format', () => {
            expect(normalizeTimeValue('09:30')).toBe('09:30')
            expect(normalizeTimeValue('14:00')).toBe('14:00')
        })

        it('should normalize single digit hours', () => {
            expect(normalizeTimeValue('9:30')).toBe('09:30')
        })

        it('should handle seconds in time', () => {
            expect(normalizeTimeValue('09:30:45')).toBe('09:30')
        })

        it('should handle microseconds in time', () => {
            expect(normalizeTimeValue('09:30:45.123456')).toBe('09:30')
        })

        it('should convert 12-hour AM format', () => {
            expect(normalizeTimeValue('9:30 AM')).toBe('09:30')
            expect(normalizeTimeValue('9:30am')).toBe('09:30')
        })

        it('should convert 12-hour PM format', () => {
            expect(normalizeTimeValue('2:30 PM')).toBe('14:30')
            expect(normalizeTimeValue('2:30pm')).toBe('14:30')
        })

        it('should handle 12:00 PM as noon', () => {
            expect(normalizeTimeValue('12:00 PM')).toBe('12:00')
        })

        it('should handle 12:00 AM as midnight', () => {
            expect(normalizeTimeValue('12:00 AM')).toBe('00:00')
        })

        it('should return original value for invalid format', () => {
            expect(normalizeTimeValue('invalid')).toBe('invalid')
        })
    })

    describe('parseSectionCoursePrefix', () => {
        it('should extract prefix from valid section code', () => {
            expect(parseSectionCoursePrefix('BSIT 1-1')).toBe('BSIT')
            expect(parseSectionCoursePrefix('ACT 2-1')).toBe('ACT')
            expect(parseSectionCoursePrefix('BSCS 3-2')).toBe('BSCS')
        })

        it('should return Other for null', () => {
            expect(parseSectionCoursePrefix(null)).toBe('Other')
        })

        it('should return Other for invalid format', () => {
            expect(parseSectionCoursePrefix('invalid')).toBe('Other')
            expect(parseSectionCoursePrefix('BSIT')).toBe('Other')
        })

        it('should handle multi-word prefixes', () => {
            expect(parseSectionCoursePrefix('BS IT 1-1')).toBe('BS IT')
        })

        it('should trim whitespace from prefix', () => {
            expect(parseSectionCoursePrefix('BSIT  1-1')).toBe('BSIT')
        })
    })
})
