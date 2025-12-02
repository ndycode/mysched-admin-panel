'use client'

import { AdminErrorView } from '../_components/AdminErrorView'

export default function InstructorsError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <AdminErrorView
      label="Dashboard"
      title="Instructors error"
      description="We hit a snag loading instructors."
      error={error}
      onRetry={reset}
    />
  )
}
