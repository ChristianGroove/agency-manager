
import { Trash2, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BulkActionsFloatingBarProps {
    selectedCount: number
    onDelete: () => void
    onClearSelection: () => void
    isDeleting?: boolean
}

export function BulkActionsFloatingBar({
    selectedCount,
    onDelete,
    onClearSelection,
    isDeleting = false
}: BulkActionsFloatingBarProps) {
    if (selectedCount === 0) return null

    return (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 pointer-events-none">
            <div className="bg-white rounded-full shadow-2xl border border-gray-200 p-1.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto ring-1 ring-black/5">
                {/* Count Badge */}
                <div className="pl-3 flex items-center gap-2">
                    <div className="bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {selectedCount}
                    </div>
                    <span className="text-sm font-medium text-gray-600">seleccionados</span>
                </div>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-gray-200" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className={cn(
                            "rounded-full h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300",
                            "hover:scale-110 active:scale-95"
                        )}
                        title="Eliminar selección"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClearSelection}
                        disabled={isDeleting}
                        className="rounded-full h-9 w-9 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                        title="Cancelar selección"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
