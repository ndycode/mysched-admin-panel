import { describe, it, expect } from 'vitest'
import {
    decodeMaybeBase64,
    normalizeSupabaseUrl,
    deriveSupabaseUrl,
    deriveSupabaseAnonKey,
    deriveSupabaseServiceRole,
    resolveSupabaseEnv,
} from '../env-alias'

describe('env-alias', () => {
    describe('decodeMaybeBase64', () => {
        it('should return undefined for undefined', () => {
            expect(decodeMaybeBase64(undefined)).toBeUndefined()
        })

        it('should return undefined for empty string', () => {
            expect(decodeMaybeBase64('')).toBeUndefined()
        })

        it('should return plain text as-is if not base64', () => {
            expect(decodeMaybeBase64('plain-text')).toBe('plain-text')
        })

        it('should decode valid base64', () => {
            const encoded = Buffer.from('hello', 'utf8').toString('base64')
            expect(decodeMaybeBase64(encoded)).toBe('hello')
        })
    })

    describe('normalizeSupabaseUrl', () => {
        it('should add https protocol if missing', () => {
            expect(normalizeSupabaseUrl('example.supabase.co')).toBe('https://example.supabase.co')
        })

        it('should keep http for localhost', () => {
            const result = normalizeSupabaseUrl('http://localhost:54321')
            expect(result).toBe('http://localhost:54321')
        })

        it('should keep http for 127.0.0.1', () => {
            const result = normalizeSupabaseUrl('http://127.0.0.1:54321')
            expect(result).toBe('http://127.0.0.1:54321')
        })

        it('should remove trailing slashes', () => {
            const result = normalizeSupabaseUrl('https://example.supabase.co/')
            expect(result).toBe('https://example.supabase.co')
        })

        it('should return empty string for empty input', () => {
            expect(normalizeSupabaseUrl('')).toBe('')
        })
    })

    describe('deriveSupabaseUrl', () => {
        it('should use NEXT_PUBLIC_SUPABASE_URL first', () => {
            const result = deriveSupabaseUrl({
                NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
                SUPABASE_URL: 'https://other.supabase.co',
            })
            expect(result).toBe('https://project.supabase.co')
        })

        it('should fallback to SUPABASE_URL', () => {
            const result = deriveSupabaseUrl({
                SUPABASE_URL: 'https://project.supabase.co',
            })
            expect(result).toBe('https://project.supabase.co')
        })

        it('should derive from project ref', () => {
            const result = deriveSupabaseUrl({
                NEXT_PUBLIC_SUPABASE_REFERENCE: 'myproject',
            })
            expect(result).toBe('https://myproject.supabase.co')
        })

        it('should return undefined when no URL available', () => {
            expect(deriveSupabaseUrl({})).toBeUndefined()
        })
    })

    describe('deriveSupabaseAnonKey', () => {
        it('should use NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
            const result = deriveSupabaseAnonKey({
                NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-123',
            })
            expect(result).toBe('anon-key-123')
        })

        it('should fallback to SUPABASE_ANON_KEY', () => {
            const result = deriveSupabaseAnonKey({
                SUPABASE_ANON_KEY: 'fallback-anon',
            })
            expect(result).toBe('fallback-anon')
        })

        it('should decode base64 key', () => {
            const encoded = Buffer.from('decoded-key', 'utf8').toString('base64')
            const result = deriveSupabaseAnonKey({
                SUPABASE_ANON_KEY_B64: encoded,
            })
            expect(result).toBe('decoded-key')
        })

        it('should return undefined when not set', () => {
            expect(deriveSupabaseAnonKey({})).toBeUndefined()
        })
    })

    describe('deriveSupabaseServiceRole', () => {
        it('should use SUPABASE_SERVICE_ROLE', () => {
            const result = deriveSupabaseServiceRole({
                SUPABASE_SERVICE_ROLE: 'service-role-key',
            })
            expect(result).toBe('service-role-key')
        })

        it('should fallback to SUPABASE_SERVICE_ROLE_KEY', () => {
            const result = deriveSupabaseServiceRole({
                SUPABASE_SERVICE_ROLE_KEY: 'alt-key',
            })
            expect(result).toBe('alt-key')
        })

        it('should decode base64 service role', () => {
            const encoded = Buffer.from('decoded-service', 'utf8').toString('base64')
            const result = deriveSupabaseServiceRole({
                SUPABASE_SERVICE_ROLE_B64: encoded,
            })
            expect(result).toBe('decoded-service')
        })
    })

    describe('resolveSupabaseEnv', () => {
        it('should resolve all three values', () => {
            const result = resolveSupabaseEnv({
                NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
                NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
                SUPABASE_SERVICE_ROLE: 'service-key',
            })
            expect(result.url).toBe('https://test.supabase.co')
            expect(result.anonKey).toBe('anon-key')
            expect(result.serviceRole).toBe('service-key')
        })

        it('should return undefined for missing values', () => {
            const result = resolveSupabaseEnv({})
            expect(result.url).toBeUndefined()
            expect(result.anonKey).toBeUndefined()
            expect(result.serviceRole).toBeUndefined()
        })
    })
})
