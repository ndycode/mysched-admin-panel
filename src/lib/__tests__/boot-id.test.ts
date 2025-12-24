import { describe, it, expect } from 'vitest'
import { BOOT_ID, BOOT_COOKIE } from '../boot-id'

describe('boot-id', () => {
    describe('BOOT_ID', () => {
        it('should be a non-empty string', () => {
            expect(typeof BOOT_ID).toBe('string')
            expect(BOOT_ID.length).toBeGreaterThan(0)
        })

        it('should be alphanumeric', () => {
            expect(BOOT_ID).toMatch(/^[a-z0-9]+$/i)
        })
    })

    describe('BOOT_COOKIE', () => {
        it('should be x-boot', () => {
            expect(BOOT_COOKIE).toBe('x-boot')
        })
    })
})
