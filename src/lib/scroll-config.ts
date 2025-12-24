/**
 * Scroll configuration for ReactLenis smooth scrolling
 * Used across all smooth-scrolling dropdown menus and lists
 */

export const LENIS_OPTIONS = {
    lerp: 0.12,
    duration: 1.2,
    smoothWheel: true,
    wheelMultiplier: 1.2,
} as const

// Preset for dropdown menus
export const LENIS_DROPDOWN = {
    root: false,
    options: LENIS_OPTIONS,
} as const
