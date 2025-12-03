import React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChevronRight } from 'lucide-react'

import { AnimatedActionBtn } from '../ui/AnimatedActionBtn'
import { AnimatedGridBackground } from '../ui/AnimatedGridBackground'
import { AuroraBackground } from '../ui/AuroraBackground'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { LiquidGlassButton } from '../ui/LiquidGlassButton'
import { NavLink } from '../ui/NavLink'
import { PageSizeSelector } from '../ui/PageSizeSelector'
import { Skeleton } from '../ui/Skeleton'
import { StaticDotBackground } from '../ui/StaticDotBackground'
import { TimeInput } from '../ui/TimeInput'

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

vi.mock('lenis/react', () => ({
  ReactLenis: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('UI component smoke tests', () => {
  test('AnimatedActionBtn renders label and loading state', () => {
    const { rerender } = render(<AnimatedActionBtn label="Submit" icon={ChevronRight} />)
    expect(screen.getByText('Submit')).toBeInTheDocument()

    rerender(<AnimatedActionBtn label="Submit" icon={ChevronRight} isLoading loadingLabel="Saving" />)
    expect(screen.getByText('Saving')).toBeInTheDocument()
  })

  test('Badge renders children', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  test('Input renders with placeholder', () => {
    render(<Input placeholder="Email" />)
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
  })

  test('PageSizeSelector lists options', () => {
    render(<PageSizeSelector pageSize={10} onPageSizeChange={() => {}} options={[10, 20, 50]} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  test('Skeleton renders with custom class', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    expect(container.firstChild).toHaveClass('h-4')
  })

  test('StaticDotBackground renders child content', () => {
    render(
      <StaticDotBackground>
        <span>Inside</span>
      </StaticDotBackground>,
    )
    expect(screen.getByText('Inside')).toBeInTheDocument()
  })

  test('AnimatedGridBackground renders child content', () => {
    render(
      <AnimatedGridBackground>
        <span>Grid Child</span>
      </AnimatedGridBackground>,
    )
    expect(screen.getByText('Grid Child')).toBeInTheDocument()
  })

  test('AuroraBackground renders child content', () => {
    render(
      <AuroraBackground>
        <span>Aurora Child</span>
      </AuroraBackground>,
    )
    expect(screen.getByText('Aurora Child')).toBeInTheDocument()
  })

  test('NavLink renders label', () => {
    render(<NavLink href="/dashboard" label="Dashboard" active={true} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('LiquidGlassButton renders label and loading label', () => {
    const { rerender } = render(<LiquidGlassButton>Click</LiquidGlassButton>)
    expect(screen.getByText('Click')).toBeInTheDocument()

    rerender(<LiquidGlassButton isLoading loadingLabel="Working..." />)
    expect(screen.getByText('Working...')).toBeInTheDocument()
  })

  test('TimeInput shows placeholder label when empty', () => {
    render(<TimeInput value="" onChange={() => {}} />)
    expect(screen.getByText('--:-- --')).toBeInTheDocument()
  })

  test('TimeInput clamps out-of-range values', () => {
    render(<TimeInput value="25:99" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /11:59 PM/i })).toBeInTheDocument()
  })

  test('TimeInput opens via keyboard and emits normalized value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    const ControlledInput = () => {
      const [time, setTime] = React.useState('')
      return (
        <TimeInput
          value={time}
          onChange={(val) => {
            setTime(val)
            handleChange(val)
          }}
        />
      )
    }
    render(<ControlledInput />)

    const trigger = screen.getByRole('button', { name: /--:-- --/i })
    trigger.focus()
    await user.keyboard('{Enter}')
    if (screen.queryAllByRole('button', { name: /^10$/ }).length === 0) {
      await user.click(trigger)
    }
    const [hourTen] = await screen.findAllByRole('button', { name: /^10$/ })
    await user.click(hourTen)
    await user.click(screen.getByRole('button', { name: /^30$/ }))
    await user.click(screen.getByRole('button', { name: /select pm/i }))

    expect(handleChange).toHaveBeenLastCalledWith('22:30')
  })
})
