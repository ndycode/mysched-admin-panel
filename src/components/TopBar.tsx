'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import type { UserResponse } from '@supabase/supabase-js'

import { sbBrowser } from '@/lib/supabase-browser'

type TopbarProps = {
  mobileMenuOpen: boolean
  onMobileMenuToggle: (open: boolean) => void
}

export default function Topbar({ mobileMenuOpen, onMobileMenuToggle }: TopbarProps) {
  const [email, setEmail] = useState<string | undefined>()
  useEffect(() => {
    const sb = sbBrowser()
    sb.auth.getUser().then(({ data }: UserResponse) => setEmail(data?.user?.email ?? undefined))
  }, [])
  return (
    <header className="admin-topbar fixed inset-x-0 top-0 z-50 h-16 border-b border-white/40 bg-white/55 shadow-[0_25px_40px_-30px_rgba(15,23,42,0.45)] lg:pl-[280px]">
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex flex-1 items-center gap-3">
          <motion.button
            className="menu-trigger inline-flex items-center justify-center rounded-2xl border border-white/55 bg-white/65 p-2 text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40 lg:hidden"
            aria-label="Open sidebar"
            aria-controls="admin-sidebar"
            aria-expanded={mobileMenuOpen}
            onClick={() => onMobileMenuToggle(!mobileMenuOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Menu className="h-4 w-4 text-neutral-700" />
          </motion.button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="topbar-avatar h-10 w-10 text-sm font-semibold text-[var(--foreground)]">
            {email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden max-w-[180px] truncate text-xs text-[var(--muted-foreground)] sm:block"
          >
            {email}
          </motion.span>
        </div>
      </div>
    </header>
  )
}
