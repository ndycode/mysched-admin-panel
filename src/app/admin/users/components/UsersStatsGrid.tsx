import type { UsersStats } from '../useUsersDirectory'
import { KpiCard } from '../../_components/design-system'

type UsersStatsGridProps = {
  stats: UsersStats
}

export function UsersStatsGrid({ stats }: UsersStatsGridProps) {
  const items: Array<{ title: string; value: number }> = [
    { title: 'Total Users', value: stats.total },
    { title: 'Active Users', value: stats.activeUsers },
    { title: 'Instructors', value: stats.instructorCount },
    { title: 'Admins', value: stats.adminCount },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {items.map(item => (
        <KpiCard key={item.title} label={item.title} value={item.value.toLocaleString()} size="compact" />
      ))}
    </div>
  )
}
