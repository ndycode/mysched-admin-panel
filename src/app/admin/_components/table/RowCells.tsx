import React from 'react'
import { cn } from '@/lib/utils'

export type BaseCellProps = React.HTMLAttributes<HTMLTableCellElement>

export function TextCell({ className, children, ...rest }: BaseCellProps) {
  return (
    <td className={cn('px-4 py-3 text-sm text-foreground sm:px-5', className)} {...rest}>
      {children}
    </td>
  )
}

export function MutedCell({ className, children, ...rest }: BaseCellProps) {
  return (
    <td className={cn('px-4 py-3 text-sm text-muted-foreground sm:px-5', className)} {...rest}>
      {children}
    </td>
  )
}

export function StickyActionCell({ className, children, ...rest }: BaseCellProps) {
  return (
    <td
      data-testid="sticky-action-cell"
      className={cn(
        'sticky right-0 px-3 py-3 text-right sm:px-4 border-l border-border min-w-[60px] bg-background dark:bg-black group-hover:bg-muted/50',
        className,
      )}
      style={{ backgroundColor: 'var(--background)' }}
      {...rest}
    >
      {children}
    </td>
  )
}

export function Truncate({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('truncate', className)} title={title}>
      {children}
    </div>
  )
}
