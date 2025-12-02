import { Buffer } from 'node:buffer'

import { z } from 'zod'

import { createHttpError, isHttpError } from '@/lib/http-error'
import { canonicalDay } from '@/lib/days'

import {
  compactPreviewRows,
  normalizeSectionCode,
  sanitizePreviewRow,
  type SchedulePreviewRow,
} from '../schedule-import'

/**
 * Gemini OCR env config:
 *  - GEMINI_API_KEY (required)
 *  - GEMINI_MODEL   (optional, defaults to gemini-2.5-flash)
 *  - GEMINI_FALLBACK_MODEL (optional, used when primary model is overloaded; defaults to gemini-1.5-flash)
 *  - GEMINI_API_URL (optional, override the Gemini endpoint; supports {model} token)
 */
const GeminiEnvSchema = z.object({
  GEMINI_API_KEY: z
    .string()
    .trim()
    .min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().trim().optional(),
  GEMINI_FALLBACK_MODEL: z.string().trim().optional(),
  GEMINI_API_URL: z.string().trim().optional(),
})

// Default to a stable, vision-capable model on v1beta API (2.5)
const DEFAULT_MODEL = 'gemini-2.5-flash'
const DEFAULT_FALLBACK_MODEL = 'gemini-2.5-flash'

function normalizeModelName(raw: string | undefined | null): string | null {
  if (!raw) return null
  const cleaned = raw
    .replace(/^models\//, '')
    .replace(/:generateContent$/i, '')
    .trim()

  if (!cleaned) return null
  // Some UI presets append "-latest" which isn't available on all endpoints
  if (cleaned.endsWith('-latest')) {
    return cleaned.replace(/-latest$/, '')
  }
  return cleaned
}

let cachedConfig:
  | {
    apiKey: string
    primary: { endpoint: string; model: string }
    fallback?: { endpoint: string; model: string }
  }
  | null = null

function getGeminiConfig() {
  if (cachedConfig) return cachedConfig

  const env = GeminiEnvSchema.safeParse(process.env)
  if (!env.success) {
    const [{ message }] = env.error.issues
    throw createHttpError(500, 'ocr_unavailable', message)
  }

  const apiKey = env.data.GEMINI_API_KEY.trim()
  if (!apiKey) {
    throw createHttpError(500, 'ocr_unavailable', 'GEMINI_API_KEY is required')
  }

  const model = normalizeModelName(env.data.GEMINI_MODEL) || DEFAULT_MODEL

  const endpoint =
    buildEndpointFromEnv(model, env.data.GEMINI_API_URL) ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const fallbackModelRaw =
    normalizeModelName(env.data.GEMINI_FALLBACK_MODEL) ||
    (model !== DEFAULT_FALLBACK_MODEL ? DEFAULT_FALLBACK_MODEL : '')

  const fallbackModel =
    fallbackModelRaw && fallbackModelRaw !== model ? fallbackModelRaw : null

  const fallbackEndpoint = fallbackModel
    ? buildEndpointFromEnv(fallbackModel, env.data.GEMINI_API_URL) ??
    `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent`
    : null

  cachedConfig = {
    apiKey,
    primary: { endpoint, model },
    fallback: fallbackModel && fallbackEndpoint ? { endpoint: fallbackEndpoint, model: fallbackModel } : undefined,
  }
  return cachedConfig
}

function buildEndpointFromEnv(model: string, rawUrl?: string | null) {
  if (!rawUrl) return null
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  if (trimmed.includes('{model}')) {
    return trimmed.split('{model}').join(model)
  }

  const normalized = trimmed.replace(/\/+$/, '')

  if (normalized.includes(':generateContent')) {
    return normalized
  }

  if (/\/models$/i.test(normalized)) {
    return `${normalized}/${model}:generateContent`
  }

  return `${normalized}/models/${model}:generateContent`
}

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({
                  text: z.string().optional(),
                  functionCall: z.any().optional(),
                }),
              )
              .default([]),
          })
          .optional(),
      }),
    )
    .optional(),
  promptFeedback: z.any().optional(),
})

const ScheduleResponseSchema = z
  .object({
    section_code: z.string().optional().nullable(),
    rows: z.array(z.record(z.string(), z.any())).optional().default([]),
    warnings: z.array(z.string().trim()).optional().default([]),
  })
  .passthrough()

type GeminiPayload = {
  contents: Array<{
    role: 'user'
    parts: Array<
      | { text: string }
      | {
        inlineData: { mimeType: string; data: string }
      }
    >
  }>
  generationConfig?: {
    temperature?: number
    topK?: number
    topP?: number
    responseMimeType?: string
    maxOutputTokens?: number
  }
}

type VertexGenerationConfig = {
  temperature?: number
  top_k?: number
  top_p?: number
  response_mime_type?: string
  max_output_tokens?: number
}

type VertexGeminiPayload = Omit<GeminiPayload, 'generationConfig'> & {
  generation_config?: VertexGenerationConfig
}

type GeminiRequestPayload = GeminiPayload | VertexGeminiPayload

const OCR_PROMPT = `Extract class schedule from the image into this JSON schema:
{
  "section_code": string | null,
  "rows": [
    {
      "day": string | null,
      "start_time": string | null,
      "end_time": string | null,
      "code": string | null,
      "title": string | null,
      "units": number | string | null,
      "room": string | null,
      "instructor_name": string | null
    }
  ],
  "warnings": string[]
}

Rules:
- Capture "section_code" from header (e.g. "BSIT 2-1").
- Split time ranges (e.g. "9:00-10:30") into start/end.
- Extract instructor name if present.
- Return ONLY JSON.`

function buildRequestPayload(base64: string, mimeType: string): GeminiPayload {
  return {
    contents: [
      {
        role: 'user',
        parts: [
          { text: OCR_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      topK: 1,
      topP: 0,
      responseMimeType: 'application/json',
    },
  }
}

function isVertexEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.hostname.endsWith('aiplatform.googleapis.com')) {
      return true
    }
    return /\/projects\/[^/]+\/locations\/[^/]+\/publishers\/google\/models/i.test(
      url.pathname,
    )
  } catch {
    return false
  }
}

function convertGenerationConfigToVertex(
  config: GeminiPayload['generationConfig'],
): VertexGenerationConfig {
  if (!config) return {}
  const vertex: VertexGenerationConfig = {}
  if (typeof config.temperature === 'number') {
    vertex.temperature = config.temperature
  }
  if (typeof config.topK === 'number') {
    vertex.top_k = config.topK
  }
  if (typeof config.topP === 'number') {
    vertex.top_p = config.topP
  }
  if (typeof config.maxOutputTokens === 'number') {
    vertex.max_output_tokens = config.maxOutputTokens
  }
  if (typeof config.responseMimeType === 'string') {
    vertex.response_mime_type = config.responseMimeType
  }
  return vertex
}

function normalizePayloadForEndpoint(
  payload: GeminiPayload,
  endpoint: string,
): GeminiRequestPayload {
  if (!isVertexEndpoint(endpoint) || !payload.generationConfig) {
    return payload
  }

  const { generationConfig, ...rest } = payload
  return {
    ...rest,
    generation_config: convertGenerationConfigToVertex(generationConfig),
  }
}

function extractCandidateText(data: unknown): string | null {
  const parsed = GeminiResponseSchema.safeParse(data)
  if (!parsed.success) return null
  const candidates = parsed.data.candidates ?? []
  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? []
    for (const part of parts) {
      if (typeof part.text === 'string' && part.text.trim()) {
        return part.text.trim()
      }
    }
  }
  return null
}

function isRetryableOverload(error: unknown): boolean {
  if (!isHttpError(error)) return false
  if (error.code === 'ocr_rate_limited') return true

  const details = (error as { details?: unknown }).details as { status?: unknown; body?: unknown } | undefined
  const status = typeof details?.status === 'number' ? details.status : undefined
  const body = typeof details?.body === 'string' ? details.body : ''
  const msg = `${error.message} ${JSON.stringify(details ?? {})}`

  if (status === 503) return true
  return /overloaded|unavailable|please try again/i.test(`${msg} ${body}`)
}

async function postToGemini({
  payload,
  endpoint,
  apiKey,
  timeoutMs,
  retryOnResponseMimeTypeError = true,
}: {
  payload: GeminiPayload
  endpoint: string
  apiKey: string
  timeoutMs: number
  retryOnResponseMimeTypeError?: boolean
}): Promise<Response> {
  const url = new URL(endpoint)
  if (!url.searchParams.has('key')) {
    url.searchParams.set('key', apiKey)
  }

  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const requestPayload = normalizePayloadForEndpoint(payload, endpoint)

    try {
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      })

      if (!res.ok) {
        await raiseGeminiError(res)
      }

      return res
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw createHttpError(504, 'ocr_timeout', 'OCR request timed out.')
      }

      // Some endpoints (or older models) reject responseMimeType; retry once without it
      if (
        retryOnResponseMimeTypeError &&
        isHttpError(error) &&
        error.code === 'ocr_invalid_request' &&
        /responseMimeType|response_mime_type/i.test(
          `${error.message} ${JSON.stringify((error as { details?: unknown }).details ?? '')}`,
        )
      ) {
        const trimmedPayload: GeminiPayload = {
          ...payload,
          generationConfig: payload.generationConfig
            ? { ...payload.generationConfig }
            : undefined,
        }

        if (trimmedPayload.generationConfig) {
          delete trimmedPayload.generationConfig.responseMimeType
        }

        return postToGemini({
          payload: trimmedPayload,
          endpoint,
          apiKey,
          timeoutMs,
          retryOnResponseMimeTypeError: false,
        })
      }

      // Retry on overload/rate-limit once or twice with small backoff
      if (isRetryableOverload(error) && attempt < maxAttempts) {
        const backoffMs = 300 * 2 ** (attempt - 1)
        await new Promise(res => setTimeout(res, backoffMs))
        continue
      }

      if (isHttpError(error)) {
        throw error
      }

      throw createHttpError(502, 'ocr_request_failed', error)
    } finally {
      clearTimeout(timeout)
    }
  }

  // Should never reach here because we either returned or threw
  throw createHttpError(502, 'ocr_request_failed', 'Exhausted OCR retries.')
}

type GeminiTarget = { endpoint: string; model: string; apiKey: string }

async function requestGeminiWithFallback(
  payload: GeminiPayload,
  targets: GeminiTarget[],
  timeoutMs: number,
) {
  if (!targets.length) {
    throw createHttpError(500, 'ocr_unavailable', 'No Gemini targets configured.')
  }

  let lastError: unknown = null
  for (const target of targets) {
    try {
      return await postToGemini({
        payload,
        endpoint: target.endpoint,
        apiKey: target.apiKey,
        timeoutMs,
      })
    } catch (error) {
      lastError = error
      if (
        isRetryableOverload(error) ||
        (isHttpError(error) &&
          (error.code === 'ocr_model_not_found' || error.code === 'ocr_invalid_request'))
      ) {
        // Try the next target (fallback model/endpoint)
        continue
      }
      throw error
    }
  }

  if (lastError) throw lastError
  throw createHttpError(502, 'ocr_request_failed', 'Failed to reach any Gemini target.')
}

function stripCodeFences(payload: string): string {
  const fenced = /```json([\s\S]*?)```/i.exec(payload)
  if (fenced && fenced[1]) return fenced[1].trim()
  const generic = /```([\s\S]*?)```/.exec(payload)
  if (generic && generic[1]) return generic[1].trim()
  return payload.trim()
}

async function raiseGeminiError(response: Response): Promise<never> {
  const rawBody = await response.text()
  const trimmedBody = rawBody.trim().slice(0, 1_000)

  let parsed: unknown
  try {
    parsed = rawBody ? JSON.parse(rawBody) : null
  } catch {
    parsed = null
  }

  const extractedMessage = (() => {
    if (
      parsed &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      parsed.error &&
      typeof parsed.error === 'object' &&
      parsed.error &&
      'message' in parsed.error &&
      typeof (parsed.error as { message?: unknown }).message === 'string'
    ) {
      return (parsed.error as { message: string }).message
    }
    if (parsed && typeof parsed === 'object' && 'message' in parsed && typeof parsed.message === 'string') {
      return parsed.message
    }
    return trimmedBody || `Gemini responded with status ${response.status}.`
  })()

  const details = {
    status: response.status,
    body: trimmedBody,
  }

  if (response.status === 401 || response.status === 403) {
    throw createHttpError(400, 'ocr_auth_failed', { message: extractedMessage, ...details })
  }
  if (response.status === 404) {
    throw createHttpError(400, 'ocr_model_not_found', { message: extractedMessage, ...details })
  }
  if (response.status === 429) {
    throw createHttpError(429, 'ocr_rate_limited', { message: extractedMessage, ...details })
  }
  if (response.status >= 400 && response.status < 500) {
    throw createHttpError(400, 'ocr_invalid_request', { message: extractedMessage, ...details })
  }

  throw createHttpError(502, 'ocr_response_error', { message: extractedMessage, ...details })
}

export async function verifyGeminiConnection(): Promise<{ latencyMs: number }> {
  const { apiKey, primary, fallback } = getGeminiConfig()
  const targets: GeminiTarget[] = [{ ...primary, apiKey }]
  if (fallback) targets.push({ ...fallback, apiKey })

  const payload: GeminiPayload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'Reply with the word "pong".' }],
      },
    ],
    generationConfig: {
      temperature: 0,
      topK: 1,
      topP: 0,
      maxOutputTokens: 8,
      responseMimeType: 'text/plain',
    },
  }

  const start = Date.now()
  const response = await requestGeminiWithFallback(payload, targets, 15_000)

  const latencyMs = Date.now() - start

  // Drain body to surface JSON parse issues
  await response.json().catch(error => {
    throw createHttpError(502, 'ocr_invalid_response', error)
  })

  return { latencyMs }
}

export type ScheduleOcrResult = {
  sectionCode: string | null
  rows: SchedulePreviewRow[]
  warnings: string[]
  rawText?: string
}

export async function detectScheduleFromImage(
  image: Blob | ArrayBuffer | Uint8Array | Buffer,
  options?: { mimeType?: string },
): Promise<ScheduleOcrResult> {
  const { apiKey, primary, fallback } = getGeminiConfig()
  const targets: GeminiTarget[] = [{ ...primary, apiKey }]
  if (fallback) targets.push({ ...fallback, apiKey })

  const buffer = await (async () => {
    if (Buffer.isBuffer(image)) return image
    if (image instanceof ArrayBuffer) return Buffer.from(image)
    if (image instanceof Uint8Array) return Buffer.from(image)
    if (typeof (image as Blob).arrayBuffer === 'function') {
      const data = await (image as Blob).arrayBuffer()
      return Buffer.from(data)
    }
    throw createHttpError(
      400,
      'invalid_image_payload',
      'Unsupported image payload.',
    )
  })()

  if (buffer.length === 0) {
    throw createHttpError(
      422,
      'empty_image_payload',
      'Uploaded image is empty.',
    )
  }

  const mimeType =
    options?.mimeType && options.mimeType.trim()
      ? options.mimeType
      : 'image/png'
  const base64 = buffer.toString('base64')
  const payload = buildRequestPayload(base64, mimeType)

  const response = await requestGeminiWithFallback(payload, targets, 45_000)

  let rawText: string | null = null
  try {
    const json = await response.json()
    rawText = extractCandidateText(json)
    if (!rawText) {
      throw createHttpError(502, 'ocr_empty_response', json)
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error
    }
    throw createHttpError(502, 'ocr_invalid_response', error)
  }

  let parsedResult
  try {
    parsedResult = ScheduleResponseSchema.parse(
      JSON.parse(stripCodeFences(rawText!)),
    )
  } catch (error) {
    throw createHttpError(502, 'ocr_invalid_json', error)
  }

  const warnings = [...parsedResult.warnings]
  const rows: SchedulePreviewRow[] = []
  for (const entry of parsedResult.rows ?? []) {
    rows.push(sanitizePreviewRow(entry, warnings))
  }

  const sanitizedRows = compactPreviewRows(rows)

  const completedRows: SchedulePreviewRow[] = []
  let lastDay: string | null = null
  sanitizedRows.forEach((row, index) => {
    const nextRow = { ...row }
    const trimmedDay = nextRow.day?.trim()
    const rowHasData =
      Boolean(nextRow.start) ||
      Boolean(nextRow.end) ||
      Boolean(nextRow.code) ||
      Boolean(nextRow.title) ||
      Boolean(nextRow.room) ||
      Boolean(nextRow.instructor_name) ||
      nextRow.units !== null

    if (trimmedDay) {
      lastDay = trimmedDay
      nextRow.day = trimmedDay
    } else if (lastDay && rowHasData) {
      nextRow.day = lastDay
    } else if (!trimmedDay && rowHasData) {
      warnings.push(`Row ${index + 1} is missing a day value.`)
    }
    if (nextRow.day) {
      const normalized = canonicalDay(nextRow.day)
      nextRow.day = normalized ?? nextRow.day
    }
    completedRows.push(nextRow)
  })

  return {
    sectionCode: normalizeSectionCode(parsedResult.section_code ?? null),
    rows: completedRows,
    warnings,
    rawText,
  }
}
