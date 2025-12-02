export type HttpError = Error & { status: number; code: string; details?: unknown }

function toCode(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'unknown_error'
  if (/^[a-z0-9_]+$/.test(trimmed)) return trimmed
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown_error'
}

function codeToMessage(code: string): string {
  return code
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeDetail(detail: unknown): { message?: string; payload?: Record<string, unknown> } {
  if (detail === undefined) return {}
  if (typeof detail === 'string') return { message: detail }
  if (detail && typeof detail === 'object') {
    const { message, ...rest } = detail as { message?: unknown; [key: string]: unknown }
    const payload = Object.keys(rest).length > 0 ? rest : undefined
    return {
      message: typeof message === 'string' ? message : undefined,
      payload,
    }
  }
  return { payload: { value: detail as unknown } }
}

export function createHttpError(status: number, codeOrMessage: string, detail?: unknown): HttpError {
  const code = toCode(codeOrMessage)
  const { message, payload } = normalizeDetail(detail)
  const useCodeFormat = /^[a-z0-9_]+$/.test(codeOrMessage)
  const fallback = useCodeFormat ? codeToMessage(code) : codeOrMessage
  const resolvedMessage = useCodeFormat ? message ?? fallback : fallback
  const error = new Error(resolvedMessage) as HttpError
  error.status = status
  error.code = code
  if (payload !== undefined) {
    error.details = payload
  }
  return error
}

export function isHttpError(error: unknown, status?: number): error is HttpError {
  if (!error || typeof error !== 'object') return false
  if (!('status' in error) || !('code' in error)) return false
  const value = (error as { status?: unknown }).status
  if (typeof value !== 'number' || Number.isFinite(value) === false) return false
  if (typeof status === 'number' && value !== status) {
    return false
  }
  return true
}

export function httpErrorBody(error: HttpError) {
  const body: Record<string, unknown> = {
    code: error.code,
    message: error.message,
  }
  if (error.details !== undefined) {
    body.details = error.details
  }
  return body
}
