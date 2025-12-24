/**
 * useSmoothProgress hook tests
 */
import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSmoothProgress } from '../useSmoothProgress'

describe('useSmoothProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock matchMedia for prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns initial target value', () => {
    const { result } = renderHook(() => useSmoothProgress(0.5))
    expect(result.current).toBe(0.5)
  })

  test('clamps values to 0-1 range', () => {
    const { result: resultLow } = renderHook(() => useSmoothProgress(-0.5))
    expect(resultLow.current).toBe(0)

    const { result: resultHigh } = renderHook(() => useSmoothProgress(1.5))
    expect(resultHigh.current).toBe(1)
  })

  test('handles 0 and 1 edge values', () => {
    const { result: resultZero } = renderHook(() => useSmoothProgress(0))
    expect(resultZero.current).toBe(0)

    const { result: resultOne } = renderHook(() => useSmoothProgress(1))
    expect(resultOne.current).toBe(1)
  })

  test('respects prefers-reduced-motion', () => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    const { result, rerender } = renderHook(
      ({ target }) => useSmoothProgress(target),
      { initialProps: { target: 0 } }
    )

    expect(result.current).toBe(0)

    rerender({ target: 1 })

    // With reduced motion, should immediately jump to target
    expect(result.current).toBe(1)
  })

  test('accepts custom duration option', () => {
    const { result } = renderHook(() => 
      useSmoothProgress(0.5, { duration: 1000 })
    )
    expect(result.current).toBe(0.5)
  })

  test('accepts custom ease function', () => {
    const linearEase = (t: number) => t
    const { result } = renderHook(() => 
      useSmoothProgress(0.5, { ease: linearEase })
    )
    expect(result.current).toBe(0.5)
  })

  test('handles zero duration', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useSmoothProgress(target, { duration: 0 }),
      { initialProps: { target: 0 } }
    )

    rerender({ target: 1 })

    // With zero duration, should immediately be at target
    expect(result.current).toBe(1)
  })

  test('skips animation for very small changes', () => {
    const { result, rerender } = renderHook(
      ({ target }) => useSmoothProgress(target),
      { initialProps: { target: 0.5 } }
    )

    // Very small change (< 0.001)
    rerender({ target: 0.5005 })

    // Should skip animation and go directly to target
    expect(result.current).toBe(0.5005)
  })
})
