import { describe, expect, it, beforeEach, vi } from 'vitest'

import { POST } from '../callback/route'

const setMock = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ set: setMock })),
}))

describe('POST /auth/callback', () => {
  beforeEach(() => {
    setMock.mockReset()
  })

  function createRequest(body: unknown, origin: string) {
    return new Request('https://mysched.local/auth/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
      },
      body: JSON.stringify(body),
    })
  }

  it('persists Supabase session cookies for valid events', async () => {
    const response = await POST(
      createRequest(
        {
          event: 'SIGNED_IN',
          session: { access_token: 'access-123', refresh_token: 'refresh-456' },
        },
        'https://mysched.local',
      ),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(setMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: 'sb-access-token', value: 'access-123' }),
    )
    expect(setMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: 'sb-refresh-token', value: 'refresh-456' }),
    )
  })

  it('rejects payloads without the required session tokens', async () => {
    const response = await POST(
      createRequest(
        {
          event: 'SIGNED_IN',
          session: { access_token: 'access-only' },
        },
        'https://mysched.local',
      ),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ ok: false })
    expect(setMock).not.toHaveBeenCalled()
  })

  it('blocks cross-site attempts from untrusted origins', async () => {
    const response = await POST(
      createRequest(
        {
          event: 'SIGNED_IN',
          session: { access_token: 'access-123', refresh_token: 'refresh-456' },
        },
        'https://malicious.example',
      ),
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ ok: false })
    expect(setMock).not.toHaveBeenCalled()
  })
})
