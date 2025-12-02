import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.hoisted(() => vi.fn())
const sbServiceMock = vi.hoisted(() => vi.fn(() => ({ rpc: rpcMock })))

vi.mock('@/lib/supabase-service', async () => {
  const actual = await vi.importActual<typeof import('./supabase-service')>('./supabase-service')
  return {
    ...actual,
    sbService: sbServiceMock,
  }
})

import { throttle } from './rate'
import { SupabaseConfigError } from './supabase-service'

describe('throttle', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  afterAll(() => {
    errorSpy.mockRestore()
  })

  beforeEach(() => {
    sbServiceMock.mockReset()
    rpcMock.mockReset()
    errorSpy.mockClear()
    sbServiceMock.mockImplementation(() => ({ rpc: rpcMock }))
  })

  it('skips rate limiting for localhost traffic', async () => {
    await expect(throttle('127.0.0.1')).resolves.toBeUndefined()
    expect(sbServiceMock).not.toHaveBeenCalled()
  })

  it('fails when the Supabase service client is unavailable', async () => {
    sbServiceMock.mockImplementation(() => {
      throw new SupabaseConfigError('missing credentials')
    })

    await expect(throttle('203.0.113.1')).rejects.toMatchObject({
      status: 500,
      code: 'rate_limit_unavailable',
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('service client unavailable'),
      }),
    )
  })

  it('throws a 429 when the rate limit is exceeded', async () => {
    sbServiceMock.mockReturnValue({ rpc: rpcMock })
    rpcMock.mockResolvedValue({
      data: { allowed: false, count: 42, reset_at: '2025-01-01T00:00:00Z' },
      error: null,
    })

    await expect(throttle('203.0.113.2')).rejects.toMatchObject({ status: 429 })
  })

  it('fails when the RPC returns an error payload', async () => {
    sbServiceMock.mockReturnValue({ rpc: rpcMock })
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'rpc hit_rate_limit does not exist', code: 'PGRST116' },
    })

    await expect(throttle('203.0.113.3')).rejects.toMatchObject({
      status: 500,
      code: 'rate_limit_unavailable',
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('RPC returned an error'),
      }),
    )
  })

  it('fails when the RPC returns no payload', async () => {
    sbServiceMock.mockReturnValue({ rpc: rpcMock })
    rpcMock.mockResolvedValue({ data: null, error: null })

    await expect(throttle('203.0.113.4')).rejects.toMatchObject({
      status: 500,
      code: 'rate_limit_unavailable',
    })
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: expect.stringContaining('no payload'),
      }),
    )
  })
})
