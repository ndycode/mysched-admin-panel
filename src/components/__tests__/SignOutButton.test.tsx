/**
 * SignOutButton component tests
 */
import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignOutButton from '../SignOutButton'

// Mock next/navigation
const mockReplace = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}))

// Mock supabase-browser
const mockSignOut = vi.fn()
vi.mock('@/lib/supabase-browser', () => ({
  sbBrowser: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}))

describe('SignOutButton', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({})
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('renders with default text', () => {
    render(<SignOutButton />)
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  test('renders with custom children', () => {
    render(<SignOutButton>Sign Out Now</SignOutButton>)
    expect(screen.getByRole('button', { name: /sign out now/i })).toBeInTheDocument()
  })

  test('renders with custom aria-label', () => {
    render(<SignOutButton ariaLabel="Log out of application" />)
    expect(screen.getByRole('button', { name: /log out of application/i })).toBeInTheDocument()
  })

  test('applies custom className', () => {
    render(<SignOutButton className="custom-class" />)
    const button = screen.getByRole('button')
    expect(button.className).toContain('custom-class')
  })

  test('calls signOut and redirects on click', async () => {
    const user = userEvent.setup()
    render(<SignOutButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })

    expect(global.fetch).toHaveBeenCalledWith('/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
    }))

    expect(mockReplace).toHaveBeenCalledWith('/login')
    expect(mockRefresh).toHaveBeenCalled()
  })

  test('shows loading state while signing out', async () => {
    const user = userEvent.setup()
    
    // Make signOut take some time
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<SignOutButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText(/signing out/i)).toBeInTheDocument()
    })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  test('disables button while loading', async () => {
    const user = userEvent.setup()
    mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<SignOutButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })

  test('handles signOut error gracefully', async () => {
    const user = userEvent.setup()
    mockSignOut.mockRejectedValue(new Error('Sign out failed'))
    
    render(<SignOutButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)

    // Should still try to redirect even if client signOut fails
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })
  })

  test('handles fetch error gracefully', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    
    render(<SignOutButton />)
    
    const button = screen.getByRole('button')
    await user.click(button)

    // Should still redirect
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    })
  })
})
