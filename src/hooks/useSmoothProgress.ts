'use client'

import { useEffect, useRef, useState } from 'react'

type SmoothProgressOptions = {
  duration?: number
  ease?: (t: number) => number
}

const DEFAULT_DURATION = 420

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = () => setPrefers(media.matches)
    handleChange()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener?.(handleChange)
    return () => media.removeListener?.(handleChange)
  }, [])

  return prefers
}

export function useSmoothProgress(target: number, options?: SmoothProgressOptions) {
  const { duration = DEFAULT_DURATION, ease = easeOutCubic } = options ?? {}
  const prefersReducedMotion = usePrefersReducedMotion()
  const frameRef = useRef<number | null>(null)
  const currentRef = useRef(clamp(target, 0, 1))
  const [progress, setProgress] = useState(() => clamp(target, 0, 1))

  useEffect(() => {
    const nextTarget = clamp(target, 0, 1)

    if (prefersReducedMotion || duration <= 0) {
      currentRef.current = nextTarget
      setProgress(nextTarget)
      return
    }

    const startValue = currentRef.current
    const delta = nextTarget - startValue

    if (Math.abs(delta) < 0.001) {
      currentRef.current = nextTarget
      setProgress(nextTarget)
      return
    }

    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const t = clamp(elapsed / duration, 0, 1)
      const eased = ease(t)
      const next = startValue + delta * eased
      currentRef.current = next
      setProgress(next)

      if (t < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [target, duration, ease, prefersReducedMotion])

  return progress
}
