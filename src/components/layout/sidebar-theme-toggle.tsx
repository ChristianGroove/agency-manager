"use client"

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function SidebarThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    return <button type="button" aria-label="Usar tema oscuro" aria-pressed={resolvedTheme === 'dark'}
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-500 shadow-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-zinc-900 dark:text-gray-400">
        <Moon className="h-3.5 w-3.5 dark:hidden" aria-hidden="true" />
        <Sun className="hidden h-3.5 w-3.5 dark:block" aria-hidden="true" />
    </button>
}
