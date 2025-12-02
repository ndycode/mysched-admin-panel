"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedGridBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

export function AnimatedGridBackground({
    className,
    children,
    ...props
}: AnimatedGridBackgroundProps) {
    return (
        <div
            className={cn(
                "relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950",
                className
            )}
            {...props}
        >
            <div className="absolute inset-0 z-0">
                <GridPattern />
            </div>

            {/* Radial Mask */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_800px_at_50%_50%,transparent,var(--background))] dark:bg-[radial-gradient(circle_800px_at_50%_50%,transparent,#09090b)]"></div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}

function GridPattern() {
    const columns = 40;
    const rows = 20;

    return (
        <div className="flex h-full w-full items-center justify-center opacity-40">
            <div className="relative h-full w-full">
                {/* Horizontal Lines */}
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={`row-${i}`}
                        className="absolute left-0 w-full border-t border-zinc-200 dark:border-zinc-800"
                        style={{ top: `${(i + 1) * (100 / rows)}%` }}
                    />
                ))}

                {/* Vertical Lines */}
                {Array.from({ length: columns }).map((_, i) => (
                    <div
                        key={`col-${i}`}
                        className="absolute top-0 h-full border-l border-zinc-200 dark:border-zinc-800"
                        style={{ left: `${(i + 1) * (100 / columns)}%` }}
                    />
                ))}

                {/* Animated Beams */}
                <GridBeam delay={0} duration={8} />
                <GridBeam delay={2} duration={10} />
                <GridBeam delay={4} duration={7} />
            </div>
        </div>
    );
}

function GridBeam({ delay, duration }: { delay: number; duration: number }) {
    const [top, setTop] = useState<number>(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setTop(Math.random() * 100);
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <motion.div
            className="absolute left-0 h-[1px] w-[100px] bg-gradient-to-r from-transparent via-blue-500 to-transparent blur-[2px]"
            style={{ top: `${top}%` }}
            animate={{
                left: ["-10%", "110%"],
            }}
            transition={{
                duration,
                repeat: Infinity,
                ease: "linear",
                delay,
            }}
        />
    );
}
