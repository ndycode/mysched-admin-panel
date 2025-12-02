import type { ComponentPropsWithoutRef } from 'react'

export type ToggleProps = ComponentPropsWithoutRef<'button'> & {
  pressed: boolean
  onPressedChange: (next: boolean) => void
  label: string
}

export function Toggle({ pressed, onPressedChange, label, className = '', ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onPressedChange(!pressed)}
      aria-pressed={pressed}
      aria-label={label}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border border-[var(--line)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${pressed ? 'bg-primary' : 'bg-input'
        } ${className}`.trim()}
      {...rest}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-background transition-transform ${pressed ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  )
}
