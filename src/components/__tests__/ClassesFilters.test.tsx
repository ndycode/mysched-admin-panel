import React from 'react'
import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ClassesFilters } from '../admin/ClassesFilters'

describe('ClassesFilters', () => {
  test('renders date picker and inputs', () => {
    render(<ClassesFilters />)
    expect(screen.getByText(/mm\/dd\/yyyy/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Filter Title')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Filter Code')).toBeInTheDocument()
    expect(screen.getByText('Reload')).toBeInTheDocument()
  })
})
