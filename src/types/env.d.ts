declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
      NEXT_PUBLIC_SUPABASE_REFERENCE?: string
      NEXT_PUBLIC_SUPABASE_PROJECT_ID?: string
      NEXT_PUBLIC_SUPABASE_PROJECT_REF?: string
      SUPABASE_SERVICE_ROLE?: string
      NEXT_PUBLIC_SITE_URL?: string
      NODE_ENV?: 'development' | 'test' | 'production'
      ALLOW_ANY_AUTH_AS_ADMIN?: 'true' | 'false'
      NEXT_ADMIN_EMAILS?: string
      SUPABASE_URL?: string
      SUPABASE_URL_PUBLIC?: string
      SUPABASE_URL_ANON?: string
      SUPABASE_PROJECT_URL?: string
      SUPABASE_PROJECT_REF?: string
      SUPABASE_PROJECT_ID?: string
      SUPABASE_REFERENCE?: string
      SUPABASE_ANON_KEY?: string
      SUPABASE_ANON?: string
      SUPABASE_PUBLIC_ANON_KEY?: string
      SUPABASE_PUBLIC_KEY?: string
      SUPABASE_ANON_KEY_B64?: string
      SUPABASE_PUBLIC_ANON_KEY_B64?: string
      SUPABASE_SERVICE_ROLE_KEY?: string
      SUPABASE_SERVICE_KEY?: string
      SUPABASE_SERVICE_ROLE_B64?: string
      SUPABASE_LOCAL_URL?: string
      SUPABASE_LOCAL_ANON_KEY?: string
      SUPABASE_LOCAL_SERVICE_ROLE_KEY?: string
      SUPABASE_DISABLE_LOCAL_DEFAULTS?: '1'
      SUPABASE_ALLOW_LOCAL_DEFAULTS?: '1'
      VERCEL?: '1'
      __MYSCHED_ENV_WARNED?: '1'
      __MYSCHED_LOCAL_DEFAULTS_WARNED?: '1'
      GEMINI_API_KEY?: string
      GEMINI_MODEL?: string
      GEMINI_API_URL?: string
    }
  }

  interface Window {
    __MYSCHED_PUBLIC_ENV__?: {
      supabaseUrl?: string | null
      supabaseAnonKey?: string | null
    }
  }
}

export {}
