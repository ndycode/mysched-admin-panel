import { useToast } from '@/components/toast'
import { normalizeApiError, normalizeErrorResponse } from './api-error-client'

/**
 * Performs a JSON fetch request with same-origin cookies and normalized errors.
 * @template T The expected response type.
 * @param {RequestInfo | URL} input - The request URL or Request object.
 * @param {RequestInit} [init] - Optional fetch options.
 * @returns {Promise<T>} The parsed JSON response.
 * @throws {Error} If the response is not OK or contains error details.
 */
export async function api<T = unknown>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const hasBody = init.body !== undefined
  const res = await fetch(input, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })

  let payload: unknown = null
  try {
    payload = await res.json()
  } catch {
    // ignore non-JSON bodies
  }

  if (!res.ok) {
    const normalized = normalizeErrorResponse(payload, res.status)
    const error = new Error(normalized.message)
    ;(error as { code?: string | null }).code = normalized.code
    ;(error as { status?: number }).status = res.status
    throw error
  }
  return payload as T
}

/**
 * Returns a wrapper for async API calls that surfaces errors via toast notifications.
 * @returns {(fn: () => Promise<T>) => Promise<T>} A function that wraps an async API call.
 */
export function useApiWithToast() {
  const toast = useToast()
  return async <T>(fn: () => Promise<T>) => {
    try {
      return await fn()
    } catch (e: unknown) {
      const { message } = normalizeApiError(e)
      toast({ kind: 'error', msg: message })
      throw e
    }
  }
}
