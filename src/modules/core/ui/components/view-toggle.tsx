"use client"

import { LayoutGrid, Rows, LayoutTemplate } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export type ViewMode = 'grid' | 'list' | 'compact'

interface ViewToggleProps {
    view: ViewMode
    onViewChange: (view: ViewMode) => void
    className?: string
    showCompact?: boolean
}

export function ViewToggle({ view, onViewChange, className, showCompact = true }: ViewToggleProps) {
    return (
        <div className={cn(
            "glass-card rounded-2xl p-1.5 flex items-center transition-all hover:shadow-md",
            className
        )}>
            <div className="flex bg-zinc-100/50 dark:bg-white/5 rounded-xl p-0.5">
                <button
                    onClick={() => onViewChange('list')}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === 'list' ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                    )}
                    title="Vista Lista"
                >
                    <Rows className="h-4 w-4" />
                </button>
                {showCompact && (
                    <button
                        onClick={() => onViewChange('compact')}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            view === 'compact' ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                        )}
                        title="Vista Compacta"
                    >
                        <LayoutTemplate className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={() => onViewChange('grid')}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === 'grid' ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                    )}
                    title="Vista Detallada"
                >
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
