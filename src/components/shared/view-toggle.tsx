"use client"

import { LayoutGrid, Rows } from "lucide-react"
import { cn } from "@/lib/utils"

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
    view: ViewMode
    onViewChange: (view: ViewMode) => void
    className?: string
}

export function ViewToggle({ view, onViewChange, className }: ViewToggleProps) {
    return (
        <div className={cn(
            "bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex items-center transition-all hover:shadow-md h-[52px]",
            className
        )}>
            <div className="flex bg-gray-50 rounded-xl p-0.5">
                <button
                    onClick={() => onViewChange('grid')}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === 'grid' ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    )}
                    title="Vista Cuadrícula"
                >
                    <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onViewChange('list')}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        view === 'list' ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    )}
                    title="Vista Lista"
                >
                    <Rows className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
