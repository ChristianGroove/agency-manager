"use client"

import { Search, ListFilter, X, Check, ChevronDown } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export interface FilterSubOption {
    id: string
    label: string
    count?: number
    color?: string
}

export interface FilterOption {
    id: string
    label: string
    count?: number
    color?: string // 'gray' | 'red' | 'amber' | 'emerald' | 'slate' | 'blue' | 'purple' | 'pink' | 'indigo' | 'orange' | 'cyan' | 'sky'
    subOptions?: FilterSubOption[]
}

interface SearchFilterBarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    searchPlaceholder?: string
    filters: FilterOption[]
    activeFilter?: string
    onFilterChange?: (filterId: string) => void
    defaultShowFilters?: boolean
    className?: string
}

export function SearchFilterBar({
    searchTerm,
    onSearchChange,
    searchPlaceholder = "Buscar...",
    filters,
    activeFilter,
    onFilterChange,
    defaultShowFilters = false,
    className
}: SearchFilterBarProps) {
    const [showFilters, setShowFilters] = useState(defaultShowFilters)

    // Current single active filter resolution
    const currentActiveId = activeFilter || (filters.some(f => f.id === "active") ? "active" : "all")

    const handlePillClick = (filterId: string) => {
        onFilterChange?.(filterId)
    }

    const handleSubOptionClick = (subId: string) => {
        onFilterChange?.(subId)
    }

    const handleClearSubOption = (parentFilterId: string) => {
        onFilterChange?.(parentFilterId)
    }

    return (
        <div className={cn(
            "glass-card rounded-2xl p-1.5 flex items-center gap-2 flex-1 min-w-0 max-w-full overflow-hidden transition-all hover:shadow-md",
            className
        )}>
            {/* Integrated Search - Takes all available space on the left */}
            <div className="relative flex items-center px-3 gap-2 flex-1 min-w-[120px] sm:min-w-[160px]">
                <Search className="h-4 w-4 text-zinc-400 shrink-0" />
                <input
                    placeholder={searchPlaceholder}
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

            {/* Collapsible Filter Pills - Right-justified next to the toggle button */}
            <div className={cn(
                "flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar min-w-0 transition-all duration-300 ease-in-out shrink-0 ml-auto",
                showFilters
                    ? "opacity-100 py-0.5"
                    : "w-0 max-w-0 opacity-0 p-0 pointer-events-none"
            )}>
                <div className="flex items-center justify-end gap-1.5 shrink-0">
                    {filters.map(filter => {
                        const hasSubOptions = !!filter.subOptions && filter.subOptions.length > 0
                        const activeSub = filter.subOptions?.find(sub => sub.id === currentActiveId)
                        const isFilterActive = currentActiveId === filter.id || !!activeSub

                        const displayLabel = activeSub ? `${filter.label}: ${activeSub.label}` : filter.label
                        const displayCount = activeSub ? activeSub.count : filter.count
                        const displayColor = activeSub ? (activeSub.color || filter.color || 'gray') : (filter.color || 'gray')

                        return (
                            <div
                                key={filter.id}
                                className={cn(
                                    "flex items-center rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 select-none",
                                    isFilterActive
                                        ? getActiveFilterStyles(displayColor)
                                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                                )}
                            >
                                {/* Main click zone */}
                                <button
                                    type="button"
                                    onClick={() => handlePillClick(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1 py-1 cursor-pointer",
                                        hasSubOptions ? "pl-2.5 pr-0.5" : "px-2.5"
                                    )}
                                >
                                    <span>{displayLabel}</span>
                                    {displayCount !== undefined && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold leading-none ml-0.5",
                                            isFilterActive
                                                ? "bg-white/25 text-current"
                                                : "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                        )}>
                                            {displayCount}
                                        </span>
                                    )}
                                </button>

                                {/* Clear sub-option (X) if a specific sub-option is active */}
                                {activeSub && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleClearSubOption(filter.id)
                                        }}
                                        className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md cursor-pointer text-current opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                                        title={`Quitar filtro "${activeSub.label}" y volver a todas las ${filter.label.toLowerCase()}`}
                                    >
                                        <X className="h-3 w-3 stroke-[2.5]" />
                                    </button>
                                )}

                                {/* Dropdown menu trigger for subOptions */}
                                {hasSubOptions && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                type="button"
                                                className="p-0.5 pr-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-md cursor-pointer text-current opacity-70 hover:opacity-100 transition-opacity ml-0.5"
                                                title={`Ver opciones de ${filter.label.toLowerCase()}`}
                                            >
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl bg-card border border-zinc-200/80 dark:border-white/10 z-50">
                                            <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider px-2 py-1">
                                                {filter.label}
                                            </DropdownMenuLabel>
                                            
                                            <DropdownMenuItem
                                                onClick={() => handlePillClick(filter.id)}
                                                className={cn(
                                                    "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl cursor-pointer hover:bg-muted/60 transition-colors",
                                                    currentActiveId === filter.id && "bg-primary/10 text-primary font-semibold"
                                                )}
                                            >
                                                <span className="flex items-center gap-2 font-medium">
                                                    <span className="text-emerald-500 font-bold">⚡</span>
                                                    <span>Todas las activas</span>
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                                                        {filter.count}
                                                    </span>
                                                    {currentActiveId === filter.id && (
                                                        <Check className="h-3.5 w-3.5 text-primary stroke-[2.5]" />
                                                    )}
                                                </div>
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator className="my-1 bg-border/60" />

                                            {filter.subOptions!.map((sub) => {
                                                const isSubActive = currentActiveId === sub.id
                                                return (
                                                    <DropdownMenuItem
                                                        key={sub.id}
                                                        onClick={() => handleSubOptionClick(sub.id)}
                                                        className={cn(
                                                            "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-xl cursor-pointer hover:bg-muted/60 transition-colors",
                                                            isSubActive && "bg-primary/10 text-primary font-semibold"
                                                        )}
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "w-2 h-2 rounded-full shrink-0",
                                                                sub.color === 'sky' && "bg-sky-500",
                                                                sub.color === 'indigo' && "bg-indigo-500",
                                                                sub.color === 'amber' && "bg-amber-500",
                                                                sub.color === 'red' && "bg-red-500",
                                                                sub.color === 'emerald' && "bg-emerald-500",
                                                                sub.color === 'slate' && "bg-slate-500"
                                                            )} />
                                                            <span>{sub.label}</span>
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {sub.count !== undefined && (
                                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-muted-foreground">
                                                                    {sub.count}
                                                                </span>
                                                            )}
                                                            {isSubActive && <Check className="h-3.5 w-3.5 text-primary stroke-[2.5]" />}
                                                        </div>
                                                    </DropdownMenuItem>
                                                )
                                            })}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Active filter badge when filters are collapsed */}
            {!showFilters && (
                <>
                    {(() => {
                        if (currentActiveId === "all") return null

                        for (const filter of filters) {
                            const activeSub = filter.subOptions?.find(sub => sub.id === currentActiveId)
                            if (activeSub) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(true)}
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 animate-in fade-in transition-all cursor-pointer",
                                            getActiveFilterStyles(activeSub.color || filter.color || 'gray')
                                        )}
                                        title={`${filter.label}: ${activeSub.label} (clic para ver filtros)`}
                                    >
                                        <span>{filter.label}: {activeSub.label}</span>
                                        {activeSub.count !== undefined && (
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/25 text-current font-mono font-bold ml-0.5">
                                                {activeSub.count}
                                            </span>
                                        )}
                                    </button>
                                )
                            }
                            if (currentActiveId === filter.id) {
                                return (
                                    <button
                                        type="button"
                                        onClick={() => setShowFilters(true)}
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 animate-in fade-in transition-all cursor-pointer",
                                            getActiveFilterStyles(filter.color || 'gray')
                                        )}
                                        title={`${filter.label} (clic para ver filtros)`}
                                    >
                                        <span>{filter.label}</span>
                                        {filter.count !== undefined && (
                                            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-white/25 text-current font-mono font-bold ml-0.5">
                                                {filter.count}
                                            </span>
                                        )}
                                    </button>
                                )
                            }
                        }
                        return null
                    })()}
                </>
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
        case 'sky': return "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-500/20 shadow-sm"
        case 'purple': return "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 ring-1 ring-inset ring-purple-600/20 dark:ring-purple-500/20 shadow-sm"
        case 'pink': return "bg-pink-50 dark:bg-brand-pink/10 text-pink-700 dark:text-brand-pink ring-1 ring-inset ring-pink-600/20 dark:ring-brand-pink/20 shadow-sm"
        case 'indigo': return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20 dark:ring-indigo-500/20 shadow-sm"
        case 'orange': return "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-1 ring-inset ring-orange-600/20 dark:ring-orange-500/20 shadow-sm"
        case 'cyan': return "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-600/20 dark:ring-cyan-500/20 shadow-sm"
        default: return "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm"
    }
}
