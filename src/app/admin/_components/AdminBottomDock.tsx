'use client'
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

import { NAV_ITEMS } from './AdminSidebarNav'

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(' ')
}

const MotionLink = motion.create(Link)

export function AdminBottomDock() {
    const pathname = usePathname()

    const dockVariants = {
        idle: { scale: 1, y: 0 },
        hover: { scale: 1.12, y: -4, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
        tap: { scale: 0.95, y: 0 }
    }

    return (
        <nav
            className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 md:block"
            aria-label="Admin dock"
        >
            <div className="flex items-center gap-2 rounded-[24px] border border-border bg-background/80 px-4 py-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

                    return (
                        <MotionLink
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "dock-icon relative grid h-12 w-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm transition-colors",
                                isActive ? "text-primary" : "hover:text-primary"
                            )}
                            title={item.label}
                            initial="idle"
                            whileHover="hover"
                            whileTap="tap"
                            variants={dockVariants}
                        >
                            <Icon className="h-6 w-6" />
                            {isActive && (
                                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
                            )}
                        </MotionLink>
                    )
                })}

                <div className="mx-2 h-8 w-px bg-[var(--border-soft)]" />

                <MotionLink
                    href="/admin/settings"
                    className={cn(
                        "dock-icon relative grid h-12 w-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm transition-colors",
                        pathname === '/admin/settings' ? "text-primary" : "hover:text-primary"
                    )}
                    title="Settings"
                    initial="idle"
                    whileHover="hover"
                    whileTap="tap"
                    variants={dockVariants}
                >
                    <Settings className="h-6 w-6" />
                    {pathname === '/admin/settings' && (
                        <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
                    )}
                </MotionLink>

                <form action="/api/logout" method="POST">
                    <motion.button
                        type="submit"
                        className="dock-icon grid h-12 w-12 place-items-center rounded-full bg-background text-muted-foreground shadow-sm transition-colors hover:text-destructive"
                        title="Logout"
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                        variants={dockVariants}
                    >
                        <LogOut className="h-6 w-6" />
                    </motion.button>
                </form>
            </div>
        </nav>
    )
}
