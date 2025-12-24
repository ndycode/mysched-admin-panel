import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { extractStatus, validationDetails } from '../api-error'

describe('api-error', () => {
    describe('extractStatus', () => {
        it('should extract status from error object', () => {
            const error = { status: 404 }
            expect(extractStatus(error)).toBe(404)
        })

        it('should return null for non-numeric status', () => {
            const error = { status: 'not-a-number' }
            expect(extractStatus(error)).toBeNull()
        })

        it('should return null for null error', () => {
            expect(extractStatus(null)).toBeNull()
        })

        it('should return null for undefined error', () => {
            expect(extractStatus(undefined)).toBeNull()
        })

        it('should return null for error without status', () => {
            const error = { message: 'some error' }
            expect(extractStatus(error)).toBeNull()
        })

        it('should return null for non-finite status', () => {
            const error = { status: Infinity }
            expect(extractStatus(error)).toBeNull()
        })

        it('should handle status code 500', () => {
            const error = { status: 500 }
            expect(extractStatus(error)).toBe(500)
        })

        it('should handle status code 200', () => {
            const error = { status: 200 }
            expect(extractStatus(error)).toBe(200)
        })
    })

    describe('validationDetails', () => {
        it('should extract message from ZodError', () => {
            const schema = z.object({
                name: z.string().min(1, 'Name is required'),
            })
            const result = schema.safeParse({ name: '' })
            if (!result.success) {
                const details = validationDetails(result.error)
                expect(details.message).toContain('Name is required')
                expect(details.issues.length).toBeGreaterThan(0)
            }
        })

        it('should combine multiple field errors', () => {
            const schema = z.object({
                name: z.string().min(1, 'Name required'),
                email: z.string().email('Invalid email'),
            })
            const result = schema.safeParse({ name: '', email: 'bad' })
            if (!result.success) {
                const details = validationDetails(result.error)
                expect(details.message).toContain('Name required')
                expect(details.message).toContain('Invalid email')
            }
        })

        it('should return default message if no errors', () => {
            const emptyError = new z.ZodError([])
            const details = validationDetails(emptyError)
            expect(details.message).toBe('Invalid request payload.')
        })

        it('should include issues array', () => {
            const schema = z.object({
                id: z.number(),
            })
            const result = schema.safeParse({ id: 'string' })
            if (!result.success) {
                const details = validationDetails(result.error)
                expect(Array.isArray(details.issues)).toBe(true)
                expect(details.issues.length).toBeGreaterThan(0)
            }
        })
    })
})
