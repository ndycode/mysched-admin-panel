import { act, renderHook, waitFor } from '@testing-library/react'

import { useLocalStorage } from '../useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reads the stored value on mount', async () => {
    window.localStorage.setItem('demo', JSON.stringify('from-storage'))
    const { result } = renderHook(() => useLocalStorage('demo', 'fallback'))

    await waitFor(() => {
      expect(result.current[0]).toBe('from-storage')
    })
  })

  it('re-synchronises when the key changes', async () => {
    window.localStorage.setItem('alpha', JSON.stringify('first'))
    window.localStorage.setItem('beta', JSON.stringify('second'))

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

    expect(JSON.parse(window.localStorage.getItem('alpha') ?? 'null')).toBe('updated')

    rerender({ key: 'beta' })

    await waitFor(() => {
      expect(result.current[0]).toBe('second')
    })
  })
})
