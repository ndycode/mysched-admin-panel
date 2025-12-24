import { describe, it, expect } from 'vitest'
import { normalizeErrorResponse, normalizeApiError } from '../api-error-client'

describe('api-error-client', () => {
    describe('normalizeErrorResponse', () => {
        it('should extract message from payload', () => {
            const result = normalizeErrorResponse({ message: 'Test error' })
            expect(result.message).toBe('Test error')
        })

        it('should extract error_message from payload', () => {
            const result = normalizeErrorResponse({ error_message: 'Error msg' })
            expect(result.message).toBe('Error msg')
        })

        it('should extract error from payload', () => {
            const result = normalizeErrorResponse({ error: 'An error' })
            expect(result.message).toBe('An error')
        })

        it('should use status code when no message', () => {
            const result = normalizeErrorResponse({}, 404)
            expect(result.message).toBe('Request failed with status 404')
        })

        it('should return default message when no info', () => {
            const result = normalizeErrorResponse({})
            expect(result.message).toBe('Request failed')
        })

        it('should extract code from payload', () => {
            const result = normalizeErrorResponse({ message: 'err', code: 'ERR_CODE' })
            expect(result.code).toBe('ERR_CODE')
        })

        it('should extract error_code from payload', () => {
            const result = normalizeErrorResponse({ message: 'err', error_code: 'E001' })
            expect(result.code).toBe('E001')
        })

        it('should generate HTTP code from status', () => {
            const result = normalizeErrorResponse({ message: 'err' }, 500)
            expect(result.code).toBe('HTTP_500')
        })

        it('should handle null payload', () => {
            const result = normalizeErrorResponse(null)
            expect(result.message).toBe('Request failed')
        })
    })

    describe('normalizeApiError', () => {
        it('should extract message from error object', () => {
            const result = normalizeApiError({ message: 'Error message' })
            expect(result.message).toBe('Error message')
        })

        it('should extract code from error object', () => {
            const result = normalizeApiError({ message: 'Error', code: 'E123' })
            expect(result.code).toBe('E123')
        })

        it('should handle string error', () => {
            const result = normalizeApiError('Simple error string')
            expect(result.message).toBe('Simple error string')
            expect(result.code).toBeNull()
        })

        it('should use fallback for empty string', () => {
            const result = normalizeApiError('', 'Custom fallback')
            expect(result.message).toBe('Custom fallback')
        })

        it('should use fallback for null', () => {
            const result = normalizeApiError(null, 'Fallback')
            expect(result.message).toBe('Fallback')
        })

        it('should use fallback for undefined', () => {
            const result = normalizeApiError(undefined)
            expect(result.message).toBe('Something went wrong')
        })

        it('should extract error_message from nested payload', () => {
            const result = normalizeApiError({ error_message: 'Nested error' })
            expect(result.message).toBe('Nested error')
        })

        it('should trim whitespace from string errors', () => {
            const result = normalizeApiError('  trimmed error  ')
            expect(result.message).toBe('trimmed error')
        })
    })
})
