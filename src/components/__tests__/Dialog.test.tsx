import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { Dialog, DialogBody, DialogHeader } from '../ui/Dialog'

describe('Dialog', () => {
  it('renders children when open and closes on Escape', () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogHeader>
          <h2>Dialog Title</h2>
        </DialogHeader>
        <DialogBody>
          <p>Dialog Content</p>
        </DialogBody>
      </Dialog>,
    )

    expect(screen.getByText('Dialog Title')).toBeInTheDocument()
    expect(screen.getByText('Dialog Content')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByText('Dialog Content'), { key: 'Escape', code: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render content when closed', () => {
    render(
      <Dialog open={false} onOpenChange={() => {}}>
        <DialogBody>
          <p>Hidden content</p>
        </DialogBody>
      </Dialog>,
    )

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })
})
