'use client'

import { useEffect, useState } from 'react'

import { sbBrowser } from '@/lib/supabase-browser'

type Row = Record<string, unknown>

function pretty(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function TestClient() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setStatus('loading')
      const sb = sbBrowser()
      const { data, error: queryError } = await sb.from('classes').select('*').limit(5)
      if (queryError) {
        setError(queryError.message)
        setStatus('error')
        return
      }
      setRows(data ?? [])
      setStatus('success')
    }

    run()
  }, [])

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Supabase Test Page</h1>

      {status === 'loading' && <p className="text-muted-foreground">Loading sample data...</p>}
      {status === 'error' && <p className="text-destructive">Error: {error}</p>}

      {status === 'success' && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left font-medium text-foreground">
              <tr>
                {Object.keys(rows[0]).map(key => (
                  <th key={key} className="border-b border-border px-3 py-2">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="odd:bg-card even:bg-muted/50">
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="border-b border-border px-3 py-2 text-foreground">
                      {pretty(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'success' && rows.length === 0 && (
        <p className="text-muted-foreground">
          No data in <code>classes</code>.
        </p>
      )}
    </main>
  )
}
