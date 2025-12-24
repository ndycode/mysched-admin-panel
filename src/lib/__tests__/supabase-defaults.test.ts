import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
    LOCAL_SUPABASE_DEFAULTS,
    getLocalSupabaseDefaults,
    shouldUseLocalSupabaseDefaults,
} from '../supabase-defaults'

describe('supabase-defaults', () => {
    describe('LOCAL_SUPABASE_DEFAULTS', () => {
        it('should have default local URL', () => {
            expect(LOCAL_SUPABASE_DEFAULTS.url).toBe('http://127.0.0.1:54321')
        })

        it('should have anonKey', () => {
            expect(LOCAL_SUPABASE_DEFAULTS.anonKey).toBeTruthy()
            expect(typeof LOCAL_SUPABASE_DEFAULTS.anonKey).toBe('string')
        })

        it('should have serviceRoleKey', () => {
            expect(LOCAL_SUPABASE_DEFAULTS.serviceRoleKey).toBeTruthy()
            expect(typeof LOCAL_SUPABASE_DEFAULTS.serviceRoleKey).toBe('string')
        })
    })

    describe('getLocalSupabaseDefaults', () => {
        it('should return defaults when no env overrides', () => {
            const result = getLocalSupabaseDefaults({})
            expect(result.url).toBe(LOCAL_SUPABASE_DEFAULTS.url)
            expect(result.anonKey).toBe(LOCAL_SUPABASE_DEFAULTS.anonKey)
            expect(result.serviceRoleKey).toBe(LOCAL_SUPABASE_DEFAULTS.serviceRoleKey)
        })

        it('should use custom URL from env', () => {
            const result = getLocalSupabaseDefaults({
                SUPABASE_LOCAL_URL: 'http://custom-host:54321',
            })
            expect(result.url).toBe('http://custom-host:54321')
        })

        it('should use custom anon key from env', () => {
            const result = getLocalSupabaseDefaults({
                SUPABASE_LOCAL_ANON_KEY: 'custom-anon-key',
            })
            expect(result.anonKey).toBe('custom-anon-key')
        })

        it('should use custom service role key from env', () => {
            const result = getLocalSupabaseDefaults({
                SUPABASE_LOCAL_SERVICE_ROLE_KEY: 'custom-service-key',
            })
            expect(result.serviceRoleKey).toBe('custom-service-key')
        })

        it('should normalize URL without protocol', () => {
            const result = getLocalSupabaseDefaults({
                SUPABASE_LOCAL_URL: 'localhost:54321',
            })
            expect(result.url).toBe('http://localhost:54321')
        })

        it('should add default port if missing', () => {
            const result = getLocalSupabaseDefaults({
                SUPABASE_LOCAL_URL: 'http://localhost',
            })
            expect(result.url).toBe('http://localhost:54321')
        })
    })

    describe('shouldUseLocalSupabaseDefaults', () => {
        it('should return true in development', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'development',
            })
            expect(result).toBe(true)
        })

        it('should return false in production', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'production',
            })
            expect(result).toBe(false)
        })

        it('should return false when disabled', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'development',
                SUPABASE_DISABLE_LOCAL_DEFAULTS: '1',
            })
            expect(result).toBe(false)
        })

        it('should return false on Vercel', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'development',
                VERCEL: '1',
            })
            expect(result).toBe(false)
        })

        it('should return false in CI', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'development',
                CI: '1',
            })
            expect(result).toBe(false)
        })

        it('should return false when CI is true (string)', () => {
            const result = shouldUseLocalSupabaseDefaults({
                NODE_ENV: 'development',
                CI: 'true',
            })
            expect(result).toBe(false)
        })
    })
})
