import { Transition, Variants } from 'framer-motion'

// Check if we are in development mode
export const isDev = process.env.NODE_ENV === 'development'

// Standard spring physics for the application
export const spring: Transition = {
    type: 'spring',
    stiffness: 300,
    damping: 25,
}

// Slower/simpler spring for dev to reduce CPU load
export const devSpring: Transition = {
    type: 'spring',
    stiffness: 200,
    damping: 30, // Higher damping = less oscillation = less paint
}

// Global motion config to use in MotionConfig provider if we added one,
// or to manually apply to heavy components.
export const motionConfig = {
    // In dev, we might want to disable layout animations on heavy lists
    layout: isDev ? false : true,
    // Use simpler spring in dev
    transition: isDev ? devSpring : spring,
}

// Helper to conditionally enable layout prop
export const safeLayout = isDev ? undefined : true

// Standard variants with dev optimizations
export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

export const slideUp: Variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
}

// Use this for hover scales to ensure they are GPU friendly
export const hoverScale = {
    scale: 1.02,
    transition: isDev ? { duration: 0.1 } : spring,
}

export const tapScale = {
    scale: 0.98,
    transition: isDev ? { duration: 0.05 } : spring,
}
