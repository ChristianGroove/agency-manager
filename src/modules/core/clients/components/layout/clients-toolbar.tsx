"use client"

import React from "react"
import { useClients } from "../../context/clients-context"
import { useTranslation } from "@/lib/i18n/use-translation"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle } from "@/components/shared/view-toggle"
import { Button } from "@/components/ui/button"

export function ClientsToolbar({ 
    counts,
    categories = [],
    activeCategory = 'all',
    onCategoryChange
}: { 
    counts: any,
    categories?: any[],
    activeCategory?: string,
    onCategoryChange?: (id: string) => void
}) {
    const { t } = useTranslation()
    const { 
        searchTerm, 
        setSearchTerm, 
        activeFilter, 
        setActiveFilter, 
        viewMode, 
        setViewMode,
        applyFilters 
    } = useClients()

    const filterOptions: FilterOption[] = [
        { id: 'all', label: t('clients.tabs.all'), count: counts.all, color: 'gray' },
        { id: 'overdue', label: t('clients.tabs.overdue'), count: counts.overdue, color: 'red' },
        { id: 'urgent', label: t('clients.tabs.urgent'), count: counts.urgent, color: 'amber' },
        { id: 'active', label: t('clients.tabs.active'), count: counts.active, color: 'emerald' },
        { id: 'inactive', label: t('clients.tabs.inactive'), count: counts.inactive, color: 'slate' },
    ]

    return (
        <div className="flex flex-col xl:flex-row gap-8 z-30 items-center w-full">
            <div className="flex-1 w-full min-w-[300px]">
                <SearchFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={(val) => {
                        setSearchTerm(val)
                        applyFilters(val, activeFilter)
                    }}
                    searchPlaceholder="Buscar contactos..."
                    filters={filterOptions}
                    activeFilter={activeFilter}
                    onFilterChange={(val) => {
                        setActiveFilter(val)
                        applyFilters(searchTerm, val)
                    }}
                />
            </div>

            {/* Categories Middle Section - Adaptive layout */}
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none items-center whitespace-nowrap">
                    <Button
                        variant={activeCategory === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        className={`rounded-full h-8 px-4 text-xs font-medium transition-all shrink-0 ${activeCategory === 'all' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                        onClick={() => onCategoryChange?.('all')}
                    >
                        Todos
                    </Button>
                    {categories.map((cat: any) => (
                        <Button
                            key={cat.id}
                            variant={activeCategory === cat.id ? 'default' : 'ghost'}
                            size="sm"
                            className={`rounded-full h-8 px-4 text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${activeCategory === cat.id ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200'}`}
                            onClick={() => onCategoryChange?.(cat.id)}
                        >
                            <div className={`w-2 h-2 rounded-full bg-${cat.color}-500`} />
                            {cat.name}
                        </Button>
                    ))}
                </div>
            )}

            <div className="flex-none flex items-center gap-2">
                <ViewToggle
                    view={viewMode}
                    onViewChange={setViewMode}
                />
            </div>
        </div>
    )
}
