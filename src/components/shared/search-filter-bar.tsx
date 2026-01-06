"use client"

import { Search, ListFilter } from "lucide-react"
import { cn } from "@/lib/utils"
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

    return (
        <div className={cn(
            "bg-white dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md",
            className
        )}>
            {/* Integrated Search */}
            <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                <Search className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                    placeholder={searchPlaceholder}
                    className="bg-transparent border-0 focus:ring-0 text-sm w-full outline-none text-gray-700 dark:text-white placeholder:text-gray-400 h-9"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {/* Collapsible Filter Pills */}
            <div className={cn(
                "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out",
                showFilters ? "max-w-[800px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0 p-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-1.5 min-w-max">
                    {filters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => onFilterChange(filter.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                activeFilter === filter.id
                                    ? getActiveFilterStyles(filter.color || 'gray')
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <span>{filter.label}</span>
                            {filter.count !== undefined && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[10px]",
                                    activeFilter === filter.id
                                        ? "bg-white/20 text-current"
                                        : "bg-gray-100 text-gray-600"
                                )}>
                                    {filter.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

            {/* Toggle Filters Button */}
            <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                    showFilters
                        ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-white/10 shadow-inner"
                        : "bg-white dark:bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                )}
                title="Filtrar"
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
        default: return "bg-gray-900 dark:bg-white text-white dark:text-black shadow-sm"
    }
}
