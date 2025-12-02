"use client";

import { cn } from "@/lib/utils";

interface StaticDotBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

export function StaticDotBackground({
    className,
    children,
    ...props
}: StaticDotBackgroundProps) {
    return (
        <div
            className={cn(
                "relative flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950",
                className
            )}
            {...props}
        >
            {/* Dot Pattern */}
            <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"></div>

            {/* Radial Mask for Depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,transparent,var(--background))] dark:bg-[radial-gradient(circle_800px_at_50%_50%,transparent,#09090b)]"></div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
