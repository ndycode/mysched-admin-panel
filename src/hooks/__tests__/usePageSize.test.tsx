/**
 * usePageSize hook tests
 */
import React from 'react'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePageSize } from '../usePageSize'

describe('usePageSize', () => {
  const originalLocalStorage = global.localStorage
  let mockStorage: Record<string, string>

  beforeEach(() => {
    mockStorage = {}
    const mockLocalStorage = {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key]
      }),
      clear: vi.fn(() => {
        mockStorage = {}
      }),
      length: 0,
      key: vi.fn(() => null),
    }
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    })
  })

  test('returns default page size of 20', () => {
    const { result } = renderHook(() => usePageSize())
    expect(result.current.pageSize).toBe(20)
  })

  test('loads saved page size from localStorage', async () => {
    mockStorage['mysched_admin_page_size'] = '40'
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })
    expect(result.current.pageSize).toBe(40)
  })

  test('setPageSize updates the page size', async () => {
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setPageSize(50)
    })

    expect(result.current.pageSize).toBe(50)
    expect(mockStorage['mysched_admin_page_size']).toBe('50')
  })

  test('rejects invalid page sizes', async () => {
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    act(() => {
      result.current.setPageSize(25) // Not a valid size
    })

    // Should not change from default
    expect(result.current.pageSize).toBe(20)
  })

  test('accepts valid page sizes: 20, 40, 50, 80', async () => {
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    const validSizes = [20, 40, 50, 80]
    for (const size of validSizes) {
      act(() => {
        result.current.setPageSize(size)
      })
      expect(result.current.pageSize).toBe(size)
    }
  })

  test('ignores invalid saved values in localStorage', async () => {
    mockStorage['mysched_admin_page_size'] = '999'
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    // Should use default because 999 is not valid
    expect(result.current.pageSize).toBe(20)
  })

  test('handles non-numeric localStorage values', async () => {
    mockStorage['mysched_admin_page_size'] = 'invalid'
    const { result } = renderHook(() => usePageSize())
    
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })

    expect(result.current.pageSize).toBe(20)
  })

  test('isLoaded becomes true after initialization', async () => {
    const { result } = renderHook(() => usePageSize())
    
    // Initially might not be loaded
    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true)
    })
  })
})
