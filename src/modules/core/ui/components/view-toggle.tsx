"use client"

import { LayoutGrid, Rows, LayoutTemplate, Kanban } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export type ViewMode = 'grid' | 'list' | 'compact' | 'kanban'

interface ViewToggleProps<T extends string = ViewMode> {
    view: T
    onViewChange: (view: T) => void
    className?: string
    showCompact?: boolean
    showKanban?: boolean
    disableKanban?: boolean
    disableKanbanTooltip?: string
}

export function ViewToggle<T extends string = ViewMode>({
    view,
    onViewChange,
    className,
    showCompact = true,
    showKanban = false,
    disableKanban = false,
    disableKanbanTooltip = "Tablero Kanban disponible solo para tickets",
}: ViewToggleProps<T>) {
    return (
        <TooltipProvider delayDuration={150}>
            <div className={cn(
                "glass-card rounded-2xl p-1.5 flex items-center transition-all hover:shadow-md",
                className
            )}>
                <div className="flex bg-zinc-100/50 dark:bg-white/5 rounded-xl p-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onViewChange('list' as T)}
                                className={cn(
                                    "p-2 rounded-lg transition-all cursor-pointer",
                                    view === ('list' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                                )}
                                aria-label="Vista Lista"
                            >
                                <Rows className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <span>Vista Lista</span>
                        </TooltipContent>
                    </Tooltip>

                    {showKanban && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className={cn("inline-flex", disableKanban && "cursor-not-allowed")}>
                                    <button
                                        type="button"
                                        disabled={disableKanban}
                                        onClick={disableKanban ? undefined : () => onViewChange('kanban' as T)}
                                        className={cn(
                                            "p-2 rounded-lg transition-all",
                                            disableKanban
                                                ? "opacity-35 text-zinc-400 dark:text-zinc-600 cursor-not-allowed pointer-events-none"
                                                : "cursor-pointer",
                                            !disableKanban && (view === ('kanban' as string)
                                                ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10")
                                        )}
                                        aria-label="Tablero Kanban"
                                    >
                                        <Kanban className="h-4 w-4" />
                                    </button>
                                </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <span>{disableKanban ? disableKanbanTooltip : "Tablero Kanban"}</span>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {showCompact && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => onViewChange('compact' as T)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all cursor-pointer",
                                        view === ('compact' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                                    )}
                                    aria-label="Vista Compacta"
                                >
                                    <LayoutTemplate className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <span>Vista Compacta</span>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onViewChange('grid' as T)}
                                className={cn(
                                    "p-2 rounded-lg transition-all cursor-pointer",
                                    view === ('grid' as string) ? "bg-white dark:bg-white/10 text-zinc-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10"
                                )}
                                aria-label="Vista Detallada"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <span>Vista Detallada</span>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
