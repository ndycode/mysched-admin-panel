"use client"

import * as React from "react"
import { createPortal, flushSync } from "react-dom"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

function ThemeTransitionOverlay({ theme, trigger }: { theme: string; trigger: number | null }) {
    const shouldReduceMotion = useReducedMotion()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => setMounted(true), [])
    if (!mounted) return null

    const isDark = theme === "dark"
    const opacity = shouldReduceMotion ? 0.3 : 0.6
    const blurOpacity = shouldReduceMotion ? 0.18 : 0.45
    const baseTint = isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.55)"

    return createPortal(
        <AnimatePresence>
            {trigger !== null ? (
                <motion.div
                    key={trigger}
                    className="pointer-events-none fixed inset-0 z-[9997]"
                    initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
                    animate={{ opacity, scale: 1 }}
                    exit={{ opacity: 0, scale: 1 }}
                    transition={{ duration: shouldReduceMotion ? 0.18 : 0.45, ease: "easeOut" }}
                >
                    <motion.div
                        className="absolute inset-0"
                        style={{ backgroundColor: baseTint }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0.16 : 0.35, ease: "easeOut" }}
                    />
                    <motion.div
                        className={`absolute inset-0 bg-gradient-to-br ${isDark ? "from-background via-background to-muted" : "from-background via-background to-muted"
                            }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0.18 : 0.4, ease: "easeOut" }}
                    />
                    <motion.div
                        className={`absolute left-1/2 top-1/2 h-[65vh] w-[65vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${isDark ? "bg-blue-500/25" : "bg-orange-300/30"
                            }`}
                        initial={{ scale: 0.65, opacity: 0 }}
                        animate={{ scale: 1.05, opacity: blurOpacity }}
                        exit={{ scale: 1.15, opacity: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0.22 : 0.55, ease: "easeOut" }}
                    />
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body,
    )
}

export function ThemeToggle({ className }: { className?: string }) {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [transitionKey, setTransitionKey] = React.useState<number | null>(null)
    const lastTheme = React.useRef<string | null>(null)
    const shouldReduceMotion = useReducedMotion()

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (!mounted || !resolvedTheme) return
        if (lastTheme.current && lastTheme.current !== resolvedTheme) {
            setTransitionKey(Date.now())
        }
        lastTheme.current = resolvedTheme
    }, [mounted, resolvedTheme])

    React.useEffect(() => {
        if (transitionKey === null) return
        const timeout = setTimeout(() => setTransitionKey(null), shouldReduceMotion ? 220 : 650)
        return () => clearTimeout(timeout)
    }, [transitionKey, shouldReduceMotion])

    const theme = resolvedTheme ?? "light"
    const isDark = theme === "dark"

    const toggleTheme = async (e: React.MouseEvent<HTMLButtonElement>) => {
        const x = e.clientX
        const y = e.clientY
        const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y)
        )

        if (!document.startViewTransition) {
            setTheme(isDark ? "light" : "dark")
            return
        }

        // Disable transitions to ensure the "new" snapshot captures the final state instantly
        document.documentElement.classList.add("disable-transitions")

        const transition = document.startViewTransition(() => {
            flushSync(() => {
                setTheme(isDark ? "light" : "dark")
            })
        })

        await transition.ready
        document.documentElement.classList.remove("disable-transitions")

        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
        ]

        document.documentElement.animate(
            {
                clipPath: clipPath,
            },
            {
                duration: 500,
                easing: "ease-in-out",
                pseudoElement: "::view-transition-new(root)",
            }
        )
    }

    // Animation variants (Matching AdminTopNav)
    const dockVariants = {
        idle: { scale: 1, y: 0 },
        hover: { scale: 1.12, y: -2, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
        tap: { scale: 0.95, y: 0 }
    }

    // Render a static fallback until the client mounts to avoid hydration mismatches
    if (!mounted) {
        return (
            <button
                type="button"
                className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-2 ring-primary/25 bg-white text-orange-500 shadow-sm ${className || ''}`}
                aria-label="Toggle theme"
                disabled
            >
                <Sun className="h-5 w-5" aria-hidden />
            </button>
        )
    }

    return (
        <>
            <motion.button
                type="button"
                onClick={toggleTheme}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:text-foreground ring-2 ring-primary/25 z-[10000] ${className || ''}`}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
                variants={dockVariants}
                animate={{
                    boxShadow: isDark
                        ? "0 0 30px rgba(59,130,246,0.45)"
                        : "0 0 30px rgba(251,191,36,0.4)",
                    backgroundColor: isDark ? "oklch(0 0 0 / 0.9)" : "oklch(0.99 0 0 / 0.96)",
                }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
            >
                <motion.span
                    className="absolute inset-0 rounded-full"
                    initial={false}
                    animate={{
                        scale: isDark ? 1.05 : 1,
                        background: isDark
                            ? "radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.18), transparent 60%)"
                            : "radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.2), transparent 60%)",
                        opacity: shouldReduceMotion ? 0.3 : 1,
                    }}
                    transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, ease: "easeOut" }}
                    aria-hidden
                />
                <AnimatePresence mode="popLayout" initial={false}>
                    {isDark ? (
                        <motion.div
                            key="moon"
                            initial={{ opacity: 0, rotate: -90, scale: 0 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: 90, scale: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <Moon className="h-5 w-5 text-blue-400" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="sun"
                            initial={{ opacity: 0, rotate: 90, scale: 0 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            exit={{ opacity: 0, rotate: -90, scale: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <Sun className="h-5 w-5 text-orange-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
                <span className="sr-only">Toggle theme</span>
            </motion.button>
            <ThemeTransitionOverlay theme={theme} trigger={transitionKey} />
        </>
    )
}
