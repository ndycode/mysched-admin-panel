'use client'

import { AdminErrorView } from '../_components/AdminErrorView'

export default function ClassesError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <AdminErrorView
      label="Dashboard"
      title="Classes error"
      description="We hit a snag loading classes."
      error={error}
      onRetry={reset}
    />
  )
}
