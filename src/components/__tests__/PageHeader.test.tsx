/**
 * PageHeader component tests
 */
import React from 'react'
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  test('renders title', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })

  test('renders description when provided', () => {
    render(<PageHeader title="Users" description="Manage all system users" />)
    expect(screen.getByText(/manage all system users/i)).toBeInTheDocument()
  })

  test('does not render description when not provided', () => {
    render(<PageHeader title="Settings" />)
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument()
  })

  test('renders badge when provided', () => {
    render(<PageHeader title="Classes" badge="Beta" />)
    expect(screen.getByText(/beta/i)).toBeInTheDocument()
  })

  test('does not render badge when not provided', () => {
    const { container } = render(<PageHeader title="Sections" />)
    const badgeElements = container.querySelectorAll('.caps-label')
    expect(badgeElements.length).toBe(0)
  })

  test('renders actions when provided', () => {
    render(
      <PageHeader
        title="Instructors"
        actions={<button>Add Instructor</button>}
      />
    )
    expect(screen.getByRole('button', { name: /add instructor/i })).toBeInTheDocument()
  })

  test('renders multiple action buttons', () => {
    render(
      <PageHeader
        title="Classes"
        actions={
          <>
            <button>Import</button>
            <button>Export</button>
            <button>Add Class</button>
          </>
        }
      />
    )
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add class/i })).toBeInTheDocument()
  })

  test('applies custom className', () => {
    const { container } = render(<PageHeader title="Test" className="mt-8 mb-4" />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('mt-8')
    expect(header?.className).toContain('mb-4')
  })

  test('renders heading as h1', () => {
    render(<PageHeader title="Admin Panel" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Admin Panel')
  })

  test('renders all elements together', () => {
    render(
      <PageHeader
        title="Complete Header"
        description="This is a complete header with all elements"
        badge="New"
        actions={<button>Action</button>}
        className="test-class"
      />
    )
    
    expect(screen.getByRole('heading', { name: /complete header/i })).toBeInTheDocument()
    expect(screen.getByText(/this is a complete header/i)).toBeInTheDocument()
    expect(screen.getByText(/new/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
  })
})
