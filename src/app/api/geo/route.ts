import { NextRequest, NextResponse } from 'next/server'

import { throttle } from '@/lib/rate'
import { getClientIp } from '@/lib/request'
import { logErr } from '@/lib/log'

export const dynamic = 'force-dynamic'

function isSecureRequest(req: NextRequest) {
  return (req.headers.get('x-forwarded-proto') || '').toLowerCase() === 'https'
}

export async function GET(req: NextRequest) {
  const rawIp = getClientIp(req, 'unknown')
  const rateKey = rawIp === 'unknown' ? 'geo:unknown' : rawIp

  try {
    await throttle(rateKey)
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? (error as { status?: number }).status : null
    if (status === 429) {
      return NextResponse.json(
        {
          ip: rawIp,
          city: '',
          region: '',
          country: '',
          secure: isSecureRequest(req),
          error: 'Too many requests. Please try again later.',
        },
        { status: 429 },
      )
    }

    const msg = logErr('/api/geo GET throttle', error, { method: req.method })
    return NextResponse.json(
      {
        ip: rawIp,
        city: '',
        region: '',
        country: '',
        secure: isSecureRequest(req),
        error: msg || 'Internal Server Error',
      },
      { status: 500 },
    )
  }

  let city = ''
  let region = ''
  let country = ''

  if (rawIp !== 'unknown') {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    try {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(rawIp)}/json/`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      if (res.ok) {
        const payload = await res.json()
        if (!payload?.error) {
          city = payload.city || ''
          region = payload.region || ''
          country = payload.country_name || payload.country || ''
        }
      } else {
        logErr('/api/geo GET', new Error(`Geo lookup failed with status ${res.status}`), {
          method: req.method,
          status: res.status,
        })
      }
    } catch (error) {
      logErr('/api/geo GET', error, { method: req.method })
    } finally {
      clearTimeout(timeout)
    }
  }

  return NextResponse.json({
    ip: rawIp,
    city,
    region,
    country,
    secure: isSecureRequest(req),
  })
}
