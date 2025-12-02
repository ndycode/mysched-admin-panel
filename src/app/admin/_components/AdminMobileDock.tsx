'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { ComponentType, SVGProps } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'

import { useComingSoon } from '@/components/ComingSoonDialog'

import { NAV_ITEMS } from './AdminSidebarNav'

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
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
  )
}

export function AdminMobileDock() {
  const pathname = usePathname()
  const comingSoon = useComingSoon()

  const leftItems = NAV_ITEMS.slice(0, 2)
  const rightItems = NAV_ITEMS.slice(2, 4)

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 md:hidden"
      aria-label="Primary"
    >
      <div className="relative flex items-center justify-between rounded-[32px] border border-border bg-background/90 px-4 py-2.5 shadow-[0_32px_70px_-36px_rgba(15,31,60,0.32)] backdrop-blur-2xl">
        <div className="flex flex-1 items-center justify-evenly">
          {leftItems.map(item => (
            <DockLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            comingSoon({
              title: 'Create record',
              description:
                'Quick actions for creating classes, sections, and reminders are coming soon to the mobile dock.',
            })
          }
          className="relative -translate-y-5 rounded-full bg-primary p-4 text-primary-foreground shadow-[0_24px_50px_-24px_rgba(10,132,255,0.65)] transition-transform hover:-translate-y-6"
          aria-label="Open quick create"
        >
          <Plus className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex flex-1 items-center justify-evenly">
          {rightItems.map(item => (
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
    </nav>
  )
}
