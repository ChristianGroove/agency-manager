"use client"

import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import styles from './admin-access-button.module.css'
import { cn } from '@/modules/infrastructure/utils/utils'
import { executeThemeTransition } from '@/modules/infrastructure/utils/theme-transition'

export function SidebarThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-[25px] h-[25px] rounded-full" />
        )
    }

    const isDark = resolvedTheme === 'dark'

    const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const next = isDark ? 'light' : 'dark'
        executeThemeTransition(event, () => {
            setTheme(next)
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={cn(styles.iconOnlyButton, "group")}
        >
            {isDark ? (
                <Sun className="w-3 h-3 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
                <Moon className="w-3 h-3 text-zinc-600 dark:text-zinc-300 group-hover:-rotate-12 transition-transform duration-300" />
            )}
        </button>
    )
}
