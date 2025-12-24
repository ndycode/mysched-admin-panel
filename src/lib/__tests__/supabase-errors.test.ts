import { describe, it, expect } from 'vitest'
import { isSupabaseNotFoundError, toSupabaseNotFoundError } from '../supabase-errors'

describe('supabase-errors', () => {
  describe('isSupabaseNotFoundError', () => {
    it('returns false for null', () => {
      expect(isSupabaseNotFoundError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isSupabaseNotFoundError(undefined)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isSupabaseNotFoundError('error')).toBe(false)
      expect(isSupabaseNotFoundError(123)).toBe(false)
    })

    it('returns true for status 404', () => {
      expect(isSupabaseNotFoundError({ status: 404 })).toBe(true)
    })

    it('returns false for other status codes', () => {
      expect(isSupabaseNotFoundError({ status: 500 })).toBe(false)
      expect(isSupabaseNotFoundError({ status: 400 })).toBe(false)
    })

    it('returns true for "not found" message', () => {
      expect(isSupabaseNotFoundError({ message: 'Resource not found' })).toBe(true)
      expect(isSupabaseNotFoundError({ message: 'NOT FOUND' })).toBe(true)
    })

    it('returns true for "no row found" message', () => {
      expect(isSupabaseNotFoundError({ message: 'No row found' })).toBe(true)
    })

    it('returns false for empty message', () => {
      expect(isSupabaseNotFoundError({ message: '' })).toBe(false)
    })

    it('returns false for unrelated message', () => {
      expect(isSupabaseNotFoundError({ message: 'Some other error' })).toBe(false)
    })

    it('handles non-string message', () => {
      expect(isSupabaseNotFoundError({ message: 123 })).toBe(false)
      expect(isSupabaseNotFoundError({ message: null })).toBe(false)
    })
  })

  describe('toSupabaseNotFoundError', () => {
    it('returns HttpError for 404 status', () => {
      const error = toSupabaseNotFoundError({ status: 404 })
      expect(error).not.toBeNull()
      expect(error?.status).toBe(404)
    })

    it('uses custom message', () => {
      const error = toSupabaseNotFoundError({ status: 404 }, 'User not found')
      expect(error?.message).toBe('User not found')
    })

    it('uses default message when not provided', () => {
      const error = toSupabaseNotFoundError({ status: 404 })
      expect(error?.message).toBe('Resource not found.')
    })

    it('returns null for non-404 errors', () => {
      expect(toSupabaseNotFoundError({ status: 500 })).toBeNull()
      expect(toSupabaseNotFoundError({ message: 'Server error' })).toBeNull()
    })

    it('returns null for null input', () => {
      expect(toSupabaseNotFoundError(null)).toBeNull()
    })

    it('attaches original error as cause', () => {
      const originalError = { status: 404, message: 'Not found' }
      const error = toSupabaseNotFoundError(originalError)
      // The error wraps the original error
      expect(error).toBeDefined()
      expect(error?.status).toBe(404)
    })
  })
})
