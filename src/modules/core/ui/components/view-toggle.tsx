"use client"

import { LayoutGrid, Rows, LayoutTemplate, Kanban } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export type ViewMode = 'grid' | 'list' | 'compact' | 'kanban'

interface ViewToggleProps<T extends string = ViewMode> {
    view: T
    onViewChange: (view: T) => void
    className?: string
    showCompact?: boolean
    showKanban?: boolean
}

export function ViewToggle<T extends string = ViewMode>({
    view,
    onViewChange,
    className,
    showCompact = true,
    showKanban = false
}: ViewToggleProps<T>) {
    return (
        <div className={cn(
            "glass-card rounded-2xl p-1.5 flex items-center transition-all hover:shadow-md",
            className
        )}>
            <div className="flex bg-zinc-100/50 dark:bg-white/5 rounded-xl p-0.5">
                <button
                    onClick={() => onViewChange('list' as T)}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === ('list' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                    )}
                    title="Vista Lista"
                >
                    <Rows className="h-4 w-4" />
                </button>
                {showKanban && (
                    <button
                        onClick={() => onViewChange('kanban' as T)}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            view === ('kanban' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                        )}
                        title="Tablero Kanban"
                    >
                        <Kanban className="h-4 w-4" />
                    </button>
                )}
                {showCompact && (
                    <button
                        onClick={() => onViewChange('compact' as T)}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            view === ('compact' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                        )}
                        title="Vista Compacta"
                    >
                        <LayoutTemplate className="h-4 w-4" />
                    </button>
                )}
                <button
                    onClick={() => onViewChange('grid' as T)}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === ('grid' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                    )}
                    title="Vista Detallada"
                >
                    <LayoutGrid className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
