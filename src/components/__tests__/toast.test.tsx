import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

import { ToastProvider, useToast } from '../toast'

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
  })

  function setup() {
    function Trigger() {
      const toast = useToast()
      return (
        <button type="button" onClick={() => toast({ kind: 'info', msg: 'Hello there' })}>
          Trigger
        </button>
      )
    }

    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
  }

  it('renders a toast message when triggered', () => {
    setup()
    act(() => {
      fireEvent.click(screen.getByText('Trigger'))
    })
    expect(screen.getAllByText('Hello there').length).toBeGreaterThan(0)
  })

  it('dismisses a toast when the close button is clicked', () => {
    setup()
    act(() => {
      fireEvent.click(screen.getByText('Trigger'))
    })
    const dismiss = screen.getByRole('button', { name: /dismiss notification/i })
    act(() => {
      fireEvent.click(dismiss)
    })
    expect(screen.queryByText('Hello there')).not.toBeInTheDocument()
  })

  it('auto-removes toasts after the display duration', () => {
    setup()
    act(() => {
      fireEvent.click(screen.getByText('Trigger'))
    })

    act(() => {
      vi.advanceTimersByTime(4200)
    })

    expect(screen.queryByText('Hello there')).not.toBeInTheDocument()
  })
})
