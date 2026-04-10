"use client"

import React, { useState, useMemo } from "react"
import { FoodCard } from "../components/FoodCard"
import { Search } from "lucide-react"
import { ServiceCatalogItem } from "@/types"

export interface RestoMenuGridProps {
    items: ServiceCatalogItem[]
    orgId: string
    primaryColor?: string
}

export function RestoMenuGrid({ items, orgId, primaryColor }: RestoMenuGridProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    // Get all unique categories for badges
    const categories = useMemo(() => {
        const cats = new Set<string>()
        items.forEach(item => {
            if (item.category) cats.add(item.category)
            else cats.add("Otros")
        })
        return Array.from(cats).sort()
    }, [items])

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

            const itemCategory = item.category || "Otros"
            const matchesCategory = !selectedCategory || itemCategory === selectedCategory

            return matchesSearch && matchesCategory
        })
    }, [items, searchQuery, selectedCategory])

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

            {/* Category Badges */}
            <div className="flex overflow-x-auto pb-1 gap-2 scrollbar-hide no-scrollbar">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === null
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white dark:bg-zinc-900 text-gray-500 border-gray-100 dark:border-zinc-800"
                        }`}
                >
                    Todos
                </button>
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === category
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white dark:bg-zinc-900 text-gray-500 border-gray-100 dark:border-zinc-800"
                            }`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <FoodCard
                            key={item.id}
                            item={item}
                            orgId={orgId}
                            primaryColor={primaryColor}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-500">
                        No encontramos platos que coincidan con tu búsqueda.
                    </div>
                )}
            </div>
        </div>
    )
}
