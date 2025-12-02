'use client'

import type { ComponentProps } from 'react'
import { ReactLenis } from 'lenis/react'

type SmoothScrollProps = {
  children: ComponentProps<typeof ReactLenis>['children']
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  return (
    <ReactLenis root options={{ lerp: 0.12, duration: 1.2, smoothWheel: true, wheelMultiplier: 1.2 }}>
      {children}
    </ReactLenis>
  )
}
