import React from 'react'
import { cn } from '@/lib/utils'

export function UserGridRow({
  children,
  gridTemplate,
  className,
}: {
  children: React.ReactNode
  gridTemplate: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid items-center gap-4 border-b border-border px-4 py-3 last:border-0 transition-colors hover:bg-muted/50 min-w-[1000px] group',
        className,
      )}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {children}
    </div>
  )
}

export function UserGridCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('text-sm text-muted-foreground truncate', className)}>{children}</div>
}

export function UserGridActionCell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky right-0 z-10 text-right pr-4 -mr-4 pl-2 bg-background dark:bg-black group-hover:bg-muted/50 border-l border-border"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {children}
    </div>
  )
}
