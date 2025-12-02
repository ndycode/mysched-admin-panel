'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { useSelectedLayoutSegment } from 'next/navigation'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Bell,
  Menu,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { AdminSidebarNav } from './AdminSidebarNav'
import { useToast } from '@/components/toast'
import { useSmoothProgress } from '@/hooks/useSmoothProgress'
import { ThemeToggle } from '@/components/ThemeToggle'
import { buttonClasses } from '@/components/ui/Button'

/* ---------------------------------------------------------- */
/* Notification helpers                                       */
/* ---------------------------------------------------------- */

type NotificationItem = {
  id: number
  occurredAt: string | null
  table: string
  action: string
  rowId: number | string | null
  severity: 'info' | 'warning' | 'error'
  message: string
}

function NotificationBadge({ severity }: { severity: NotificationItem['severity'] }) {
  const tone =
    severity === 'error'
      ? 'bg-[#ff3b30]'
      : severity === 'warning'
        ? 'bg-[#ff9f0a]'
        : 'bg-[#0a84ff]'
  return <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone}`} aria-hidden />
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/* ---------------------------------------------------------- */
/* Greeting context                                           */
/* ---------------------------------------------------------- */

type AdminLayoutShellProps = {
  greeting: string
  displayName: string
  initial: string
  avatarUrl: string | null
  email: string
  studentId: string | null
  children: ReactNode
}

type AdminGreetingContextValue = {
  greeting: string
  displayName: string
}

const AdminGreetingContext = createContext<AdminGreetingContextValue | null>(null)

type SidebarMotionVars = CSSProperties & {
  '--sidebar-progress': string
  '--sidebar-expanded-width': string
  '--sidebar-collapsed-width': string
  '--sidebar-label-delay': string
}

export function useAdminGreeting() {
  const ctx = useContext(AdminGreetingContext)
  if (!ctx) {
    throw new Error('useAdminGreeting must be used within AdminLayoutShell')
  }
  return ctx
}

/* ---------------------------------------------------------- */
/* Layout shell                                               */
/* ---------------------------------------------------------- */

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

const mobileOverlayMotion = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const mobileDrawerMotion = {
  hidden: { opacity: 0, x: -16, scale: 0.98 },
  visible: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -16, scale: 0.98 },
}

export function AdminLayoutShell({ greeting, displayName, initial, avatarUrl, email, studentId, children }: AdminLayoutShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    if (!mobileMenuOpen) return

    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AdminGreetingContext.Provider value={{ greeting, displayName }}>
        <div className="admin-shell relative grid min-h-screen grid-cols-1 md:grid-cols-[auto_1fr] bg-background">

          {/* Sidebar - Fixed Width or Collapsed */}
          <motion.aside
            initial={false}
            animate={{ width: sidebarCollapsed ? 80 : 288 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.95 }}
            style={{ willChange: 'width' }}
            className={cn(
              "sticky top-0 z-20 hidden h-screen flex-shrink-0 flex-col md:flex"
            )}
          >
            <div className="flex h-full flex-col border-r border-border bg-sidebar py-6">
              <AdminSidebarNav
                collapsed={sidebarCollapsed}
                user={{ displayName, email, avatarUrl }}
                onToggleCollapse={toggleSidebar}
              />
            </div>
          </motion.aside>

          {/* Main Content */}
          <div className="relative flex min-h-screen min-w-0 flex-1 flex-col">

            {/* Mobile Header */}
            <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
              <span className="font-semibold">MySched Admin</span>
              <button onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-6 w-6" />
              </button>
            </div>

            <main className="relative flex-1 bg-background focus:outline-none">
              {/* Theme toggle, pinned to the same top-right spot as before */}
              <div className="pointer-events-none fixed right-4 top-4 sm:right-6 sm:top-6 z-[70]">
                <ThemeToggle className="pointer-events-auto shadow-lg bg-card/95" />
              </div>
              <div className="relative z-10 flex min-h-full flex-col p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile Menu Overlay */}
          <AnimatePresence mode="wait" initial={false}>
            {mobileMenuOpen ? (
              <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
                <motion.div
                  key="mobile-overlay"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={mobileOverlayMotion}
                  transition={
                    prefersReducedMotion ? { duration: 0.08, ease: 'easeOut' } : { duration: 0.12, ease: [0.33, 1, 0.68, 1] }
                  }
                  className="absolute inset-0 bg-black/45"
                  aria-hidden="true"
                  style={{ willChange: 'opacity' }}
                  onClick={closeMobileMenu}
                />
                <motion.div
                  key="mobile-drawer"
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={mobileDrawerMotion}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.12, ease: 'easeOut' }
                      : { type: 'spring', stiffness: 640, damping: 36, mass: 0.9 }
                  }
                  className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl border-r border-border"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <div className="relative flex h-full flex-col">
                    <motion.button
                      onClick={closeMobileMenu}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                      className={cn(
                        'absolute right-4 top-6 z-50',
                        buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-9 w-9 px-0 opacity-80' })
                      )}
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                      <span className="sr-only">Close</span>
                    </motion.button>
                    <AdminSidebarNav
                      onNavigate={closeMobileMenu}
                      collapsed={false}
                      user={{ displayName, email, avatarUrl }}
                    />
                  </div>
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </AdminGreetingContext.Provider>
    </QueryClientProvider>
  )
}
