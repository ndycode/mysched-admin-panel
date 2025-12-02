'use client'

/**
 * AdminNav: Top navigation bar for admin pages.
 * Shows brand, user info, and logout button.
 * @param supabaseClient - Optional Supabase client for testing
 */
import React from 'react'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { SupabaseClient, UserResponse } from '@supabase/supabase-js'

import { sbBrowser } from '../lib/supabase-browser'

type AdminNavProps = {
  supabaseClient?: SupabaseClient
}

const MotionLink = motion.create(Link)

export default function AdminNav({ supabaseClient }: AdminNavProps) {
  /**
   * AdminNav: Top navigation bar for admin pages.
   * Shows brand, user info, and logout button.
   * @param supabaseClient - Optional Supabase client for testing
   */
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)

  useEffect(() => {
    const sb = supabaseClient ?? sbBrowser()
    sb.auth.getUser().then(({ data }: UserResponse) => {
      const u = data?.user
      if (u) setUser({ email: u.email ?? undefined, name: u.user_metadata?.name ?? undefined })
    })
  }, [supabaseClient])

  return (
    <header className="admin-topbar sticky top-0 z-40 border-b border-white/40 bg-white/55" role="banner">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6" role="navigation" aria-label="Admin navigation">
        {/* Brand */}
        <MotionLink
          href="/admin"
          className="glow-ring group inline-flex items-center gap-3 rounded-2xl border border-white/60 bg-white/60 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
          aria-label="Go to Dashboard"
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#1f4ed8,#60a5fa)] shadow-[0_12px_28px_-18px_rgba(37,99,235,0.7)] group-hover:scale-105" aria-hidden="true" />
          <span className="text-base font-semibold text-[var(--foreground)]">MySched</span>
        </MotionLink>

        {/* Right Side */}
        <div className="flex items-center gap-4" role="group" aria-label="User actions">
          <span className="text-sm text-[var(--muted-foreground)]">
            {user ? (
              <>Logged in as <span className="font-medium text-[var(--foreground)]">{user.name || user.email}</span></>
            ) : (
              'Loading user...'
            )}
          </span>
          <form action="/api/logout" method="POST">
            <motion.button
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl border border-red-200/70 bg-white/60 px-3.5 py-2 text-sm font-medium text-red-500 hover:bg-red-50/60 hover:text-red-500/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40"
              aria-label="Sign out"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              Logout
            </motion.button>
          </form>
        </div>
      </div>
    </header>
  );
}
