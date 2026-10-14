"use client"

import React from "react"
import { flushSync } from "react-dom"

/**
 * Executes a theme / DOM state mutation with a GPU-accelerated circular expanding mask View Transition
 * radiating from the triggering element or mouse coordinates.
 *
 * Falls back immediately for unsupported browsers or prefers-reduced-motion.
 */
export function executeThemeTransition(
    eventOrElement: React.MouseEvent<HTMLElement> | MouseEvent | HTMLElement | null | undefined,
    updateCallback: () => void
) {
    if (
        typeof document === "undefined" ||
        !("startViewTransition" in document) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        updateCallback()
        return
    }

    let x = window.innerWidth / 2
    let y = window.innerHeight / 2

    if (eventOrElement) {
        let targetEl: HTMLElement | null = null
        if ("currentTarget" in eventOrElement && eventOrElement.currentTarget instanceof HTMLElement) {
            targetEl = eventOrElement.currentTarget
        } else if (eventOrElement instanceof HTMLElement) {
            targetEl = eventOrElement
        } else if ("clientX" in eventOrElement && typeof eventOrElement.clientX === "number") {
            x = eventOrElement.clientX
            y = eventOrElement.clientY
        }

        if (targetEl) {
            const rect = targetEl.getBoundingClientRect()
            x = rect.left + rect.width / 2
            y = rect.top + rect.height / 2
        }
    }

    const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    )

    const transition = (document as any).startViewTransition(() => {
        flushSync(() => {
            updateCallback()
        })
    })

    transition.ready.then(() => {
        const clipPath = [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
        ]

        document.documentElement.animate(
            {
                clipPath: clipPath,
            },
            {
                duration: 500,
                easing: "cubic-bezier(0.2, 0, 0, 1)",
                pseudoElement: "::view-transition-new(root)",
            }
        )
    })
}
