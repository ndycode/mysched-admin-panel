import { useEffect, useRef, type RefObject } from 'react'

import type { UserRole, UserStatus } from '../../types'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INPUT_BASE_CLASSES =
  'mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

export function inputClasses(hasError: boolean): string {
  return hasError
    ? `${INPUT_BASE_CLASSES} border-[#ef4444] focus-visible:ring-[#ef4444]`
    : INPUT_BASE_CLASSES
}

export function parseAppUserIdInput(raw: string): { value: number | null; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { value: null }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return { value: null, error: 'Enter a non-negative whole number' }
  }
  return { value: parsed }
}

export function useDialogFocusTrap(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onEscape?: () => void,
) {
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!open || !ref.current) return

    const node = ref.current
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    const focusables = Array.from(node.querySelectorAll<HTMLElement>(focusableSelectors))
    const [first, last] = [focusables[0], focusables[focusables.length - 1]]
    first?.focus({ preventScroll: true })

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Tab' && focusables.length > 0) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
            ; (last ?? first).focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
            ; (first ?? last).focus()
        }
      } else if (event.key === 'Escape' && onEscapeRef.current) {
        event.preventDefault()
        onEscapeRef.current()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [open, ref])
}

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'student', label: 'Student' },
]

export const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
]

export type UserFormErrors = Partial<Record<'fullName' | 'email' | 'password' | 'studentId' | 'appUserId', string>>
