"use client"

import React, { useState } from "react"
import { MenuCategoryManager } from "./category-manager"
import { MenuSheetTrigger } from "./menu-sheet-trigger"
import { Search, Plus } from "lucide-react"
import { RestoMenuItem, RestoMenuCategory, RestoMenuModifierGroup } from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModifiersWorkspace } from "./modifiers-workspace"

const formatAvailableDays = (days?: number[]) => {
    if (!days || days.length >= 7) return null;
    
    const isWeekend = days.length === 2 && days.includes(0) && days.includes(6);
    if (isWeekend) return 'Fines de Semana';
    
    const isWeekdays = days.length === 5 && !days.includes(0) && !days.includes(6);
    if (isWeekdays) return 'Lun - Vie';

    const dayMap: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
    // Sort logically starting from Monday(1) to Sunday(0)
    const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
    return sorted.map(d => dayMap[d]).join(', ');
}

export function MenuWorkspace({ 
    items, 
    categories, 
    modifierGroups,
    orgId 
}: { 
    items: RestoMenuItem[], 
    categories: RestoMenuCategory[], 
    modifierGroups: RestoMenuModifierGroup[],
    orgId: string 
}) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const filteredItems = items.filter(item => {
        if (activeCategory && item.category_id !== activeCategory) return false;
        if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <Tabs defaultValue="catalog" className="flex flex-col flex-1 h-full min-h-0">
            <div className="flex justify-start mb-6">
                <TabsList className="bg-white/10 dark:bg-zinc-800/50 backdrop-blur-md border border-gray-100 dark:border-zinc-800">
                    <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Catálogo de Platos
                    </TabsTrigger>
                    <TabsTrigger value="modifiers" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                        Modificadores Globales
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="catalog" className="flex-1 min-h-0 m-0 data-[state=active]:flex flex-col lg:flex-row gap-6">
                {/* Left Column: Categories */}
                <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col">
                    <MenuCategoryManager 
                        categories={categories} 
                        activeCategory={activeCategory}
                        onToggleCategory={(id) => setActiveCategory(prev => prev === id ? null : id)}
                    />
                </div>

                {/* Right Column: Items */}
                <div className="flex-1 flex flex-col glass-panel bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/20 rounded-2xl p-6 min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar platos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-10 pl-9 pr-4 rounded-xl bg-gray-50 dark:bg-zinc-800 border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm outline-none"
                        />
                    </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto p-4 -m-4 no-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-3xl">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <span className="text-3xl">🍳</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aún no tienes platos</h3>
                            <p className="text-gray-500 mt-1 max-w-sm text-center text-sm mb-6">Crea tu primer plato para que tus clientes puedan empezar a pedir desde tu portal.</p>
                            <MenuSheetTrigger orgId={orgId}>
                                <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all">
                                    <Plus className="w-4 h-4" /> Crear mi primer plato
                                </button>
                            </MenuSheetTrigger>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                            {filteredItems.map(item => (
                                <MenuSheetTrigger key={item.id} orgId={orgId} item={item}>
                                    <div className="glass-card flex flex-col justify-between group text-left h-full cursor-pointer p-4">
                                        <div className="flex gap-4">
                                            <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative">
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <span className="text-[10px] font-medium uppercase tracking-wider">Sin foto</span>
                                                    </div>
                                                )}
                                                {!item.is_available && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                                                        <span className="text-white text-[9px] font-black uppercase tracking-wider">Agotado</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1 py-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1 leading-tight text-sm">{item.name}</h4>
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                                                    {item.description || 'Sin descripción'}
                                                </p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {item.category?.name && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-zinc-800 text-gray-500">
                                                            {item.category.name}
                                                        </span>
                                                    )}
                                                    {item.metadata?.is_vegan && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                                            🌱 Vegano
                                                        </span>
                                                    )}
                                                    {item.metadata?.is_spicy && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                                            🌶️ Picante
                                                        </span>
                                                    )}
                                                    {item.metadata?.is_gluten_free && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                                            🌾 Sin Gluten
                                                        </span>
                                                    )}
                                                    {item.metadata?.available_days && item.metadata.available_days.length < 7 && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                                            📅 {formatAvailableDays(item.metadata.available_days)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 pt-3 border-t border-gray-50 dark:border-zinc-800 flex justify-between items-end">
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="font-extrabold text-gray-900 dark:text-white text-lg leading-none">
                                                    ${item.base_price.toLocaleString()}
                                                </span>
                                                {item.metadata?.promotional_price && (
                                                    <span className="text-xs text-gray-400 line-through">
                                                        ${item.metadata.promotional_price.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${item.is_visible ? 'bg-green-500' : 'bg-gray-300'} shadow-sm`}></span>
                                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                                                    {item.is_visible ? 'Visible' : 'Oculto'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </MenuSheetTrigger>
                            ))}
                        </div>
                    )}
                </div>
                </div>
            </TabsContent>

            <TabsContent value="modifiers" className="flex-1 min-h-0 m-0 data-[state=active]:flex">
                <ModifiersWorkspace modifierGroups={modifierGroups} />
            </TabsContent>
        </Tabs>
    )
}
