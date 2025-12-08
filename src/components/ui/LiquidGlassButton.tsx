"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    loadingLabel?: string
}

export function LiquidGlassButton({
    className,
    children,
    isLoading,
    loadingLabel,
    disabled,
    ...props
}: LiquidGlassButtonProps) {
    return (
        <motion.button
            className={cn(
                "group relative isolate flex w-full items-center justify-center overflow-hidden rounded-full px-8 py-4 font-medium text-white transition-all active:scale-95",
                (disabled || isLoading) && "cursor-not-allowed opacity-80",
                className
            )}
            disabled={disabled || isLoading}
            whileHover="hover"
            initial="idle"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {...props as any}
        >
            {/* Liquid Background Layer */}
            <div className="absolute inset-0 -z-10 bg-primary" />

            {/* Moving Blobs */}
            <motion.div
                animate={{
                    x: ["0%", "25%", "0%", "-25%", "0%"],
                    y: ["0%", "-15%", "-30%", "-15%", "0%"],
                    rotate: [0, 45, 90, 45, 0],
                    scale: [1, 1.2, 1, 1.2, 1]
                }}
                transition={{
                    duration: 8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
                className="absolute -left-4 -top-10 -z-10 h-32 w-32 rounded-full bg-white/30 blur-2xl"
            />
            <motion.div
                animate={{
                    x: ["0%", "-25%", "0%", "25%", "0%"],
                    y: ["0%", "15%", "30%", "15%", "0%"],
                    rotate: [0, -45, -90, -45, 0],
                    scale: [1, 1.1, 0.9, 1.1, 1]
                }}
                transition={{
                    duration: 10,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse",
                    delay: 1
                }}
                className="absolute -bottom-10 -right-4 -z-10 h-32 w-32 rounded-full bg-white/30 blur-2xl"
            />

            {/* Glass Overlay */}
            <div className="absolute inset-0 -z-10 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
                {isLoading ? (
                    <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {loadingLabel || "Loading..."}
                    </>
                ) : (
                    children
                )}
            </span>
        </motion.button>
    )
}
