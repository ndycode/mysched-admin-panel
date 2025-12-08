'use client'

import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

const INTERACTIVE_SELECTORS = 'a, button, input, textarea, select, [role="button"], .cursor-pointer, [onclick]'

export function CustomCursor() {
    const [isHovering, setIsHovering] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const [isClicking, setIsClicking] = useState(false)
    const [isTouchMode, setIsTouchMode] = useState(false)

    const cursorX = useMotionValue(-100)
    const cursorY = useMotionValue(-100)

    // Smooth spring animation for movement
    // Higher damping = less bounce, lower stiffness = smoother tracking
    const springConfig = { damping: 50, stiffness: 400, mass: 0.3 }
    const cursorXSpring = useSpring(cursorX, springConfig)
    const cursorYSpring = useSpring(cursorY, springConfig)

    // Removed build error check as per user request to enable custom scroll/cursor
    const hasBuildError = false

    useEffect(() => {
        const checkTouchMode = () => {
            const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            setIsTouchMode(Boolean(hasCoarsePointer || hasTouch || window.innerWidth < 768))
        }

        checkTouchMode()
        const resizeHandler = () => checkTouchMode()
        window.addEventListener('resize', resizeHandler)
        const mq = window.matchMedia?.('(pointer: coarse)')
        mq?.addEventListener?.('change', checkTouchMode)

        return () => {
            window.removeEventListener('resize', resizeHandler)
            mq?.removeEventListener?.('change', checkTouchMode)
        }
    }, [])

    useEffect(() => {
        if (isTouchMode) return

        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX)
            cursorY.set(e.clientY)
            if (!isVisible) setIsVisible(true)
        }

        const showCursor = () => setIsVisible(true)
        const hideCursor = (e: MouseEvent) => {
            // Only hide if we actually left the window
            if (!e.relatedTarget && (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
                setIsVisible(false)
            }
        }

        const onHoverStart = () => setIsHovering(true)
        const onHoverEnd = () => setIsHovering(false)
        const onMouseDown = () => setIsClicking(true)
        const onMouseUp = () => setIsClicking(false)

        window.addEventListener('mousemove', moveCursor)
        window.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mouseup', onMouseUp)
        document.addEventListener('mouseenter', showCursor)
        document.addEventListener('mouseleave', hideCursor)

        const interactiveElements = document.querySelectorAll(INTERACTIVE_SELECTORS)
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', onHoverStart)
            el.addEventListener('mouseleave', onHoverEnd)
        })

        // Mutation observer to handle dynamically added elements (like modals)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof HTMLElement) {
                            const elements = node.querySelectorAll(INTERACTIVE_SELECTORS)
                            elements.forEach(el => {
                                el.addEventListener('mouseenter', onHoverStart)
                                el.addEventListener('mouseleave', onHoverEnd)
                            })
                            // Also check the node itself
                            if (node.matches(INTERACTIVE_SELECTORS)) {
                                node.addEventListener('mouseenter', onHoverStart)
                                node.addEventListener('mouseleave', onHoverEnd)
                            }
                        }
                    })
                }
            })
        })

        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            window.removeEventListener('mousemove', moveCursor)
            window.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mouseup', onMouseUp)
            document.removeEventListener('mouseenter', showCursor)
            document.removeEventListener('mouseleave', hideCursor)

            interactiveElements.forEach(el => {
                el.removeEventListener('mouseenter', onHoverStart)
                el.removeEventListener('mouseleave', onHoverEnd)
            })
            observer.disconnect()
        }
    }, [cursorX, cursorY, isVisible, isTouchMode])

    if (hasBuildError || isTouchMode) return null

    return (
        <>
            <style jsx global>{`
        * {
          cursor: none !important;
        }
      `}</style>
            <motion.div
                className={cn(
                    "pointer-events-none fixed left-0 top-0 z-[2147483647] drop-shadow-sm",
                    isVisible ? "opacity-100" : "opacity-0"
                )}
                style={{
                    x: cursorXSpring,
                    y: cursorYSpring,
                }}
                animate={{
                    // Adjust hotspot: 
                    // default.svg (Arrow) -> ~14px, 10px
                    // handpointing.svg (Hand) -> ~24px, 4px
                    translateX: isHovering ? "-24px" : "-14px",
                    translateY: isHovering ? "-4px" : "-10px",
                    scale: isClicking ? 0.8 : 1,
                }}
            >
                {isHovering ? (
                    <img
                        src="/cursors/handpointing.svg"
                        alt="Link Cursor"
                        className="h-11 w-auto pointer-events-none"
                    />
                ) : (
                    <img
                        src="/cursors/default.svg"
                        alt="Normal Cursor"
                        className="h-11 w-auto pointer-events-none"
                    />
                )}
            </motion.div>
        </>
    )
}
