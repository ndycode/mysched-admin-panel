/**
 * Utils tests - cn utility function
 */
import { describe, test, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  test('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  test('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  test('handles arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  test('handles object syntax', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toBe('foo baz')
  })

  test('merges Tailwind classes correctly', () => {
    // tailwind-merge should handle conflicting classes
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  test('handles Tailwind responsive classes', () => {
    const result = cn('text-sm', 'md:text-lg', 'lg:text-xl')
    expect(result).toContain('text-sm')
    expect(result).toContain('md:text-lg')
    expect(result).toContain('lg:text-xl')
  })

  test('handles undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar')
    expect(result).toBe('foo bar')
  })

  test('handles empty string', () => {
    const result = cn('foo', '', 'bar')
    expect(result).toBe('foo bar')
  })

  test('handles no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  test('handles complex Tailwind merging', () => {
    const result = cn(
      'bg-red-500 hover:bg-red-600',
      'bg-blue-500' // Should override bg-red-500
    )
    expect(result).toContain('bg-blue-500')
    expect(result).not.toContain('bg-red-500')
    expect(result).toContain('hover:bg-red-600')
  })

  test('preserves non-conflicting classes', () => {
    const result = cn('rounded-lg shadow-md', 'text-white font-bold')
    expect(result).toContain('rounded-lg')
    expect(result).toContain('shadow-md')
    expect(result).toContain('text-white')
    expect(result).toContain('font-bold')
  })
})
