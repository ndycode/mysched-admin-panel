/**
 * ThemeProvider component tests
 */
import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../ThemeProvider'

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}))

describe('ThemeProvider', () => {
  test('renders children', () => {
    render(
      <ThemeProvider>
        <div>Child content</div>
      </ThemeProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  test('passes correct default props to NextThemesProvider', () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>
    )
    
    const provider = screen.getByTestId('theme-provider')
    const props = JSON.parse(provider.getAttribute('data-props') || '{}')
    
    expect(props.attribute).toBe('class')
    expect(props.defaultTheme).toBe('system')
    expect(props.enableSystem).toBe(true)
    expect(props.disableTransitionOnChange).toBe(true)
    expect(props.storageKey).toBe('mysched-theme')
  })

  test('allows overriding props', () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey="custom-key">
        <div>Content</div>
      </ThemeProvider>
    )
    
    const provider = screen.getByTestId('theme-provider')
    const props = JSON.parse(provider.getAttribute('data-props') || '{}')
    
    expect(props.defaultTheme).toBe('dark')
    expect(props.storageKey).toBe('custom-key')
  })

  test('renders multiple children', () => {
    render(
      <ThemeProvider>
        <div>First child</div>
        <div>Second child</div>
      </ThemeProvider>
    )
    expect(screen.getByText('First child')).toBeInTheDocument()
    expect(screen.getByText('Second child')).toBeInTheDocument()
  })
})
