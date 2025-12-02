'use client'

// src/app/login/page.tsx

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { getSupabaseBrowserStatus, type SupabaseBrowserStatus } from '@/lib/env'
import { sbBrowser } from '@/lib/supabase-browser'
import { AnimatedActionBtn } from '@/components/ui/AnimatedActionBtn'
import { IconSlideInButton } from '@/components/ui/IconSlideInButton'
import { ClickSpark } from '@/components/ui/ClickSpark'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

// Reusing the CARD_BASE style from dashboard design system manually since we can't easily import it if it's not exported from a shared index
const CARD_BASE = 'rounded-xl border border-border bg-card text-card-foreground shadow-sm'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldErrors = {
  email?: string
  password?: string
}

type NormalizedAuthError = {
  message: string
  isCredentialIssue: boolean
}

function normalizeAuthError(
  error: unknown,
  fallbackMessage: string,
): NormalizedAuthError {
  const defaultError: NormalizedAuthError = {
    message: fallbackMessage,
    isCredentialIssue: false,
  }

  if (!error) {
    return defaultError
  }

  const err = error as Partial<Error> & { status?: number } & {
    message?: string | null
  }

  const rawMessage = typeof err?.message === 'string' ? err.message.trim() : ''
  const baseMessage = rawMessage || fallbackMessage
  const normalized = baseMessage.toLowerCase()

  const networkHints = [
    'failed to fetch',
    'fetch failed',
    'network request failed',
    'connection refused',
  ]

  if (networkHints.some((hint) => normalized.includes(hint))) {
    const details = rawMessage && rawMessage !== fallbackMessage ? ` (${rawMessage})` : ''
    return {
      message:
        'Unable to reach the authentication service. Please verify the configuration or try again shortly.' +
        details,
      isCredentialIssue: false,
    }
  }

  const isCredentialIssue =
    typeof err?.status === 'number'
      ? err.status >= 400 && err.status < 500
      : false

  return {
    message: baseMessage,
    isCredentialIssue,
  }
}

function validateFields(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {}
  const normalizedEmail = values.email.trim()
  const normalizedPassword = values.password.trim()

  if (!normalizedEmail) {
    errors.email = 'Email is required'
  } else if (!EMAIL_REGEX.test(normalizedEmail)) {
    errors.email = 'Enter a valid email address'
  }

  if (!normalizedPassword) {
    errors.password = 'Password is required'
  }

  return errors
}

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

type SupabaseEnvIssue = {
  message: string
  missingKeys: string[]
  hasServiceRole: boolean
}

type SupabaseEnvWarning = {
  message: string
}

type SupabaseEnvResolution = {
  issue: SupabaseEnvIssue | null
  warning: SupabaseEnvWarning | null
}

function isSupabaseStatus(value: unknown): value is SupabaseBrowserStatus {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SupabaseBrowserStatus>
  return (
    typeof candidate.configured === 'boolean' &&
    Array.isArray(candidate.missingPublicKeys) &&
    typeof candidate.usingLocalFallback === 'boolean' &&
    typeof candidate.serviceRoleConfigured === 'boolean' &&
    typeof candidate.runningOnVercel === 'boolean' &&
    'vercelProjectName' in candidate
  )
}

function resolveSupabaseEnv(status: SupabaseBrowserStatus): SupabaseEnvResolution {
  if (status.configured) {
    return {
      issue: null,
      warning: status.serviceRoleConfigured
        ? null
        : {
          message:
            'The Supabase service role key is missing. Server-side operations may fail until it is configured.',
        },
    }
  }

  if (status.usingLocalFallback) {
    const missingKeys = new Set(status.missingPublicKeys)
    if (!status.serviceRoleConfigured) {
      missingKeys.add('SUPABASE_SERVICE_ROLE')
    }

    const missingMessage = missingKeys.size
      ? ` Missing variables: ${Array.from(missingKeys).join(', ')}.`
      : ''

    const vercelHint = status.runningOnVercel
      ? status.vercelProjectName
        ? ` Check the Vercel project settings for "${status.vercelProjectName}" to confirm the Supabase environment variables are configured.`
        : ' Check the Vercel project settings to confirm the Supabase environment variables are configured.'
      : ''

    return {
      issue: null,
      warning: {
        message:
          'Supabase authentication is using local development defaults. Start the local Supabase stack or configure remote credentials before deploying.' +
          missingMessage +
          vercelHint,
      },
    }
  }

  if (status.missingPublicKeys.length > 0) {
    const missingKeys = [...status.missingPublicKeys]
    if (!status.serviceRoleConfigured) {
      missingKeys.push('SUPABASE_SERVICE_ROLE')
    }

    const vercelHint = status.runningOnVercel
      ? status.vercelProjectName
        ? ` Verify the environment variables for "${status.vercelProjectName}" in Vercel include these keys.`
        : ' Verify the project environment variables in Vercel include these keys.'
      : ''
    return {
      issue: {
        message:
          'Supabase environment variables are missing. Provide the browser credentials before attempting to sign in.',
        missingKeys,
        hasServiceRole: status.serviceRoleConfigured,
      },
      warning: vercelHint
        ? {
          message: vercelHint,
        }
        : null,
    }
  }

  return {
    issue: {
      message: 'Supabase authentication is not configured for this deployment.',
      missingKeys: [],
      hasServiceRole: status.serviceRoleConfigured,
    },
    warning: null,
  }
}

function LoginInner() {
  const router = useRouter()
  const qs = useSearchParams()
  const reason = qs.get('reason')
  const initialStatus = useMemo(getSupabaseBrowserStatus, [])
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseBrowserStatus>(
    initialStatus,
  )
  const [envStatusError, setEnvStatusError] = useState<string | null>(null)
  const { issue: supabaseIssue } = useMemo(
    () => resolveSupabaseEnv(supabaseStatus),
    [supabaseStatus],
  )
  useEffect(() => {
    let cancelled = false

    async function refreshStatus() {
      try {
        const response = await fetch('/api/env-status', {
          cache: 'no-store',
        })
        if (!response.ok) {
          let errorDetails: unknown = null
          const contentType = response.headers.get('content-type') ?? ''
          try {
            if (contentType.includes('application/json')) {
              errorDetails = await response.json()
            } else {
              const text = await response.text()
              errorDetails = text || null
            }
          } catch (parseError) {
            errorDetails = {
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
            }
          }

          const serializedDetails =
            typeof errorDetails === 'string'
              ? errorDetails
              : errorDetails
                ? JSON.stringify(errorDetails)
                : 'No additional details provided'

          const err = new Error(
            `Failed to fetch Supabase environment status (${response.status} ${response.statusText}): ${serializedDetails}`,
          ) as Error & { cause?: unknown }
          err.cause = errorDetails
          throw err
        }
        const payload = (await response.json()) as unknown

        let nextStatus: SupabaseBrowserStatus | null = null

        if (isSupabaseStatus(payload)) {
          nextStatus = payload
        } else if (payload && typeof payload === 'object' && 'ok' in payload) {
          const result = payload as {
            ok: boolean
            status?: unknown
            error?: string
            message?: string
            missingKeys?: unknown
          }

          if (!result.ok) {
            const message =
              typeof result.message === 'string' && result.message.trim()
                ? result.message.trim()
                : typeof result.error === 'string' && result.error.trim()
                  ? result.error.trim()
                  : 'Supabase environment status endpoint reported an error.'

            const missingKeys = Array.isArray(result.missingKeys)
              ? result.missingKeys.filter(
                (key): key is string =>
                  typeof key === 'string' && key.length > 0,
              )
              : []

            const detail = missingKeys.length
              ? ` Missing keys: ${missingKeys.join(', ')}.`
              : ''

            const err = new Error(`${message}${detail}`) as Error & {
              cause?: unknown
            }
            err.cause = result
            throw err
          }

          if (isSupabaseStatus(result.status)) {
            nextStatus = result.status
          } else {
            throw new Error(
              'Supabase environment status payload is missing the status field.',
            )
          }
        } else {
          throw new Error(
            'Supabase environment status response format is not recognized.',
          )
        }

        if (!cancelled && nextStatus) {
          setSupabaseStatus(nextStatus)
          setEnvStatusError(null)
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message ||
              'Unknown error while refreshing Supabase environment status.'
              : 'Unknown error while refreshing Supabase environment status.'
          setEnvStatusError(message)
        }
        console.error({
          route: 'login',
          msg: 'Unable to refresh Supabase environment status from API',
          error,
        })
      }
    }

    refreshStatus()

    return () => {
      cancelled = true
    }
  }, [])
  const { client: sb, error: supabaseError } = useMemo(() => {
    if (supabaseIssue) {
      const err = new Error(supabaseIssue.message)
      console.error({ route: 'login', msg: err.message, issue: supabaseIssue })
      return { client: null, error: err }
    }

    try {
      return { client: sbBrowser(), error: null as Error | null }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Supabase client unavailable')
      console.error({ route: 'login', msg: err.message, error: err })
      return { client: null, error: err }
    }
  }, [supabaseIssue])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState({ email: false, password: false })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const labelVariants = {
    idle: { y: 17, scale: 1, opacity: 0.7 },
    floating: { y: 6, scale: 0.75, opacity: 1 }
  }

  const showEmailError = (submitAttempted || touched.email) && Boolean(errors.email)
  const showPasswordError = (submitAttempted || touched.password) && Boolean(errors.password)
  const emailErrorId = showEmailError ? 'login-email-error' : undefined
  const passwordErrorId = showPasswordError ? 'login-password-error' : undefined
  function revalidateField(
    field: 'email' | 'password',
    values: { email: string; password: string }
  ) {
    setErrors((prev) => {
      const validation = validateFields(values)
      const nextError = validation[field]
      if (nextError) {
        if (prev[field] === nextError) return prev
        return { ...prev, [field]: nextError }
      }
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)
    setFormError(null)

    const validation = validateFields({ email, password })
    setErrors(validation)
    if (validation.email || validation.password) {
      return
    }

    setLoading(true)

    const normalizedEmail = email.trim()
    const normalizedPassword = password.trim()

    try {
      if (!sb) {
        throw new Error('Supabase authentication is not configured.')
      }

      let data
      let error
      try {
        const result = await sb.auth.signInWithPassword({
          email: normalizedEmail,
          password: normalizedPassword,
        })
        data = result.data
        error = result.error
      } catch (signInError) {
        console.error({
          route: 'login',
          stage: 'signInWithPassword',
          error: signInError,
        })
        const normalizedError = normalizeAuthError(
          signInError,
          'Unable to sign in right now. Please try again.',
        )
        setFormError(normalizedError.message)
        if (normalizedError.isCredentialIssue) {
          setErrors((prev) => ({
            ...prev,
            password: prev.password ?? 'Check your email and password',
          }))
        }
        setLoading(false)
        return
      }

      if (error) {
        console.error({
          route: 'login',
          stage: 'signInWithPassword',
          error,
        })
        const normalizedError = normalizeAuthError(
          error,
          'Unable to sign in right now. Please try again.',
        )

        setFormError(normalizedError.message)
        if (normalizedError.isCredentialIssue) {
          setErrors((prev) => ({
            ...prev,
            password: prev.password ?? 'Check your email and password',
          }))
        }
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
        })

        if (!response.ok) {
          throw new Error('Failed to establish session. Please try again.')
        }
      } catch (callbackError) {
        console.error({
          route: 'login',
          stage: 'authCallback',
          error: callbackError,
        })
        const normalizedError = normalizeAuthError(
          callbackError,
          'Failed to establish session. Please try again.',
        )
        setFormError(normalizedError.message)
        setLoading(false)
        return
      }

      router.replace('/admin')
      router.refresh()
      if (typeof window !== 'undefined' && typeof window.location?.assign === 'function' && process.env.NODE_ENV !== 'test') {
        setTimeout(() => window.location.assign('/admin'), 80)
      }
    } catch (err) {
      console.error({
        route: 'login',
        stage: 'submit',
        error: err,
      })
      const normalizedError = normalizeAuthError(
        err,
        'Unable to sign in right now. Please try again.',
      )
      setFormError(normalizedError.message)
      if (normalizedError.isCredentialIssue) {
        setErrors((prev) => ({
          ...prev,
          password: prev.password ?? 'Check your email and password',
        }))
      }
      setLoading(false)
    }
  }

  if (supabaseError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-sm text-red-600">
        <div className="max-w-sm space-y-4">
          <h1 className="text-xl font-semibold text-red-700">Cannot sign in</h1>
          <p className="leading-relaxed text-red-600/80">{supabaseError.message}</p>
          {supabaseIssue?.missingKeys?.length ? (
            <div className="space-y-2 text-left text-xs text-red-500/80">
              <p className="font-medium text-red-600">Missing variables:</p>
              <ul className="list-disc space-y-1 pl-5">
                {supabaseIssue.missingKeys.map(key => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {!supabaseIssue?.hasServiceRole ? (
            <p className="text-xs text-red-500/70">
              The Supabase service role key is also required for server-side operations.
            </p>
          ) : null}
          <p className="text-red-500/70">
            Update the deployment environment (for example, <code>.env.local</code> or hosting provider settings) with the correct Supabase credentials, then reload this page.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background/95 to-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 top-[-140px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),transparent_55%)] blur-3xl" />
        <div className="absolute right-[-180px] bottom-[-180px] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.22),transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.06),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_22%)]" />
      </div>

      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] shadow-lg backdrop-blur sm:left-6 sm:top-6">
        <span className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_0_6px_rgba(59,130,246,0.25)]" />
        MySched Admin
      </div>

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle className="bg-card/90 shadow-lg backdrop-blur" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-4 py-14 sm:px-8 md:px-12 lg:flex-row lg:items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative grid w-full overflow-hidden rounded-3xl border border-border/60 bg-card/85 shadow-2xl backdrop-blur-xl lg:grid-cols-2"
        >
          {/* Left Side - Hero/Brand */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/90 via-indigo-600/75 to-slate-900/70 p-12 text-primary-foreground lg:flex">
            <div className="absolute inset-0 opacity-35">
              <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute right-6 bottom-6 h-28 w-28 rounded-full bg-black/25 blur-2xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_35%),radial-gradient(circle_at_80%_60%,rgba(14,165,233,0.18),transparent_35%)]" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em]">
                Secure Access
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_6px_rgba(16,185,129,0.2)]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold leading-tight tracking-tight">Welcome back, admin</h1>
                <p className="mt-3 text-base text-primary-foreground/80">
                  Keep the schedule humming — review classes, instructors, and notifications from a single control room.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-primary-foreground/70">Uptime</p>
                  <p className="mt-2 text-2xl font-semibold">99.98%</p>
                  <p className="text-xs text-primary-foreground/70">last 30 days</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-primary-foreground/70">Log events</p>
                  <p className="mt-2 text-2xl font-semibold">1.2k</p>
                  <p className="text-xs text-primary-foreground/70">today</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-center gap-3 text-sm text-primary-foreground/80">
              <span className="inline-flex h-9 items-center rounded-full bg-white/10 px-3 text-[12px] font-semibold uppercase tracking-[0.12em]">
                Immaculate Conception Institutions
              </span>
              <span className="hidden text-primary-foreground/70 xl:inline-flex">Authorized personnel only</span>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="relative flex flex-col justify-center gap-8 p-8 sm:p-12">
            <div className="absolute inset-x-6 top-4 h-24 rounded-3xl bg-gradient-to-r from-primary/10 via-transparent to-primary/5 blur-3xl" aria-hidden />
            <div className="relative space-y-3 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Admin Control
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in to continue</h2>
              <p className="text-sm text-muted-foreground">
                Verify your credentials to access schedules, users, and system configuration.
              </p>
            </div>

            <div className="relative space-y-3">
              {reason ? (
                <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
                  Access denied: {reason}
                </div>
              ) : null}

              {envStatusError ? (
                <div className="rounded-xl border border-red-300/60 bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-100" role="alert">
                  Unable to confirm Supabase environment status. {envStatusError}
                </div>
              ) : null}

              {formError ? (
                <div className="rounded-xl border border-red-300/60 bg-red-50/80 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-100" role="alert">
                  {formError}
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <motion.label
                      variants={labelVariants}
                      initial="idle"
                      animate={emailFocused || email ? 'floating' : 'idle'}
                      className="pointer-events-none absolute left-6 top-0 z-10 origin-left text-muted-foreground"
                    >
                      Email
                    </motion.label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      disabled={loading}
                      autoComplete="email"
                      className={cn(
                        "flex h-14 w-full rounded-2xl border border-border bg-background/70 px-6 pb-3 pt-7 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-offset-background transition-all focus:border-primary focus:bg-background focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                        errors.email && "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder="name@example.com"
                    />
                  </div>
                  {errors.email ? (
                    <p className="text-sm font-medium text-destructive animate-in slide-in-from-left-1 fade-in">
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <motion.label
                      variants={labelVariants}
                      initial="idle"
                      animate={passwordFocused || password ? 'floating' : 'idle'}
                      className="pointer-events-none absolute left-6 top-0 z-10 origin-left text-muted-foreground"
                    >
                      Password
                    </motion.label>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      disabled={loading}
                      autoComplete="current-password"
                      className={cn(
                        "flex h-14 w-full rounded-2xl border border-border bg-background/70 px-6 pb-3 pt-7 pr-14 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-offset-background transition-all focus:border-primary focus:bg-background focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                        errors.password && "border-destructive focus-visible:ring-destructive"
                      )}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-sm font-medium text-destructive animate-in slide-in-from-left-1 fade-in">
                      {errors.password}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <IconSlideInButton
                  type="submit"
                  label="Sign in"
                  icon={ArrowRight}
                  isLoading={loading}
                  loadingLabel="Signing in..."
                  variant="primary"
                  className="h-14 w-full justify-center rounded-2xl text-lg font-semibold shadow-xl shadow-primary/25"
                />
                <p className="text-center text-sm text-muted-foreground">
                  Having trouble? Contact the platform administrator to reset your access.
                </p>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </main>
  )
}
