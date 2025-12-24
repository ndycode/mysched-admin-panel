/**
 * Request utilities tests - getClientIp
 */
import { describe, test, expect } from 'vitest'
import { getClientIp } from '../request'
import type { NextRequest } from 'next/server'

function createMockRequest(headers: Record<string, string>, ip?: string): NextRequest {
  const headersInstance = new Headers(headers)
  return {
    headers: headersInstance,
    ip,
  } as unknown as NextRequest
}

describe('getClientIp', () => {
  test('returns x-forwarded-for header value', () => {
    const req = createMockRequest({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  test('returns x-real-ip header value', () => {
    const req = createMockRequest({ 'x-real-ip': '192.168.1.2' })
    expect(getClientIp(req)).toBe('192.168.1.2')
  })

  test('returns x-vercel-forwarded-for header value', () => {
    const req = createMockRequest({ 'x-vercel-forwarded-for': '192.168.1.3' })
    expect(getClientIp(req)).toBe('192.168.1.3')
  })

  test('returns cf-connecting-ip header value (Cloudflare)', () => {
    const req = createMockRequest({ 'cf-connecting-ip': '192.168.1.4' })
    expect(getClientIp(req)).toBe('192.168.1.4')
  })

  test('returns fastly-client-ip header value', () => {
    const req = createMockRequest({ 'fastly-client-ip': '192.168.1.5' })
    expect(getClientIp(req)).toBe('192.168.1.5')
  })

  test('parses forwarded header correctly', () => {
    const req = createMockRequest({ forwarded: 'for=192.168.1.6;proto=https' })
    expect(getClientIp(req)).toBe('192.168.1.6')
  })

  test('parses forwarded header with quoted IP', () => {
    const req = createMockRequest({ forwarded: 'for="192.168.1.7"' })
    expect(getClientIp(req)).toBe('192.168.1.7')
  })

  test('parses forwarded header with IPv6', () => {
    const req = createMockRequest({ forwarded: 'for=[2001:db8::1]' })
    expect(getClientIp(req)).toBe('2001:db8::1')
  })

  test('prioritizes x-forwarded-for over other headers', () => {
    const req = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '192.168.1.2',
      'cf-connecting-ip': '192.168.1.3',
    })
    expect(getClientIp(req)).toBe('192.168.1.1')
  })

  test('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = createMockRequest({
      'x-real-ip': '192.168.1.2',
      'cf-connecting-ip': '192.168.1.3',
    })
    expect(getClientIp(req)).toBe('192.168.1.2')
  })

  test('returns request.ip when no headers present', () => {
    const req = createMockRequest({}, '10.0.0.1')
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  test('returns default fallback when no IP found', () => {
    const req = createMockRequest({})
    expect(getClientIp(req)).toBe('0')
  })

  test('returns custom fallback when no IP found', () => {
    const req = createMockRequest({})
    expect(getClientIp(req, 'unknown')).toBe('unknown')
  })

  test('handles empty header values', () => {
    const req = createMockRequest({ 'x-forwarded-for': '' })
    expect(getClientIp(req)).toBe('0')
  })

  test('handles whitespace-only header values', () => {
    const req = createMockRequest({ 'x-forwarded-for': '   ' })
    expect(getClientIp(req)).toBe('0')
  })

  test('takes first IP from comma-separated list', () => {
    const req = createMockRequest({ 'x-forwarded-for': '  203.0.113.1  ,  198.51.100.1  ' })
    expect(getClientIp(req)).toBe('203.0.113.1')
  })
})
