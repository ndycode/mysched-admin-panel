'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ComponentType, SVGProps } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'

import { useComingSoon } from '@/components/ComingSoonDialog'
import { spring } from '@/lib/motion'

import { NAV_SECTIONS } from './AdminSidebarNav'

// Extract nav items from sections for mobile dock
const NAV_ITEMS = NAV_SECTIONS.flatMap(section => section.items)

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: string | number
}

function DockLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
}) {
  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
      <Link
        href={href}
        aria-label={label}
        className={cn(
          'flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-medium transition-colors',
          active
            ? 'text-primary'
            : 'text-muted-foreground hover:text-primary',
        )}
      >
        <Icon
          className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')}
          aria-hidden
        />
        <span>{label}</span>
      </Link>
    </motion.div>
  )
}

export function AdminMobileDock() {
  const pathname = usePathname()
  const comingSoon = useComingSoon()

  const leftItems = NAV_ITEMS.slice(0, 2)
  const rightItems = NAV_ITEMS.slice(2, 4)

  return (
    <motion.nav
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="fixed bottom-4 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 md:hidden"
      aria-label="Primary"
    >
      <div className="relative flex items-center justify-between rounded-[32px] border border-border bg-background/90 px-4 py-2.5 shadow-[0_32px_70px_-36px_rgba(15,31,60,0.32)] backdrop-blur-2xl">
        <div className="flex flex-1 items-center justify-evenly">
          {leftItems.map((item: NavItem) => (
            <DockLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={() =>
            comingSoon({
              title: 'Create record',
              description:
                'Quick actions for creating classes, sections, and reminders are coming soon to the mobile dock.',
            })
          }
          whileHover={{ scale: 1.1, y: -28 }}
          whileTap={{ scale: 0.95 }}
          className="relative -translate-y-5 rounded-full bg-primary p-4 text-primary-foreground shadow-[0_24px_50px_-24px_rgba(10,132,255,0.65)] transition-transform"
          aria-label="Open quick create"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </motion.button>
        <div className="flex flex-1 items-center justify-evenly">
          {rightItems.map((item: NavItem) => (
            <DockLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </div>
      </div>
    </motion.nav>
  )
}
