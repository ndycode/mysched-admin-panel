import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import LoginPage from '../page'

const mockReplace = vi.fn()
const mockRefresh = vi.fn()
const mockSignInWithPassword = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

describe('admin login flow', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockReplace.mockReset()
    mockRefresh.mockReset()
    mockSignInWithPassword.mockReset()

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE = 'service-role'
    process.env.NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE = '1'
    process.env.NEXT_PUBLIC_SUPABASE_USING_LOCAL_DEFAULTS = '0'

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            configured: true,
            missingPublicKeys: [],
            usingLocalFallback: false,
            serviceRoleConfigured: true,
            runningOnVercel: false,
            vercelProjectName: null,
          }),
      }),
    ) as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('redirects admins to /admin after successful sign in', async () => {
    const user = userEvent.setup()
    mockSignInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token-a', refresh_token: 'token-b' } },
      error: null,
    })

    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com')
    await user.type(screen.getByLabelText(/password/i, { selector: 'input' }), 's3cret!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin')
    })
    expect(mockRefresh).toHaveBeenCalled()
  })
})
