import { describe, it, expect } from 'vitest'
import { ok, bad, dbConflict } from '../http'

describe('http', () => {
  describe('ok', () => {
    it('returns 200 status', () => {
      const response = ok({ message: 'success' })
      expect(response.status).toBe(200)
    })

    it('returns JSON data', async () => {
      const response = ok({ test: 'value' })
      const data = await response.json()
      expect(data).toEqual({ test: 'value' })
    })

    it('sets security headers', () => {
      const response = ok({})
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe('same-origin')
    })

    it('allows custom init options', () => {
      const response = ok({}, { headers: { 'X-Custom': 'header' } })
      expect(response.headers.get('X-Custom')).toBe('header')
    })
  })

  describe('bad', () => {
    it('returns 400 status by default', () => {
      const response = bad('error message')
      expect(response.status).toBe(400)
    })

    it('returns error JSON structure', async () => {
      const response = bad('error message')
      const data = await response.json()
      expect(data).toEqual({ error: 'error message', details: undefined })
    })

    it('includes details when provided', async () => {
      const response = bad('error', { field: 'name' })
      const data = await response.json()
      expect(data).toEqual({ error: 'error', details: { field: 'name' } })
    })

    it('allows custom status code', () => {
      const response = bad('not found', undefined, 404)
      expect(response.status).toBe(404)
    })

    it('sets security headers', () => {
      const response = bad('error')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe('same-origin')
    })
  })

  describe('dbConflict', () => {
    it('returns 409 status', () => {
      const response = dbConflict()
      expect(response.status).toBe(409)
    })

    it('has default message', async () => {
      const response = dbConflict()
      const data = await response.json()
      expect(data.error).toBe('Already exists')
    })

    it('allows custom message', async () => {
      const response = dbConflict('Duplicate entry')
      const data = await response.json()
      expect(data.error).toBe('Duplicate entry')
    })
  })
})
