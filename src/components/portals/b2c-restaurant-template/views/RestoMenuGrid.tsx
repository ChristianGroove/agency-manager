"use client"

import React, { useState, useMemo } from "react"
import { FoodCard } from "../components/FoodCard"
import { Search } from "lucide-react"
import { ServiceCatalogItem } from "@/types"

export interface RestoMenuGridProps {
    items: ServiceCatalogItem[]
    orgId: string
}

export function RestoMenuGrid({ items, orgId }: RestoMenuGridProps) {
    const [searchQuery, setSearchQuery] = useState("")

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    // Group by category
    const groupedByCategory = useMemo(() => {
        const groups: Record<string, ServiceCatalogItem[]> = {}
        for (const item of filteredItems) {
            const cat = item.category || "Otros"
            if (!groups[cat]) groups[cat] = []
            groups[cat].push(item)
        }
        return groups
    }, [filteredItems])

    const categoryNames = Object.keys(groupedByCategory)

    return (
        <div className="flex flex-col w-full px-4 pt-4 space-y-6">
            {/* Buscador de Platos */}
            <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="¿Qué se te antoja hoy?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
                />
            </div>

            {/* Menu grouped by category */}
            {categoryNames.length > 0 ? (
                categoryNames.map(category => (
                    <div key={category} className="space-y-3">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{category}</h2>
                            <span className="text-xs text-gray-400 font-medium">{groupedByCategory[category].length}</span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-zinc-800" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {groupedByCategory[category].map(item => (
                                <FoodCard
                                    key={item.id}
                                    item={item}
                                    orgId={orgId}
                                />
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-12 text-center text-gray-500">
                    No encontramos platos que coincidan con tu búsqueda.
                </div>
            )}
        </div>
    )
}
