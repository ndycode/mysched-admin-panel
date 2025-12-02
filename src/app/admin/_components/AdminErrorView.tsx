'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { CardSurface, SectionHeader } from './design-system'
import { PrimaryButton } from '@/components/ui'

type AdminErrorViewProps = {
  label?: string
  title: string
  description: string
  error: Error
  onRetry: () => void
}

export function AdminErrorView({ label = 'Dashboard', title, description, error, onRetry }: AdminErrorViewProps) {
  console.error(error)

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <SectionHeader label={label} title={title} subtitle={description} level="page" />

        <CardSurface className="text-center border-destructive/30 bg-destructive/5 shadow-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Please try again</h2>
            <p className="text-sm text-muted-foreground break-words">
              {error.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <div className="mt-4 flex justify-center">
            <PrimaryButton onClick={onRetry}>Retry</PrimaryButton>
          </div>
        </CardSurface>
      </div>
    </main>
  )
}
