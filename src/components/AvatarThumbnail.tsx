/* eslint-disable @next/next/no-img-element */
import * as React from 'react'

function normalizeName(name: string | null | undefined): string {
  if (!name) return 'Instructor'
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed : 'Instructor'
}

type AvatarThumbnailProps = {
  name: string | null | undefined
  src?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS: Record<NonNullable<AvatarThumbnailProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function AvatarThumbnail({
  name,
  src,
  className = '',
  size = 'md',
}: AvatarThumbnailProps) {
  const displayName = normalizeName(name)
  const sizeClass = SIZE_CLASS[size]

  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        className={`shrink-0 rounded-full object-cover ring-1 ring-border ${sizeClass} ${className}`.trim()}
        loading="lazy"
      />
    )
  }

  const initial = displayName.charAt(0).toUpperCase() || 'I'

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border ${sizeClass} ${className}`.trim()}
      style={{ borderRadius: '50%' }}
    >
      {initial}
    </span>
  )
}

export default AvatarThumbnail
