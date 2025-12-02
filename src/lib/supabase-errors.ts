import { createHttpError } from './http-error'

function normalizeMessage(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

export function isSupabaseNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const status = (error as { status?: unknown }).status
  if (typeof status === 'number' && status === 404) {
    return true
  }
  const message = normalizeMessage((error as { message?: unknown }).message)
  if (!message) return false
  return message.includes('not found') || message.includes('no row found')
}

export function toSupabaseNotFoundError(error: unknown, message = 'Resource not found.') {
  if (isSupabaseNotFoundError(error)) {
    return createHttpError(404, message, error)
  }
  return null
}
