import { NextResponse } from 'next/server'

import {
  SupabaseConfigError,
  getSupabaseEnvSnapshot,
  type SupabaseBrowserStatus,
} from '@/lib/env'

export const dynamic = 'force-dynamic'

type EnvStatusSuccessResponse = {
  ok: true
  status: SupabaseBrowserStatus
}

type EnvStatusErrorResponse = {
  ok: false
  error: string
  message?: string
  missingKeys?: string[]
}

type EnvStatusResponse = EnvStatusSuccessResponse | EnvStatusErrorResponse

export async function GET(): Promise<NextResponse<EnvStatusResponse>> {
  try {
    const { diagnostics } = getSupabaseEnvSnapshot({ refresh: true })

    const missingPublicKeys: string[] = []
    if (diagnostics.missing.supabaseUrl) {
      missingPublicKeys.push('NEXT_PUBLIC_SUPABASE_URL')
    }
    if (diagnostics.missing.supabaseAnonKey) {
      missingPublicKeys.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    const usingLocalFallback =
      diagnostics.usingLocalDefaults.supabaseUrl ||
      diagnostics.usingLocalDefaults.supabaseAnonKey

    const runningOnVercel = process.env.VERCEL === '1'
    const vercelProjectName = runningOnVercel
      ? process.env.VERCEL_PROJECT_NAME ?? null
      : null

    const serviceRoleConfigured =
      !diagnostics.missing.supabaseServiceRole &&
      !diagnostics.usingLocalDefaults.supabaseServiceRole

    const status: SupabaseBrowserStatus = {
      configured: missingPublicKeys.length === 0 && !usingLocalFallback,
      missingPublicKeys,
      usingLocalFallback,
      serviceRoleConfigured,
      runningOnVercel,
      vercelProjectName,
    }

    return NextResponse.json(
      {
        ok: true,
        status,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  } catch (error) {
    console.error({
      route: 'api/env-status',
      msg: 'Unable to resolve Supabase environment status',
      error,
    })

    const headers = {
      'Cache-Control': 'no-store',
    }

    if (error instanceof SupabaseConfigError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'supabase-config-invalid',
          message: error.message,
          missingKeys: error.missing ?? [],
        },
        {
          status: error.status ?? 500,
          headers,
        },
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        ok: false,
        error: 'unknown',
        message,
      },
      {
        status: 500,
        headers,
      },
    )
  }
}
