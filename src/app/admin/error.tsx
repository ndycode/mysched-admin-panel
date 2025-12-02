'use client'

import { AdminErrorView } from '../admin/_components/AdminErrorView'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <AdminErrorView
      label="Dashboard"
      title="Something went wrong"
      description="We hit an unexpected error."
      error={error}
      onRetry={reset}
    />
  )
}
