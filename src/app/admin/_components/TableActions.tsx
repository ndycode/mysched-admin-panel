'use client'

import React from 'react'
import { motion } from 'framer-motion'
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
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <ActionMenuTrigger ariaLabel={ariaLabel} icon={TriggerIcon} variant={variant} />
        </motion.div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((action, index) => {
          const Icon = action.icon
          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DropdownMenuItem
                onClick={() => {
                  if (!action.disabled) action.onSelect()
                }}
                disabled={action.disabled}
                className={action.tone === 'danger' ? 'text-destructive focus:bg-destructive/10 focus:text-destructive' : ''}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden /> : null}
                {action.label}
              </DropdownMenuItem>
            </motion.div>
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
