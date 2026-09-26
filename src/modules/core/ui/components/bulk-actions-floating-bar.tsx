
import { Trash2, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/modules/infrastructure/utils/utils"

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface BulkActionsFloatingBarProps {
    selectedCount: number
    onDelete: () => void
    onClearSelection: () => void
    isDeleting?: boolean
    className?: string
}

export function BulkActionsFloatingBar({
    selectedCount,
    onDelete,
    onClearSelection,
    isDeleting = false,
    className,
}: BulkActionsFloatingBarProps) {
    if (selectedCount === 0) return null

    return (
        <TooltipProvider delayDuration={150}>
            <div className={cn("fixed bottom-[88px] sm:bottom-[96px] left-0 right-0 flex justify-center z-[60] pointer-events-none", className)}>
                <div className="bg-white dark:bg-zinc-900 rounded-full shadow-2xl border border-gray-200 dark:border-white/10 p-1.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto ring-1 ring-black/5">
                    {/* Count Badge */}
                    <div className="pl-3 flex items-center gap-2">
                        <div className="bg-gray-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-2 py-0.5 rounded-full">
                            {selectedCount}
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">seleccionados</span>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onDelete}
                                    disabled={isDeleting}
                                    className={cn(
                                        "rounded-full h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-300 cursor-pointer",
                                        "hover:scale-110 active:scale-95"
                                    )}
                                    aria-label="Eliminar selección"
                                >
                                    {isDeleting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <span>Eliminar elementos seleccionados</span>
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onClearSelection}
                                    disabled={isDeleting}
                                    className="rounded-full h-9 w-9 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                                    aria-label="Cancelar selección"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                <span>Cancelar selección</span>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
