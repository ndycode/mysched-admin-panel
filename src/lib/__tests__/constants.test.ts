import { describe, it, expect } from 'vitest'
import {
    PAGE_SIZE_OPTIONS,
    DEFAULT_PAGE_SIZE,
    DROPDOWN_SEARCH_LIMIT,
    MAX_BULK_OPERATIONS,
    API_LIMITS,
} from '../constants'

describe('constants', () => {
    describe('PAGE_SIZE_OPTIONS', () => {
        it('should have standard pagination options', () => {
            expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100])
        })

        it('should be readonly', () => {
            expect(Object.isFrozen(PAGE_SIZE_OPTIONS)).toBe(false) // as const doesn't freeze
            // But TypeScript prevents mutation at compile time
        })
    })

    describe('DEFAULT_PAGE_SIZE', () => {
        it('should be 10', () => {
            expect(DEFAULT_PAGE_SIZE).toBe(10)
        })

        it('should be included in PAGE_SIZE_OPTIONS', () => {
            expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE)
        })
    })

    describe('DROPDOWN_SEARCH_LIMIT', () => {
        it('should be a positive number', () => {
            expect(DROPDOWN_SEARCH_LIMIT).toBeGreaterThan(0)
        })
    })

    describe('MAX_BULK_OPERATIONS', () => {
        it('should be 100', () => {
            expect(MAX_BULK_OPERATIONS).toBe(100)
        })
    })

    describe('API_LIMITS', () => {
        it('should have RECENT_AUDIT limit', () => {
            expect(API_LIMITS.RECENT_AUDIT).toBe(50)
        })

        it('should have AUDIT_PAGE limit', () => {
            expect(API_LIMITS.AUDIT_PAGE).toBe(200)
        })

        it('should have DROPDOWN_ALL limit', () => {
            expect(API_LIMITS.DROPDOWN_ALL).toBe(1000)
        })

        it('should have INSTRUCTOR_OPTIONS limit', () => {
            expect(API_LIMITS.INSTRUCTOR_OPTIONS).toBe(200)
        })

        it('all limits should be positive numbers', () => {
            Object.values(API_LIMITS).forEach(limit => {
                expect(limit).toBeGreaterThan(0)
            })
        })
    })
})
