"use client";

import { cn } from "@/lib/utils";
import React from "react";

interface GridPatternBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}

export function GridPatternBackground({
    className,
    children,
    ...props
}: GridPatternBackgroundProps) {
    return (
        <div
            className={cn(
                "relative flex min-h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950",
                className
            )}
            {...props}
        >
            {/* Grid Pattern */}
            <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Mask */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_50%,transparent,var(--background))] dark:bg-[radial-gradient(circle_800px_at_50%_50%,transparent,#09090b)]"></div>

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
