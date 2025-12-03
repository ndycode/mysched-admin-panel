import React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import AvatarThumbnail from '../AvatarThumbnail'
import ClientAdminShell from '../ClientAdminShell'
import { ComingSoonProvider, useComingSoon } from '../ComingSoonDialog'
import { GlobalListeners } from '../GlobalListeners'
import { PageHeader } from '../PageHeader'
import { ProfileSettingsDialog } from '../ProfileSettingsDialog'
import SignOutButton from '../SignOutButton'
import { ThemeProvider } from '../ThemeProvider'
import { ThemeToggle } from '../ThemeToggle'

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/supabase-browser', () => ({
  sbBrowser: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'demo@example.com' } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/app/admin/actions', () => ({
  updateProfile: vi.fn().mockResolvedValue({}),
}))

function TriggerComingSoon() {
  const comingSoon = useComingSoon()
  return (
    <button
      type="button"
      onClick={() =>
        comingSoon({
          title: 'Test feature',
          description: 'Preview message',
          highlights: ['One', 'Two'],
        })
      }
    >
      Open
    </button>
  )
}

describe('Misc components smoke tests', () => {
  test('AvatarThumbnail renders initials when no image', () => {
    render(<AvatarThumbnail name="Alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  test('AvatarThumbnail renders image when src provided', () => {
    render(<AvatarThumbnail name="Bob" src="https://example.com/avatar.png" />)
    const img = screen.getByRole('img', { name: 'Bob' })
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  test('PageHeader renders title, badge, and description', () => {
    render(<PageHeader title="Dashboard" description="Overview" badge="Beta" />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  test('ComingSoonProvider opens dialog via hook', async () => {
    render(
      <ComingSoonProvider>
        <TriggerComingSoon />
      </ComingSoonProvider>,
    )
    fireEvent.click(screen.getByText('Open'))
    await waitFor(() => expect(screen.getByText('Test feature')).toBeInTheDocument())
    expect(screen.getByText('Preview message')).toBeInTheDocument()
    expect(screen.getByText('One')).toBeInTheDocument()
  })

  test('GlobalListeners renders without crashing', () => {
    const { container } = render(<GlobalListeners />)
    expect(container).toBeEmptyDOMElement()
  })

  test('ClientAdminShell renders children', async () => {
    render(
      <ClientAdminShell>
        <div>Child content</div>
      </ClientAdminShell>,
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('D')).toBeInTheDocument())
  })

  test('ProfileSettingsDialog shows initial data when open', () => {
    render(
      <ProfileSettingsDialog
        open
        onClose={() => {}}
        initialData={{ fullName: 'Dana User', avatarUrl: null, email: 'dana@example.com' }}
      />,
    )
    expect(screen.getByDisplayValue('Dana User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('dana@example.com')).toBeInTheDocument()
  })

  test('ThemeProvider renders children', () => {
    render(
      <ThemeProvider>
        <div>Theme child</div>
      </ThemeProvider>,
    )
    expect(screen.getByText('Theme child')).toBeInTheDocument()
  })

  test('ThemeToggle renders button', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  test('SignOutButton renders with default label', () => {
    render(<SignOutButton />)
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })
})
