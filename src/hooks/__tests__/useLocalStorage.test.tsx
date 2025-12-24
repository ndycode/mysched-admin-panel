import { act, renderHook, waitFor } from '@testing-library/react'

import { useLocalStorage } from '../useLocalStorage'

// Setup localStorage mock with all required methods
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('initializes with the provided default value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    // Should initialize with default before hydration
    expect(result.current[0]).toBe('default')
  })

  it('reads the stored value after mount', async () => {
    localStorageMock.setItem('demo', JSON.stringify('from-storage'))
    const { result } = renderHook(() => useLocalStorage('demo', 'fallback'))

    // After hydration, should read from storage
    await waitFor(() => {
      expect(result.current[0]).toBe('from-storage')
    })
  })

  it('persists changes to localStorage', async () => {
    const { result } = renderHook(() => useLocalStorage('persist-test', 'initial'))

    // Wait for hydration
    await waitFor(() => {
      expect(result.current[0]).toBe('initial')
    })

    act(() => {
      result.current[1]('updated-value')
    })

    expect(result.current[0]).toBe('updated-value')
    expect(JSON.parse(localStorageMock.getItem('persist-test') ?? 'null')).toBe('updated-value')
  })

  it('re-synchronises when the key changes', async () => {
    localStorageMock.setItem('alpha', JSON.stringify('first'))
    localStorageMock.setItem('beta', JSON.stringify('second'))

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage<string>(key, 'fallback'),
      { initialProps: { key: 'alpha' } },
    )

    await waitFor(() => {
      expect(result.current[0]).toBe('first')
    })

    act(() => {
      result.current[1]('updated')
    })

    expect(JSON.parse(localStorageMock.getItem('alpha') ?? 'null')).toBe('updated')

    rerender({ key: 'beta' })

    await waitFor(() => {
      expect(result.current[0]).toBe('second')
    })
  })
})
