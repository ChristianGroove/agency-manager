"use client"

import React, { useState } from "react"
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

    // Agrupar por categoría (opcional, si existe el campo category_id o metadata)
    // Por simplicidad, mostraremos todo en un solo grid, pero con diseño premium B2C

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

            {/* Parrilla de Platos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <FoodCard
                            key={item.id}
                            item={item}
                            orgId={orgId}
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
