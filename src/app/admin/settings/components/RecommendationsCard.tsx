import { Button } from '@/components/ui'
import { StatusPill } from '../../_components/design-system'

import type { Recommendation, SettingsState } from '../types'
import { SkeletonBlock } from './SkeletonBlock'

export type RecommendationsCardProps = {
  loading: boolean
  recommendations: SettingsState['recommendations']
  onAction: (rec: Recommendation) => void
  onDismiss: (rec: Recommendation) => void
}

export function RecommendationsCard({ loading, recommendations, onAction, onDismiss }: RecommendationsCardProps) {
  if (loading) {
    return <SkeletonBlock className="h-48" />
  }

  if (recommendations.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">All recommended actions are complete.</p>
  }

  return (
    <div className="space-y-4">
      {recommendations.map(rec => {
        const badgeTone = rec.complete ? 'success' : 'info'
        const badgeLabel = rec.complete ? 'Complete' : 'Recommended'
        return (
          <div
            key={rec.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-base font-medium text-[var(--foreground)]">{rec.title}</p>
                <StatusPill tone={badgeTone}>{badgeLabel}</StatusPill>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">{rec.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="primary"
                disabled={rec.complete}
                onClick={() => onAction(rec)}
              >
                {rec.cta}
              </Button>
              {!rec.complete ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onDismiss(rec)}
                >
                  Dismiss
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
