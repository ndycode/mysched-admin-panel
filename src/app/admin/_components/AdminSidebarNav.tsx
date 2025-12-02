'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  FileText,
  Home,
  Layers,
  Settings,
  UserRound,
  Users,
  Sparkles,
  ChevronDown,
  ChevronsUpDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut
} from 'lucide-react'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui'
import { buttonClasses } from '@/components/ui/Button'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string | number
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/classes', label: 'Classes', icon: BookOpen },
  { href: '/admin/sections', label: 'Sections', icon: Layers },
  { href: '/admin/instructors', label: 'Instructors', icon: UserRound },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/audit', label: 'Logs', icon: FileText },
]

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

const MotionLink = motion.create(Link)

const dockVariants = {
  idle: { scale: 1, y: 0 },
  hover: { scale: 1.05, y: -2, transition: { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.9 } },
  tap: { scale: 0.97, y: 0 },
}

const collapseVariants = {
  expanded: { opacity: 1, x: 0 },
  collapsed: { opacity: 0, x: -8 },
}

export function AdminSidebarNav({
  onNavigate,
  collapsed = false,
  user,
  onToggleCollapse,
}: {
  onNavigate?: () => void
  collapsed?: boolean
  user?: {
    displayName: string
    email: string
    avatarUrl: string | null
  }
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()

  const isActive = (item: NavItem) => {
    if (item.href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Brand + Collapse */}
      <div
        className={cn(
          "flex items-center transition-all duration-200",
          collapsed ? "flex-col gap-2 px-3 py-4" : "gap-3 px-4 py-6 pr-3 mx-2"
        )}
      >
        <motion.h1
          key={collapsed ? 'collapsed' : 'expanded'}
          initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.9 }}
          className={cn(
            "font-semibold text-xl text-primary leading-none cursor-default",
            collapsed ? "flex h-10 w-10 items-center justify-center text-lg" : ""
          )}
          style={{ willChange: 'transform, opacity' }}
        >
          {collapsed ? 'M' : 'MySched'}
        </motion.h1>
        <motion.button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground transition-colors",
            collapsed ? "" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          variants={dockVariants}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" aria-hidden /> : <ChevronsLeft className="h-4 w-4" aria-hidden />}
        </motion.button>
      </div>

      {/* User Profile (no collapse control) */}
      <div
        className={cn(
          "mb-6 flex items-center gap-3 px-4 hover:bg-accent transition-colors rounded-lg mx-2 py-2",
          collapsed ? "justify-center px-0 mx-0" : ""
        )}
      >
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
              {user?.displayName?.charAt(0) || '#'}
            </div>
          )}
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.9 }}
            className="flex flex-1 items-center justify-between overflow-hidden text-left"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="flex flex-col truncate">
              <span className="truncate text-sm font-semibold text-foreground">{user?.displayName || 'User'}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email || ''}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation Links */}
      <nav
        className={cn('sidebar-nav flex flex-1 flex-col space-y-1 overflow-y-auto', collapsed ? 'items-center' : '')}
        aria-label="Admin navigation"
        data-collapsed={collapsed}
      >
        {NAV_ITEMS.map((item, index) => {
          if ('type' in item && item.type === 'divider') {
            return <div key={`divider-${index}`} className={cn("my-2 border-t border-border mx-4", collapsed ? "mx-2 w-8" : "")} />
          }

          const navItem = item as NavItem
          const Icon = navItem.icon
          const active = isActive(navItem)
          return (
            <MotionLink
              key={navItem.href}
              href={navItem.href}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              title={collapsed ? navItem.label : undefined}
              className={cn(
                'group flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors duration-200 mx-2 rounded-lg',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed ? 'justify-center px-2 mx-0' : ''
              )}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              variants={dockVariants}
              style={{ willChange: 'transform' }}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  active ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )}
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.9 }}
                  className="flex flex-1 items-center gap-2"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <span className="flex-1">{navItem.label}</span>
                  {navItem.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        navItem.badge === 'New'
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {navItem.badge}
                    </span>
                  )}
                </motion.span>
              )}
            </MotionLink>
          )
        })}
      </nav>

      {/* Footer Links - Fixed padding to match sidebar-nav */}
      <div className={cn("mt-auto space-y-1 pb-4 flex flex-col px-3.5", collapsed ? "items-center" : "")}>
        <MotionLink
          href="/admin/settings"
          className={cn(
            "group flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors duration-200 mx-2 rounded-lg",
            pathname === '/admin/settings'
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed ? "justify-center px-2 mx-0" : ""
          )}
          title={collapsed ? "Settings" : undefined}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          variants={dockVariants}
          style={{ willChange: 'transform' }}
        >
          <Settings className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors",
            pathname === '/admin/settings' ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
          )} />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.9 }}
              style={{ willChange: 'transform, opacity' }}
            >
              Settings
            </motion.span>
          )}
        </MotionLink>
        <motion.button
          onClick={handleLogout}
          className={cn(
            "group flex items-center gap-3 px-4 py-2 text-sm font-medium text-destructive transition-colors duration-200 hover:bg-destructive/10 mx-2 rounded-lg",
            collapsed ? "justify-center px-2 mx-0" : ""
          )}
          title={collapsed ? "Logout" : undefined}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          variants={dockVariants}
          style={{ willChange: 'transform' }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0 text-destructive transition-colors" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              transition={{ type: "spring", stiffness: 520, damping: 32, mass: 0.9 }}
              style={{ willChange: 'transform, opacity' }}
            >
              Logout
            </motion.span>
          )}
        </motion.button>
      </div>
    </div>
  )
}
