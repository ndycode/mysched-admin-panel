'use client'

import React from 'react'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/SmoothDropdown'
import { ActionMenuTrigger } from './design-system'
import { cn } from '@/lib/utils'

export type TableActionItem = {
  label: string
  onSelect: () => void
  icon?: React.ElementType
  tone?: 'default' | 'danger'
  disabled?: boolean
}

type TableActionsProps = {
  items: TableActionItem[]
  ariaLabel?: string
  variant?: 'muted' | 'accent'
  triggerIcon?: React.ElementType
}

export function TableActions({ items, ariaLabel, variant = 'muted', triggerIcon }: TableActionsProps) {
  const TriggerIcon = triggerIcon ?? MoreVertical
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionMenuTrigger ariaLabel={ariaLabel} icon={TriggerIcon} variant={variant} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map(action => {
          const Icon = action.icon
          return (
            <DropdownMenuItem
              key={action.label}
              onClick={() => {
                if (!action.disabled) action.onSelect()
              }}
              disabled={action.disabled}
              className={action.tone === 'danger' ? 'text-destructive focus:bg-destructive/10 focus:text-destructive' : ''}
            >
              {Icon ? <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden /> : null}
              {action.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type TableActionCellProps = {
  children: React.ReactNode
  className?: string
}

export function TableActionCell({ children, className }: TableActionCellProps) {
  return (
    <td
      className={cn(
        'sticky right-0 px-3 py-3 text-right sm:px-4 border-l border-border min-w-16 bg-background dark:bg-black group-hover:bg-muted/50',
        className,
      )}
      style={{ backgroundColor: 'var(--background)' }}
    >
      {children}
    </td>
  )
}
