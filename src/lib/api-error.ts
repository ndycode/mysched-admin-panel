import { z } from 'zod'

export function extractStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === 'number' && Number.isFinite(status)) {
      return status
    }
  }
  return null
}

export function validationDetails(error: z.ZodError): { message: string; issues: z.ZodIssue[] } {
  const flat = error.flatten()
  const fieldMessages = Object.values(flat.fieldErrors ?? {})
    .flat()
    .filter((msg): msg is string => typeof msg === 'string' && msg.length > 0)
  const formMessages = flat.formErrors.filter(
    (msg): msg is string => typeof msg === 'string' && msg.length > 0,
  )
  const combined = [...formMessages, ...fieldMessages]

  return {
    message: combined.join(', ') || 'Invalid request payload.',
    issues: error.issues,
  }
}
