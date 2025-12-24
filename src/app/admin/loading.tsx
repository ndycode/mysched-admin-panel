'use client'

import { LoadingIndicator } from '@/components/ui/LoadingIndicator'

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingIndicator label="Loading..." />
    </div>
  )
}
