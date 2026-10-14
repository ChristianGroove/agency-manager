"use client"

import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"
import { cn } from "@/modules/infrastructure/utils/utils"

export function AuthThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className={cn("h-5 w-5", className)} />
    }

    const isDark = resolvedTheme === "dark"

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const targetTheme = isDark ? "light" : "dark"

        // Fallback if View Transitions API is unsupported or user prefers reduced motion
        if (
            typeof document === "undefined" ||
            !("startViewTransition" in document) ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            setTheme(targetTheme)
            return
        }

        const rect = event.currentTarget.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2

        const endRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        )

        const transition = (document as any).startViewTransition(() => {
            flushSync(() => {
                setTheme(targetTheme)
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

    return (
        <button
            type="button"
            onClick={handleToggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={cn(
                "relative flex h-5 w-5 items-center justify-center p-0 bg-transparent border-0 outline-none cursor-pointer focus:outline-none select-none text-zinc-500 dark:text-zinc-400",
                className
            )}
        >
            {/* Lucide Sun/Moon with animated rotation & scale */}
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-500 ease-out dark:-rotate-90 dark:scale-0 dark:opacity-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 opacity-0 transition-all duration-500 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100" />
        </button>
    )
}
