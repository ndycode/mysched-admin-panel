import '@testing-library/jest-dom/vitest'
import { beforeEach, vi } from 'vitest'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE ??= 'test-service-role'
process.env.NEXT_PUBLIC_SITE_URL ??= 'http://localhost:3000'

const assignMock = vi.fn()
const replaceMock = vi.fn()
const reloadMock = vi.fn()

Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    assign: assignMock,
    replace: replaceMock,
    reload: reloadMock,
  },
  writable: true,
  configurable: true,
})

// Simple ResizeObserver mock for components that rely on measurements (e.g., react-virtuoso)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in window)) {
  // @ts-expect-error test shim
  window.ResizeObserver = ResizeObserverMock
}

beforeEach(() => {
  assignMock.mockReset()
  replaceMock.mockReset()
  reloadMock.mockReset()
})
