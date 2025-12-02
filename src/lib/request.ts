import type { NextRequest } from 'next/server'

function firstHeaderValue(headerValue: string | null): string | null {
  if (!headerValue) return null
  const first = headerValue.split(',')[0]?.trim()
  return first && first.length > 0 ? first : null
}

function fromForwarded(headerValue: string | null): string | null {
  if (!headerValue) return null
  const match = /for=(?:\"?)(\[?[A-Fa-f0-9:.]+\]?)/i.exec(headerValue)
  if (match && match[1]) {
    return match[1].replace(/^\[|\]$/g, '')
  }
  return null
}

export function getClientIp(req: NextRequest, fallback = '0'): string {
  const headers = req.headers

  const forwardedFor = firstHeaderValue(headers.get('x-forwarded-for'))
  if (forwardedFor) return forwardedFor

  const realIp = firstHeaderValue(headers.get('x-real-ip'))
  if (realIp) return realIp

  const vercelIp = firstHeaderValue(headers.get('x-vercel-forwarded-for'))
  if (vercelIp) return vercelIp

  const cfIp = firstHeaderValue(headers.get('cf-connecting-ip'))
  if (cfIp) return cfIp

  const fastlyIp = firstHeaderValue(headers.get('fastly-client-ip'))
  if (fastlyIp) return fastlyIp

  const forwarded = fromForwarded(headers.get('forwarded'))
  if (forwarded) return forwarded

  const remote = (req as { ip?: string | undefined }).ip
  if (remote && remote.length > 0) return remote

  return fallback
}
