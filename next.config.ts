// next.config.ts
import type { NextConfig } from "next";
import * as dotenv from "dotenv";

import { resolveSupabaseEnv } from "./src/lib/env-alias";
import {
  getLocalSupabaseDefaults,
  shouldUseLocalSupabaseDefaults,
} from "./src/lib/supabase-defaults";

// Load environment early (local first, then fallback)
dotenv.config({ path: ".env.local" });
dotenv.config();
dotenv.config({ path: "supabase/.env" });

// Normalize Supabase environment aliases early so client builds receive values
const supabaseEnv = resolveSupabaseEnv(process.env);
let usedLocalPublicFallback = false;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseEnv.url) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseEnv.url;
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && supabaseEnv.anonKey) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseEnv.anonKey;
}

if (!process.env.SUPABASE_SERVICE_ROLE && supabaseEnv.serviceRole) {
  process.env.SUPABASE_SERVICE_ROLE = supabaseEnv.serviceRole;
}

const localDefaults = getLocalSupabaseDefaults(process.env);

if (shouldUseLocalSupabaseDefaults(process.env)) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = localDefaults.url;
    usedLocalPublicFallback = true;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = localDefaults.anonKey;
    usedLocalPublicFallback = true;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE) {
    process.env.SUPABASE_SERVICE_ROLE = localDefaults.serviceRoleKey;
  }
}

// Warn if important env vars missing
const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

for (const k of requiredEnv) {
  if (!process.env[k]) {
    console.warn(`[next.config] Missing ${k} in environment`);
  }
}

// Secure headers for all routes
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Disabled for dev performance (prevents double-render lag on heavy pages)
  reactStrictMode: false,

  // Avoid failing production builds on ESLint errors (tests, etc.)
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Expose selected env vars to the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_HAS_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE ? '1' : '0',
    NEXT_PUBLIC_SUPABASE_USING_LOCAL_DEFAULTS: usedLocalPublicFallback ? '1' : '0',
    NEXT_PUBLIC_VERCEL: process.env.VERCEL === '1' ? '1' : '0',
    NEXT_PUBLIC_VERCEL_PROJECT_NAME: process.env.VERCEL_PROJECT_NAME ?? '',
    ALLOW_ANY_AUTH_AS_ADMIN: process.env.ALLOW_ANY_AUTH_AS_ADMIN,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
