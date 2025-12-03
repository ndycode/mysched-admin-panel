import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../fetcher'

const makeResponse = (ok: boolean, data: unknown, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
})

describe('api fetcher', () => {
  const fetchMock = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    fetchMock.mockResolvedValue(makeResponse(true, { ok: true }))
    // @ts-expect-error - test double
    global.fetch = fetchMock
  })

  afterEach(() => {
    fetchMock.mockReset()
    global.fetch = originalFetch
  })

  test('normalizes whitespace around slashes', async () => {
    await api('  / api / users / 123  ')
    expect(fetchMock).toHaveBeenCalledWith('/api/users/123', expect.any(Object))
  })

  test('strips encoded whitespace in path segments', async () => {
    await api('/%20api%20/%20users%20/%20abc')
    expect(fetchMock).toHaveBeenCalledWith('/api/users/abc', expect.any(Object))
  })

  test('preserves query strings while normalizing path', async () => {
    await api(' /api/users/abc ? q=hello%20world ')
    expect(fetchMock).toHaveBeenCalledWith('/api/users/abc?q=hello%20world', expect.any(Object))
  })

  test('handles template-built URLs without introducing encoded spaces', async () => {
    const userId = 'user-42'
    await api(` /api/users/${userId} `)
    expect(fetchMock).toHaveBeenCalledWith(`/api/users/${userId}`, expect.any(Object))
  })

  test('keeps provided headers and method', async () => {
    await api('/api/users/abc', { method: 'PATCH', headers: { 'x-test': '1' }, body: '{}' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/abc',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'content-type': 'application/json', 'x-test': '1' }),
      }),
    )
  })
})
