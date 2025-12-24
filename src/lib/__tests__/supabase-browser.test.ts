import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sbBrowser } from '../supabase-browser'

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: vi.fn(() => ({
        from: vi.fn(),
        auth: { getSession: vi.fn() },
    })),
}))

vi.mock('../env', () => ({
    getSupabaseBrowserConfig: vi.fn(() => ({
        url: 'https://test.supabase.co',
        anon: 'test-anon-key',
    })),
}))

describe('supabase-browser', () => {
    describe('sbBrowser', () => {
        it('should return a Supabase client', () => {
            const client = sbBrowser()
            expect(client).toBeDefined()
            expect(client).toHaveProperty('from')
            expect(client).toHaveProperty('auth')
        })

        it('should be memoized (returns same client)', () => {
            const client1 = sbBrowser()
            const client2 = sbBrowser()
            expect(client1).toBe(client2)
        })
    })
})
