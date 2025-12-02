'use client'

import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  badge?: string
  className?: string
}

export function PageHeader({ title, description, actions, badge, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="space-y-2">
        {badge ? (
          <span className="caps-label inline-flex rounded-full border border-[var(--border-soft)] bg-white/80 px-3 py-1 text-[var(--brand-strong)]/80 backdrop-blur">
            {badge}
          </span>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-[var(--muted-strong)]">{title}</h1>
          {description ? <p className="text-sm text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      </div>

      {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">{actions}</div> : null}
    </header>
  )
}
