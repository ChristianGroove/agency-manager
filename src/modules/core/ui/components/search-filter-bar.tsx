"use client"

import { Search, ListFilter, X } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useState } from "react"

export interface FilterOption {
    id: string
    label: string
    count?: number
    color?: string // 'gray' | 'red' | 'amber' | 'emerald' | 'slate' | 'blue' | 'purple' | 'pink' | 'indigo' | 'orange' | 'cyan'
}

interface SearchFilterBarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filters: FilterOption[]
    activeFilter: string
    onFilterChange: (filterId: string) => void
    className?: string
}

export function SearchFilterBar({
    searchTerm,
    onSearchChange,
    searchPlaceholder = "Buscar...",
    filters,
    activeFilter,
    onFilterChange,
    className
}: SearchFilterBarProps) {
    const [showFilters, setShowFilters] = useState(false)
    const activeFilterObj = filters.find(f => f.id === activeFilter && f.id !== "all")

    return (
        <div className={cn(
            "glass-card rounded-2xl p-1.5 flex items-center gap-2 flex-1 min-w-0 max-w-full overflow-hidden transition-all hover:shadow-md",
            className
        )}>
            {/* Integrated Search - Contracts smoothly when filters are shown */}
            <div className={cn(
                "relative flex items-center px-3 gap-2 transition-all duration-300 min-w-0",
                showFilters ? "w-[130px] sm:w-[170px] shrink-0" : "flex-1 w-full"
            )}>
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                    placeholder={showFilters ? "Buscar..." : searchPlaceholder}
                    className="bg-transparent border-0 focus:ring-0 text-sm w-full outline-none text-zinc-700 dark:text-white placeholder:text-zinc-400 h-9 min-w-0 truncate"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 cursor-pointer"
                        title="Limpiar búsqueda"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Collapsible Filter Pills - Strictly constrained inside the combobox space */}
            <div className={cn(
                "flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 transition-all duration-300 ease-in-out",
                showFilters
                    ? "flex-1 opacity-100 py-0.5"
                    : "w-0 max-w-0 opacity-0 p-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-1.5 shrink-0">
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            type="button"
                            onClick={() => onFilterChange(filter.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer",
                                activeFilter === filter.id
                                    ? getActiveFilterStyles(filter.color || 'gray')
                                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                            )}
                        >
                            <span>{filter.label}</span>
                            {filter.count !== undefined && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px]",
                                    activeFilter === filter.id
                                        ? "bg-white/20 text-current"
                                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                )}>
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active filter badge when filters are collapsed */}
            {!showFilters && activeFilterObj && (
                <button
                    type="button"
                    onClick={() => setShowFilters(true)}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 animate-in fade-in transition-all cursor-pointer",
                        getActiveFilterStyles(activeFilterObj.color || 'gray')
                    )}
                    title="Filtro activo (clic para ver todos)"
                >
                    <span>{activeFilterObj.label}</span>
                    {activeFilterObj.count !== undefined && (
                        <span className="px-1 py-0.2 rounded-md text-[10px] bg-white/20 text-current font-mono">
                            {activeFilterObj.count}
                        </span>
                    )}
                </button>
            )}

            {/* Divider */}
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5 shrink-0" />

            {/* Toggle Filters Button */}
            <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border shrink-0 cursor-pointer",
                    showFilters
                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-white/10 shadow-inner"
                        : "bg-white dark:bg-transparent text-zinc-500 dark:text-zinc-400 border-transparent hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                )}
                title={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            >
                <ListFilter className="h-4 w-4" />
            </button>
        </div>
    )
}

function getActiveFilterStyles(color: string) {
    switch (color) {
        case 'red': return "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/20 dark:ring-red-500/20 shadow-sm"
        case 'amber': return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-500/20 shadow-sm"
        case 'emerald': return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-500/20 shadow-sm"
        case 'slate': return "bg-slate-50 dark:bg-slate-500/10 text-slate-700 dark:text-slate-400 ring-1 ring-inset ring-slate-600/20 dark:ring-slate-500/20 shadow-sm"
        case 'blue': return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-500/20 shadow-sm"
        case 'purple': return "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20 dark:ring-purple-500/20 shadow-sm"
        case 'pink': return "bg-pink-50 dark:bg-brand-pink/10 text-pink-700 dark:text-brand-pink ring-1 ring-inset ring-pink-600/20 dark:ring-brand-pink/20 shadow-sm"
        case 'indigo': return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20 dark:ring-indigo-500/20 shadow-sm"
        case 'orange': return "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-600/20 dark:ring-orange-500/20 shadow-sm"
        case 'cyan': return "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-600/20 dark:ring-cyan-500/20 shadow-sm"
        default: return "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm"
    }
}
