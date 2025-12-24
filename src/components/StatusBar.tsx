'use client'

/**
 * StatusBar: Fixed bottom bar showing connection status and edge info.
 * Fetches /api/edge-info and displays IP, location, and security status.
 */
import React from 'react'
import { useEffect, useState } from 'react'

type EdgeInfo = {
  ip: string
  location: string
  secure: boolean
}

export default function StatusBar() {
  const [info, setInfo] = useState<EdgeInfo | null>(null)

  useEffect(() => {
    let alive = true
      ; (async () => {
        try {
          const r = await fetch('/api/edge-info', { cache: 'no-store' })
          const j = (await r.json()) as EdgeInfo
          if (alive) setInfo(j)
        } catch {
          // ignore
        }
      })()
    return () => {
      alive = false
    }
  }, [])

  const text = info
    ? `CONNECTED | IP: ${info.ip} | LOCATION: ${info.location} | STATUS: ${info.secure ? 'SECURE' : 'INSECURE'
    }`
    : 'CONNECTING...'

  return (
    <div
      className="caps-label fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 justify-center overflow-hidden rounded-3xl border border-white/60 bg-white/60 px-4 py-2 text-[var(--muted-foreground)] backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <div className="status-bar-marquee whitespace-nowrap">
        {text} &nbsp;&nbsp;&nbsp;&nbsp; {text}
      </div>
    </div>
  )
}
