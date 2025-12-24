import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to test sbService but it throws on client-side
// Mock the window check and dependencies

const mockClient = {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
}

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockClient),
}))

vi.mock('../env', () => ({
    getSupabaseConfig: vi.fn(() => ({
        url: 'https://test.supabase.co',
        serviceRole: 'test-service-role',
    })),
    SupabaseConfigError: class SupabaseConfigError extends Error { },
}))

describe('supabase-service', () => {
    beforeEach(() => {
        vi.resetModules()
        // Clear any cached client
        const g = globalThis as typeof globalThis & { __myschedServiceClient?: unknown }
        g.__myschedServiceClient = undefined
    })

    describe('sbService', () => {
        it('should throw error when called on client-side', async () => {
            // Simulate browser environment
            const originalWindow = (globalThis as { window?: unknown }).window
                ; (globalThis as { window?: unknown }).window = { document: {} }

            const { sbService } = await import('../supabase-service')

            expect(() => sbService()).toThrow('Supabase service client is only available on the server.')

                // Restore
                ; (globalThis as { window?: unknown }).window = originalWindow
        })

        it('should return a client on server-side', async () => {
            // Ensure no window
            const originalWindow = (globalThis as { window?: unknown }).window
                ; (globalThis as { window?: unknown }).window = undefined

            const { sbService } = await import('../supabase-service')
            const client = sbService()

            expect(client).toBeDefined()
            expect(client).toHaveProperty('from')

                // Restore
                ; (globalThis as { window?: unknown }).window = originalWindow
        })
    })

    describe('assertSupabaseServiceConfig', () => {
        it('should be exported', async () => {
            const { assertSupabaseServiceConfig } = await import('../supabase-service')
            expect(assertSupabaseServiceConfig).toBeDefined()
        })
    })

    describe('SupabaseConfigError', () => {
        it('should be re-exported', async () => {
            const { SupabaseConfigError } = await import('../supabase-service')
            expect(SupabaseConfigError).toBeDefined()
        })
    })
})
