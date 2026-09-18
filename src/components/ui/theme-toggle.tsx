"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { cn } from "@/modules/infrastructure/utils/utils"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark")
    }

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        className={cn(
                            "fixed bottom-4 right-4 z-[9999] rounded-full w-8 h-8 shadow-xl backdrop-blur-md bg-background/50 border-input transition-all duration-300 hover:scale-105 cursor-pointer",
                            "dark:bg-zinc-900/50 dark:border-zinc-800"
                        )}
                        aria-label="Cambiar tema visual"
                    >
                        <Sun className="h-3 w-3 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-3 w-3 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                    <span>{theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
