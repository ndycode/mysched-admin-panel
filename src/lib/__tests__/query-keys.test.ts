import { describe, it, expect } from 'vitest'
import { QUERY_KEYS } from '../query-keys'

describe('query-keys', () => {
    describe('QUERY_KEYS base keys', () => {
        it('should have CLASSES key', () => {
            expect(QUERY_KEYS.CLASSES).toEqual(['classes'])
        })

        it('should have SECTIONS key', () => {
            expect(QUERY_KEYS.SECTIONS).toEqual(['sections'])
        })

        it('should have USERS key', () => {
            expect(QUERY_KEYS.USERS).toEqual(['users'])
        })

        it('should have INSTRUCTORS key', () => {
            expect(QUERY_KEYS.INSTRUCTORS).toEqual(['instructors'])
        })

        it('should have SEMESTERS key', () => {
            expect(QUERY_KEYS.SEMESTERS).toEqual(['semesters'])
        })

        it('should have AUDIT key', () => {
            expect(QUERY_KEYS.AUDIT).toEqual(['audit'])
        })

        it('should have NOTIFICATIONS key', () => {
            expect(QUERY_KEYS.NOTIFICATIONS).toEqual(['notifications'])
        })
    })

    describe('QUERY_KEYS table keys', () => {
        it('should have CLASSES_TABLE key', () => {
            expect(QUERY_KEYS.CLASSES_TABLE).toEqual(['classes', 'table'])
        })

        it('should have SECTIONS_TABLE key', () => {
            expect(QUERY_KEYS.SECTIONS_TABLE).toEqual(['sections', 'table'])
        })

        it('should have USERS_TABLE key', () => {
            expect(QUERY_KEYS.USERS_TABLE).toEqual(['users', 'table'])
        })

        it('should have INSTRUCTORS_TABLE key', () => {
            expect(QUERY_KEYS.INSTRUCTORS_TABLE).toEqual(['instructors', 'table'])
        })
    })

    describe('QUERY_KEYS options keys', () => {
        it('should have SECTIONS_OPTIONS key', () => {
            expect(QUERY_KEYS.SECTIONS_OPTIONS).toEqual(['sections', 'options'])
        })

        it('should have SEMESTERS_OPTIONS key', () => {
            expect(QUERY_KEYS.SEMESTERS_OPTIONS).toEqual(['semesters', 'options'])
        })

        it('should have INSTRUCTORS_OPTIONS key', () => {
            expect(QUERY_KEYS.INSTRUCTORS_OPTIONS).toEqual(['instructors', 'options'])
        })
    })

    describe('QUERY_KEYS detail function', () => {
        it('CLASSES_DETAIL should include id in key', () => {
            const key = QUERY_KEYS.CLASSES_DETAIL(123)
            expect(key).toEqual(['classes', 'detail', 123])
        })

        it('CLASSES_DETAIL should work with string id', () => {
            const key = QUERY_KEYS.CLASSES_DETAIL('abc')
            expect(key).toEqual(['classes', 'detail', 'abc'])
        })
    })

    describe('QUERY_KEYS dashboard', () => {
        it('should have DASHBOARD_STATS key', () => {
            expect(QUERY_KEYS.DASHBOARD_STATS).toEqual(['dashboard', 'stats'])
        })
    })

    describe('QUERY_KEYS audit', () => {
        it('should have AUDIT_RECENT key', () => {
            expect(QUERY_KEYS.AUDIT_RECENT).toEqual(['audit', 'recent'])
        })
    })
})
