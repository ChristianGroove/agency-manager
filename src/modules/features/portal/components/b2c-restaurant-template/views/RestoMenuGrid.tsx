"use client"

import React, { useState, useMemo } from "react"
import { FoodCard } from "../components/FoodCard"
import { FoodModal } from "../components/FoodModal"
import { Search, AlertCircle } from "lucide-react"
import { RestoMenuItem } from "@/types"
import { usePortalThemeContext } from "@/modules/features/portal/theme/portal-theme-provider"
import { evaluateStoreStatus } from "@/modules/features/portal/theme/utils/schedule-evaluator"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface RestoMenuGridProps {
    items: RestoMenuItem[]
    orgId: string
    primaryColor?: string
}

export function RestoMenuGrid({ items, orgId, primaryColor }: RestoMenuGridProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedItemForModal, setSelectedItemForModal] = useState<RestoMenuItem | null>(null)

    const { config } = usePortalThemeContext()
    const navStyle = config?.category_nav_style || 'glass_cards'
    const storeStatus = evaluateStoreStatus(config)

    // Get all unique categories for badges
    const categories = useMemo(() => {
        const catMap = new Map<string, { name: string, order_index: number }>()
        let hasOthers = false;

        items.forEach(item => {
            if (item.category && item.category.name) {
                const cat: any = item.category;
                catMap.set(cat.name, {
                    name: cat.name,
                    order_index: cat.order_index ?? 9999
                })
            } else {
                hasOthers = true;
            }
        })
        
        const sortedCats = Array.from(catMap.values())
            .sort((a, b) => a.order_index - b.order_index)
            .map(c => c.name)
            
        if (hasOthers) sortedCats.push("Otros")
        return sortedCats
    }, [items])

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))

            const itemCategory = item.category?.name || "Otros"
            const matchesCategory = !selectedCategory || itemCategory === selectedCategory

            return matchesSearch && matchesCategory
        })
    }, [items, searchQuery, selectedCategory])

    const allCategories = ["Todos", ...categories]

    return (
        <div className="flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-4 space-y-6">
            {/* Store Status Warning Banner (Closed or Emergency Paused) */}
            {!storeStatus.isOpen && (
                <div className={cn(
                    "w-full p-4 rounded-2xl border flex items-center gap-3.5 shadow-lg transition-all animate-in fade-in duration-300",
                    storeStatus.isForceClosed
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                )}>
                    <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        storeStatus.isForceClosed ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
                    )}>
                        <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                        <p className="font-black uppercase tracking-wider text-[11px] opacity-90">{storeStatus.statusBadgeText}</p>
                        <p className="font-medium leading-relaxed mt-0.5">{storeStatus.message}</p>
                    </div>
                </div>
            )}

            {/* Buscador de Platos */}
            <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="¿Qué se te antoja hoy?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-2xl bg-gray-100/80 dark:bg-zinc-800/80 border border-gray-200/50 dark:border-zinc-700/50 focus:bg-white dark:focus:bg-zinc-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none shadow-sm"
                />
            </div>

            {/* Dynamic Category Tabs / Badges */}
            {navStyle === 'glass_cards' ? (
                <div className="flex overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                    <div className="inline-flex items-center gap-1.5 p-1.5 rounded-3xl bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                        {allCategories.map(category => {
                            const isSelected = (category === "Todos" && selectedCategory === null) || selectedCategory === category
                            const effectiveColor = primaryColor || config?.primary_color || '#4F46E5'

                            return (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category === "Todos" ? null : category)}
                                    className={cn(
                                        "relative flex items-center justify-center py-2 px-4 rounded-2xl transition-all duration-300 active:scale-95 whitespace-nowrap text-xs font-extrabold shrink-0",
                                        isSelected 
                                            ? "bg-white/95 dark:bg-zinc-800/95 shadow-md text-gray-900 dark:text-white" 
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <span style={{ color: isSelected ? effectiveColor : undefined }}>
                                        {category}
                                    </span>
                                    {isSelected && (
                                        <div 
                                            className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full animate-pulse"
                                            style={{ backgroundColor: effectiveColor }}
                                        />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className={cn(
                    "flex overflow-x-auto pb-2 scrollbar-hide no-scrollbar gap-2",
                    navStyle === 'underline_tabs' ? "border-b border-gray-200 dark:border-zinc-800 pb-0 gap-4" : ""
                )}>
                    {allCategories.map(category => {
                        const isSelected = (category === "Todos" && selectedCategory === null) || selectedCategory === category

                        let btnClass = ""
                        if (navStyle === 'underline_tabs') {
                            btnClass = cn(
                                "py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 bg-transparent rounded-none",
                                isSelected ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )
                        } else {
                            btnClass = cn(
                                "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all",
                                isSelected ? "bg-primary text-white border-primary shadow-sm" : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 border-gray-200/80 dark:border-zinc-800"
                            )
                        }

                        return (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category === "Todos" ? null : category)}
                                className={btnClass}
                                style={isSelected ? { backgroundColor: navStyle !== 'underline_tabs' ? (primaryColor || config?.primary_color) : undefined } : undefined}
                            >
                                {category}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Grid de Productos */}
            {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                    <p className="text-sm font-medium">No se encontraron productos que coincidan.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                        <FoodCard
                            key={item.id}
                            item={item}
                            orgId={orgId}
                            primaryColor={primaryColor}
                            onSelect={() => setSelectedItemForModal(item)}
                        />
                    ))}
                </div>
            )}

            {/* Modal de Modificadores */}
            {selectedItemForModal && (
                <FoodModal
                    item={selectedItemForModal}
                    orgId={orgId}
                    onClose={() => setSelectedItemForModal(null)}
                />
            )}
        </div>
    )
}
