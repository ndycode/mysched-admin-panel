import { describe, it, expect } from 'vitest'
import { LENIS_OPTIONS, LENIS_DROPDOWN } from '../scroll-config'

describe('scroll-config', () => {
    describe('LENIS_OPTIONS', () => {
        it('should have lerp value', () => {
            expect(LENIS_OPTIONS.lerp).toBe(0.12)
        })

        it('should have duration value', () => {
            expect(LENIS_OPTIONS.duration).toBe(1.2)
        })

        it('should have smoothWheel enabled', () => {
            expect(LENIS_OPTIONS.smoothWheel).toBe(true)
        })

        it('should have wheelMultiplier value', () => {
            expect(LENIS_OPTIONS.wheelMultiplier).toBe(1.2)
        })

        it('lerp should be between 0 and 1', () => {
            expect(LENIS_OPTIONS.lerp).toBeGreaterThan(0)
            expect(LENIS_OPTIONS.lerp).toBeLessThan(1)
        })
    })

    describe('LENIS_DROPDOWN', () => {
        it('should have root set to false', () => {
            expect(LENIS_DROPDOWN.root).toBe(false)
        })

        it('should include LENIS_OPTIONS', () => {
            expect(LENIS_DROPDOWN.options).toEqual(LENIS_OPTIONS)
        })
    })
})
