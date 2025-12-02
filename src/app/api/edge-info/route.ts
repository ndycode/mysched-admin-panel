import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // get Vercel geo/IP headers fast

export async function GET(req: NextRequest) {
  const h = req.headers

  // Vercel-provided headers
  const ip =
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-vercel-forwarded-for') ||
    'unknown'

  const city = h.get('x-vercel-ip-city') || ''
  const region = h.get('x-vercel-ip-country-region') || ''
  const countryCode = h.get('x-vercel-ip-country') || ''
  const country = h.get('x-vercel-ip-country') || ''
  const lat = h.get('x-vercel-ip-latitude') || ''
  const lon = h.get('x-vercel-ip-longitude') || ''

  // human location string
  const parts = [city, region, country].filter(Boolean)
  const location = parts.join(', ') || 'Unknown'

  const proto = h.get('x-forwarded-proto') || 'http'
  const secure = proto === 'https'

  return NextResponse.json({
    ip,
    location,
    city,
    region,
    countryCode,
    lat,
    lon,
    secure,
  })
}
