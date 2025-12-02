export type NormalizedApiError = { message: string; code: string | null }

type ErrorLike = { message?: unknown; code?: unknown; status?: unknown }
type ErrorPayload = {
  error?: unknown
  message?: unknown
  code?: unknown
  status?: unknown
  error_code?: unknown
  error_message?: unknown
}

function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function pickCode(payload: ErrorPayload, status?: number): string | null {
  const code =
    pickString(payload.code) ||
    pickString(payload.error_code) ||
    (typeof payload.status === 'string' ? payload.status : null) ||
    (typeof status === 'number' ? `HTTP_${status}` : null)
  return code
}

export function normalizeErrorResponse(payload: unknown, status?: number): NormalizedApiError {
  const body = (payload ?? {}) as ErrorPayload
  const message =
    pickString(body.message) ||
    pickString(body.error_message) ||
    pickString(body.error) ||
    (typeof status === 'number' ? `Request failed with status ${status}` : 'Request failed')

  return {
    message,
    code: pickCode(body, status),
  }
}

export function normalizeApiError(error: unknown, fallback = 'Something went wrong'): NormalizedApiError {
  if (error && typeof error === 'object') {
    const shaped = error as ErrorLike
    const message = pickString(shaped.message)
    const code = pickString((shaped as { code?: unknown }).code)
    if (message) {
      return { message, code: code ?? null }
    }
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return { message: error.trim(), code: null }
  }

  if (error && typeof error === 'object') {
    const dataMessage =
      pickString((error as ErrorPayload).message) ||
      pickString((error as ErrorPayload).error_message) ||
      pickString((error as ErrorPayload).error)
    const dataCode = pickCode(error as ErrorPayload)
    if (dataMessage || dataCode) {
      return { message: dataMessage ?? fallback, code: dataCode }
    }
  }

  return { message: fallback, code: null }
}
