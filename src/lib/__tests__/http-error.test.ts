/**
 * HTTP Error utility tests
 */
import { describe, test, expect } from 'vitest'
import { createHttpError, isHttpError, httpErrorBody, type HttpError } from '../http-error'

describe('createHttpError', () => {
  test('creates error with status and code', () => {
    const error = createHttpError(404, 'not_found')
    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(404)
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('Not Found')
  })

  test('uses code as message when code format is detected', () => {
    const error = createHttpError(400, 'invalid_request')
    expect(error.message).toBe('Invalid Request')
    expect(error.code).toBe('invalid_request')
  })

  test('uses raw message when not in code format', () => {
    const error = createHttpError(400, 'Something went wrong!')
    expect(error.message).toBe('Something went wrong!')
    expect(error.code).toBe('something_went_wrong')
  })

  test('accepts string detail as message', () => {
    const error = createHttpError(400, 'bad_request', 'Custom message here')
    expect(error.message).toBe('Custom message here')
    expect(error.details).toBeUndefined()
  })

  test('accepts object detail with message', () => {
    const error = createHttpError(400, 'validation_error', { message: 'Field is invalid', field: 'email' })
    expect(error.message).toBe('Field is invalid')
    expect(error.details).toEqual({ field: 'email' })
  })

  test('accepts object detail without message', () => {
    const error = createHttpError(400, 'validation_error', { field: 'email', reason: 'format' })
    expect(error.message).toBe('Validation Error')
    expect(error.details).toEqual({ field: 'email', reason: 'format' })
  })

  test('handles empty string code', () => {
    const error = createHttpError(500, '')
    expect(error.code).toBe('unknown_error')
  })

  test('handles code with special characters', () => {
    const error = createHttpError(400, 'invalid-request!!!123')
    expect(error.code).toBe('invalid_request_123')
  })

  test('handles various status codes', () => {
    expect(createHttpError(200, 'ok').status).toBe(200)
    expect(createHttpError(401, 'unauthorized').status).toBe(401)
    expect(createHttpError(403, 'forbidden').status).toBe(403)
    expect(createHttpError(500, 'server_error').status).toBe(500)
  })
})

describe('isHttpError', () => {
  test('returns true for valid HttpError', () => {
    const error = createHttpError(404, 'not_found')
    expect(isHttpError(error)).toBe(true)
  })

  test('returns false for regular Error', () => {
    const error = new Error('Regular error')
    expect(isHttpError(error)).toBe(false)
  })

  test('returns false for null/undefined', () => {
    expect(isHttpError(null)).toBe(false)
    expect(isHttpError(undefined)).toBe(false)
  })

  test('returns false for non-objects', () => {
    expect(isHttpError('string')).toBe(false)
    expect(isHttpError(123)).toBe(false)
    expect(isHttpError(true)).toBe(false)
  })

  test('returns false for object without status', () => {
    expect(isHttpError({ code: 'test' })).toBe(false)
  })

  test('returns false for object without code', () => {
    expect(isHttpError({ status: 404 })).toBe(false)
  })

  test('returns false for non-numeric status', () => {
    expect(isHttpError({ status: '404', code: 'test' })).toBe(false)
  })

  test('checks specific status when provided', () => {
    const error = createHttpError(404, 'not_found')
    expect(isHttpError(error, 404)).toBe(true)
    expect(isHttpError(error, 500)).toBe(false)
  })
})

describe('httpErrorBody', () => {
  test('returns body with code and message', () => {
    const error = createHttpError(404, 'not_found')
    const body = httpErrorBody(error)
    expect(body).toEqual({
      code: 'not_found',
      message: 'Not Found',
    })
  })

  test('includes details when present', () => {
    const error = createHttpError(400, 'validation_error', { field: 'email' })
    const body = httpErrorBody(error)
    expect(body).toEqual({
      code: 'validation_error',
      message: 'Validation Error',
      details: { field: 'email' },
    })
  })

  test('excludes details when undefined', () => {
    const error = createHttpError(500, 'server_error')
    const body = httpErrorBody(error)
    expect(body).not.toHaveProperty('details')
  })
})
