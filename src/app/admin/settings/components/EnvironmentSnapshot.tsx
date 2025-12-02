import type { SnapshotItem } from '../types'
import { SkeletonBlock } from './SkeletonBlock'

export type EnvironmentSnapshotProps = {
  loading: boolean
  items: SnapshotItem[]
}

export function EnvironmentSnapshot({ loading, items }: EnvironmentSnapshotProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(n => (
          <SkeletonBlock key={n} className="h-32" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No environment data available yet.</p>
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map(item => {
        const valueTone =
          item.status === 'good'
            ? 'text-[var(--foreground)]'
            : item.status === 'warn'
              ? 'text-[#b45309]'
              : 'text-[#be123c]'
        return (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-6">
            <p className="caps-label caps-label--muted block">{item.title}</p>
            <p className={`mt-3 text-2xl font-semibold ${valueTone}`}>{item.headline}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.helper}</p>
          </div>
        )
      })}
    </div>
  )
}
