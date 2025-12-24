import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

describe('edge-info route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exports GET handler', async () => {
    const module = await import('@/app/api/edge-info/route')
    expect(typeof module.GET).toBe('function')
  })

  it('exports edge runtime', async () => {
    const module = await import('@/app/api/edge-info/route')
    expect(module.runtime).toBe('edge')
  })

  it('returns geo info from Vercel headers', async () => {
    const { GET } = await import('@/app/api/edge-info/route')
    const req = new NextRequest('http://localhost/api/edge-info', {
      headers: {
        'x-real-ip': '1.2.3.4',
        'x-vercel-ip-city': 'New York',
        'x-vercel-ip-country-region': 'NY',
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-latitude': '40.7128',
        'x-vercel-ip-longitude': '-74.0060',
        'x-forwarded-proto': 'https',
      },
    })

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ip).toBe('1.2.3.4')
    expect(body.city).toBe('New York')
    expect(body.region).toBe('NY')
    expect(body.countryCode).toBe('US')
    expect(body.lat).toBe('40.7128')
    expect(body.lon).toBe('-74.0060')
    expect(body.secure).toBe(true)
    expect(body.location).toBe('New York, NY, US')
  })

  it('handles missing headers gracefully', async () => {
    const { GET } = await import('@/app/api/edge-info/route')
    const req = new NextRequest('http://localhost/api/edge-info')

    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ip).toBe('unknown')
    expect(body.city).toBe('')
    expect(body.region).toBe('')
    expect(body.location).toBe('Unknown')
    expect(body.secure).toBe(false)
  })

  it('uses x-forwarded-for when x-real-ip is missing', async () => {
    const { GET } = await import('@/app/api/edge-info/route')
    const req = new NextRequest('http://localhost/api/edge-info', {
      headers: {
        'x-forwarded-for': '5.6.7.8, 9.10.11.12',
      },
    })

    const res = await GET(req)
    const body = await res.json()

    expect(body.ip).toBe('5.6.7.8')
  })

  it('uses x-vercel-forwarded-for as fallback', async () => {
    const { GET } = await import('@/app/api/edge-info/route')
    const req = new NextRequest('http://localhost/api/edge-info', {
      headers: {
        'x-vercel-forwarded-for': '10.20.30.40',
      },
    })

    const res = await GET(req)
    const body = await res.json()

    expect(body.ip).toBe('10.20.30.40')
  })

  it('builds location string from available parts', async () => {
    const { GET } = await import('@/app/api/edge-info/route')
    
    // Only city
    const req1 = new NextRequest('http://localhost/api/edge-info', {
      headers: { 'x-vercel-ip-city': 'Tokyo' },
    })
    const body1 = await (await GET(req1)).json()
    expect(body1.location).toBe('Tokyo')

    // City and country
    const req2 = new NextRequest('http://localhost/api/edge-info', {
      headers: { 
        'x-vercel-ip-city': 'London',
        'x-vercel-ip-country': 'UK',
      },
    })
    const body2 = await (await GET(req2)).json()
    expect(body2.location).toBe('London, UK')
  })
})
