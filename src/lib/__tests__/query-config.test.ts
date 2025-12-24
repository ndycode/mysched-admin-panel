import { describe, it, expect } from 'vitest'
import {
    STALE_TIME_REALTIME,
    STALE_TIME_TABLE,
    STALE_TIME_LOOKUP,
    STALE_TIME_REFERENCE,
    DEFAULT_QUERY_OPTIONS,
} from '../query-config'

describe('query-config', () => {
    describe('stale time constants', () => {
        it('STALE_TIME_REALTIME should be 0 for immediate refetch', () => {
            expect(STALE_TIME_REALTIME).toBe(0)
        })

        it('STALE_TIME_TABLE should be 30 seconds', () => {
            expect(STALE_TIME_TABLE).toBe(30_000)
        })

        it('STALE_TIME_LOOKUP should be 1 minute', () => {
            expect(STALE_TIME_LOOKUP).toBe(60_000)
        })

        it('STALE_TIME_REFERENCE should be 5 minutes', () => {
            expect(STALE_TIME_REFERENCE).toBe(5 * 60 * 1000)
        })

        it('stale times should be in ascending order', () => {
            expect(STALE_TIME_REALTIME).toBeLessThan(STALE_TIME_TABLE)
            expect(STALE_TIME_TABLE).toBeLessThan(STALE_TIME_LOOKUP)
            expect(STALE_TIME_LOOKUP).toBeLessThan(STALE_TIME_REFERENCE)
        })
    })

    describe('DEFAULT_QUERY_OPTIONS', () => {
        it('should disable refetchOnWindowFocus', () => {
            expect(DEFAULT_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false)
        })

        it('should retry once on failure', () => {
            expect(DEFAULT_QUERY_OPTIONS.retry).toBe(1)
        })
    })
})
