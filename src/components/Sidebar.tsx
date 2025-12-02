"use client"

/**
 * Sidebar: Collapsible admin sidebar navigation.
 * Shows navigation links, collapse/expand, and logout.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  LayoutDashboard,
  NotebookPen,
  Layers3,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useSmoothProgress } from '@/hooks/useSmoothProgress'

type SidebarVars = CSSProperties & {
  '--sidebar-progress': string
  '--sidebar-expanded-width': string
  '--sidebar-collapsed-width': string
  '--sidebar-label-delay': string
}

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/classes', label: 'Classes', icon: NotebookPen },
  { href: '/admin/sections', label: 'Sections', icon: Layers3 },
  { href: '/admin/audit', label: 'Audit Logs', icon: ShieldCheck },
]

type SidebarProps = {
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
}

import { motion, AnimatePresence } from 'framer-motion'

const MotionLink = motion.create(Link)

export default function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)
  const sidebarProgress = useSmoothProgress(open ? 1 : 0, { duration: 480 })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isToggleShortcut =
        (event.ctrlKey || event.metaKey) && (event.key === 'b' || event.key === 'B')

      if (!isToggleShortcut) return

      event.preventDefault()
      setOpen((value) => !value)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (!mobileOpen) return
    onMobileOpenChange(false)
  }, [pathname, mobileOpen, onMobileOpenChange])
  const collapsed = !open
  const sidebarVars = useMemo<SidebarVars>(
    () => ({
      '--sidebar-progress': sidebarProgress.toFixed(3),
      '--sidebar-expanded-width': '17.5rem',
      '--sidebar-collapsed-width': '5rem',
      '--sidebar-label-delay': open ? '80ms' : '0ms',
    }),
    [open, sidebarProgress],
  )

  const dockVariants = {
    idle: { scale: 1, y: 0 },
    hover: { scale: 1.12, y: -4, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
    tap: { scale: 0.95, y: 0 }
  }

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="sidebar-overlay fixed inset-0 z-30 bg-black/45 backdrop-blur-sm lg:hidden"
            onClick={() => onMobileOpenChange(false)}
          />
        )}
      </AnimatePresence>
      <aside
        id="admin-sidebar"
        data-state={collapsed ? 'collapsed' : 'expanded'}
        data-sidebar={collapsed ? 'collapsed' : 'expanded'}
        style={sidebarVars}
        className={`sidebar-panel fixed left-0 top-16 bottom-4 z-40 mx-4 rounded-3xl lg:top-16 lg:mx-0 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        aria-label="Sidebar"
        role="complementary"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-white/50 px-4 py-3 backdrop-blur-sm">
            <span className="text-sm font-semibold text-[var(--foreground)]">{open ? 'Admin' : 'A'}</span>
            <motion.button
              aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
              onClick={() => setOpen((value) => !value)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="hidden lg:inline-flex rounded-2xl p-1.5 text-[var(--muted-foreground)] hover:text-[var(--brand-strong)] focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)]"
            >
              {open ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </motion.button>
          </div>

          <nav
            className="sidebar-nav flex-1 overflow-y-auto"
            aria-label="Main sidebar navigation"
            role="navigation"
            data-collapsed={collapsed}
          >
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              const base =
                'sidebar-link group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(13,95,229,0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-white/40'
              return (
                <MotionLink
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  data-state={active ? 'active' : 'inactive'}
                  data-collapsed={collapsed}
                  className={`${base}`}
                  title={!open ? label : undefined}
                  onClick={() => onMobileOpenChange(false)}
                  initial="idle"
                  whileHover="hover"
                  whileTap="tap"
                  variants={{
                    idle: { x: 0, scale: 1 },
                    hover: { x: 4, scale: 1.01 },
                    tap: { scale: 0.98 }
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.span
                    className="sidebar-link__icon"
                    variants={{
                      idle: { scale: 1 },
                      hover: { scale: 1.1 },
                      tap: { scale: 0.95 }
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <span
                    aria-hidden={collapsed}
                    className="sidebar-link__label font-medium"
                    data-transition={collapsed ? undefined : 'delayed'}
                  >
                    {label}
                  </span>
                </MotionLink>
              )
            })}
          </nav>

          <div className={`sidebar-dock ${collapsed ? 'flex-col pb-4' : ''}`}>
            <MotionLink
              href="/admin/settings"
              className="dock-icon"
              data-active={pathname === '/admin/settings'}
              title="Settings"
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              variants={dockVariants}
            >
              <Settings className="h-5 w-5" />
            </MotionLink>

            <form action="/api/logout" method="POST">
              <motion.button
                type="submit"
                className="dock-icon"
                title="Logout"
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                variants={dockVariants}
              >
                <LogOut className="h-5 w-5" />
              </motion.button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
