"use client"

import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { executeThemeTransition } from "@/modules/infrastructure/utils/theme-transition"
import { cn } from "@/modules/infrastructure/utils/utils"

export function AuthThemeToggle({ className }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className={cn("h-5 w-5 mt-6", className)} />
    }

    const isDark = resolvedTheme === "dark"

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const targetTheme = isDark ? "light" : "dark"
        executeThemeTransition(event, () => {
            setTheme(targetTheme)
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={cn(
                "relative flex h-5 w-5 items-center justify-center p-0 mt-6 bg-transparent border-0 outline-none cursor-pointer focus:outline-none select-none text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors",
                className
            )}
        >
            {/* When light: Moon is displayed to switch to dark. When dark: Sun is displayed to switch to light */}
            <Moon className="h-4 w-4 text-zinc-500 hover:text-zinc-700 rotate-0 scale-100 transition-all duration-300 ease-out dark:-rotate-90 dark:scale-0 dark:opacity-0" />
            <Sun className="absolute h-4 w-4 text-zinc-400 hover:text-zinc-200 rotate-90 scale-0 opacity-0 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100 dark:opacity-100" />
        </button>
    )
}
