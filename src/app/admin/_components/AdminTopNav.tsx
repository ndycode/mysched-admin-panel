'use client'
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSelectedLayoutSegment } from 'next/navigation'
import { Bell, Loader2, RefreshCw, Menu, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/components/toast'
import { api } from '@/lib/fetcher'
import { isDev } from '@/lib/motion'
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog'
import { buttonClasses } from '@/components/ui/Button'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/SmoothDropdown'

/* ---------------------------------------------------------- */
/* Types & Helpers                                            */
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

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(' ')
}

/* ---------------------------------------------------------- */
/* Component                                                  */
/* ---------------------------------------------------------- */

interface AdminTopNavProps {
    displayName: string
    initial: string
    avatarUrl: string | null
    email?: string
    studentId?: string | null
    onMobileMenuOpen: () => void
}

export function AdminTopNav({ displayName, initial, avatarUrl, email = '', studentId = null, onMobileMenuOpen }: AdminTopNavProps) {
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)
    const [notificationsError, setNotificationsError] = useState<string | null>(null)
    const [lastFetched, setLastFetched] = useState<number | null>(null)

    const toast = useToast()
    const bellRef = useRef<HTMLButtonElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)

    // Load notifications logic
    const loadNotifications = useCallback(async () => {
        setNotificationsLoading(true)
        setNotificationsError(null)
        try {
            const res = await api<{ notifications: NotificationItem[] }>('/api/notifications')
            setNotifications(res.notifications)
            setLastFetched(Date.now())
        } catch (error) {
            const msg = (error as { message?: string } | null)?.message || 'Unable to load notifications'
            setNotificationsError(msg)
            toast({ kind: 'error', msg })
        } finally {
            setNotificationsLoading(false)
        }
    }, [toast])

    // Auto-refresh notifications
    useEffect(() => {
        if (!notificationsOpen) return
        const id = window.setInterval(() => {
            void loadNotifications()
        }, 60_000)
        return () => window.clearInterval(id)
    }, [notificationsOpen, loadNotifications])

    // Click outside handler
    useEffect(() => {
        if (!notificationsOpen) return
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null
            if (!target) return
            if (panelRef.current && !panelRef.current.contains(target) && bellRef.current && !bellRef.current.contains(target)) {
                setNotificationsOpen(false)
            }
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setNotificationsOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [notificationsOpen])

    const toggleNotifications = () => {
        setNotificationsOpen(prev => {
            const next = !prev
            if (next) {
                const shouldRefresh = !lastFetched || Date.now() - lastFetched > 60_000
                if (shouldRefresh && !notificationsLoading) {
                    void loadNotifications()
                }
            }
            return next
        })
    }

    const anyImportant = useMemo(() => notifications.some(item => item.severity !== 'info'), [notifications])
    const timeFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }), [])

    const formattedNotifications = useMemo(() => {
        return notifications.map(item => {
            let timestamp = 'Unknown time'
            if (item.occurredAt) {
                const date = new Date(item.occurredAt)
                if (!Number.isNaN(date.getTime())) {
                    timestamp = timeFormatter.format(date)
                }
            }
            return { ...item, timestamp }
        })
    }, [notifications, timeFormatter])

    // Animation variants (Matching AdminBottomDock)
    const dockVariants = {
        idle: { scale: 1, y: 0 },
        hover: { scale: 1.12, y: -2, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
        tap: { scale: 0.95, y: 0 }
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl shadow-sm transition-all duration-300">
            <div className="mx-auto flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">

                <div className="flex items-center gap-4">
                    {/* Mobile Menu Trigger */}
                    <motion.button
                        type="button"
                        onClick={onMobileMenuOpen}
                        className={cn(
                            buttonClasses({ variant: 'secondary', size: 'sm', className: 'h-10 w-10 px-0 text-muted-foreground' }),
                            'md:hidden'
                        )}
                        aria-label="Open navigation"
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                        variants={dockVariants}
                    >
                        <Menu className="h-5 w-5" aria-hidden />
                    </motion.button>

                    {/* Brand */}
                    <Link
                        href="/admin"
                        className="text-xl font-bold tracking-tight text-foreground"
                    >
                        MySched
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Notifications */}
                    <div className="relative">
                        <motion.button
                            type="button"
                            ref={bellRef}
                            onClick={toggleNotifications}
                            aria-expanded={notificationsOpen}
                            aria-label="View alerts"
                            className={cn(
                                buttonClasses({
                                    variant: notificationsOpen ? 'primary' : 'secondary',
                                    size: 'sm',
                                    className: 'h-10 w-10 px-0',
                                }),
                                "relative"
                            )}
                            initial="idle"
                            whileHover="hover"
                            whileTap="tap"
                            variants={dockVariants}
                        >
                            <Bell className="h-5 w-5" aria-hidden />
                            {anyImportant && (
                                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--danger)] shadow-[0_0_0_2px_white]" />
                            )}
                        </motion.button>

                        {/* Notification Panel */}
                        <AnimatePresence>
                            {notificationsOpen && (
                                <motion.div
                                    ref={panelRef}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 top-12 z-50 w-80 max-w-screen-md overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-xl backdrop-blur-2xl"
                                >
                                    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                                        <p className="text-sm font-semibold text-[var(--muted-strong)]">System alerts</p>
                                        <button
                                            type="button"
                                            onClick={() => void loadNotifications()}
                                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent hover:text-accent-foreground hover:shadow-sm transition-all"
                                            disabled={notificationsLoading}
                                        >
                                            {notificationsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                            <span>Refresh</span>
                                        </button>
                                    </div>

                                    <div className="max-h-screen-md overflow-y-auto p-2">
                                        {notificationsLoading && notifications.length === 0 && (
                                            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Loading...</span>
                                            </div>
                                        )}

                                        {!notificationsLoading && notifications.length === 0 && !notificationsError && (
                                            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                                                No new notifications
                                            </div>
                                        )}

                                        {notificationsError && (
                                            <div className="m-2 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                                                {notificationsError}
                                            </div>
                                        )}

                                        <div className="space-y-1">
                                            {formattedNotifications.map(item => (
                                                <div key={item.id} className="group relative rounded-xl p-3 transition-colors hover:bg-muted/50">
                                                    <div className="flex gap-3">
                                                        <NotificationBadge severity={item.severity} />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-[var(--muted-strong)]">{item.message}</p>
                                                            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                                                {titleCase(item.action)} • {item.timestamp}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* User Profile */}
                    <div>
                        <DropdownMenu>

                            <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-accent outline-none focus:outline-none">
                                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt={displayName}
                                            fill
                                            className="object-cover"
                                            sizes="36px"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-items-center bg-[var(--brand-soft)] text-[var(--brand-strong)] font-semibold text-sm">
                                            {initial}
                                        </div>
                                    )}
                                </div>
                                <div className="hidden text-right text-sm sm:block">
                                    <p className="font-semibold text-foreground leading-none">{displayName}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Admin</p>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center justify-start gap-2 p-2">
                                    <div className="flex flex-col space-y-1 leading-none">
                                        <p className="font-medium">{displayName}</p>
                                        <p className="w-56 truncate text-xs text-muted-foreground">{email}</p>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Edit Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                    <a href="/logout">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Sign out</span>
                                    </a>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>


                </div>

                {profileOpen && (
                    <ProfileSettingsDialog
                        open={profileOpen}
                        onClose={() => setProfileOpen(false)}
                        initialData={{
                            fullName: displayName,
                            avatarUrl,
                            email,
                            studentId,
                        }}
                    />
                )}
            </div>

        </header>
    )
}
