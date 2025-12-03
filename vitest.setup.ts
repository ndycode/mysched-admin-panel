import '@testing-library/jest-dom/vitest'
import React from 'react'
import { beforeEach, vi } from 'vitest'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE ??= 'test-service-role'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'
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

// jsdom lacks PointerEvent; provide a minimal polyfill for motion/RTL
if (typeof globalThis.PointerEvent === 'undefined') {
  // @ts-expect-error test shim
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, props?: MouseEventInit) {
      super(type, props)
    }
  }
}

// Ensure React is available for classic JSX transforms in test mocks
globalThis.React = React

// Basic matchMedia shim for components using media queries
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
