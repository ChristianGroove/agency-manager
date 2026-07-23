"use client"

import React from 'react'
import { Utensils, Search, Clock, ShoppingBag } from 'lucide-react'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface FloatingGlassDockProps {
    activeTab: 'menu' | 'cart'
    setActiveTab: (tab: 'menu' | 'cart') => void
    cartItemCount?: number
    onOpenSchedule?: () => void
    onFocusSearch?: () => void
    primaryColor?: string
    isCompact?: boolean // Para previsualizador de teléfono virtual
}

export function FloatingGlassDock({
    activeTab,
    setActiveTab,
    cartItemCount = 0,
    onOpenSchedule,
    onFocusSearch,
    primaryColor = '#08B7E9',
    isCompact = false
}: FloatingGlassDockProps) {
    const handleSearchClick = () => {
        setActiveTab('menu')
        if (onFocusSearch) {
            setTimeout(onFocusSearch, 50)
        } else {
            const searchInput = document.getElementById('portal-search-input')
            if (searchInput) {
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
                searchInput.focus()
            }
        }
    }

    return (
        <div 
            className={cn(
                "z-40 transition-all duration-300 pointer-events-auto",
                isCompact 
                    ? "absolute bottom-3 left-3 right-3" 
                    : "fixed bottom-4 left-4 right-4 max-w-md mx-auto"
            )}
        >
            <div className="bg-white/80 dark:bg-zinc-900/85 backdrop-blur-2xl border border-white/50 dark:border-zinc-700/60 shadow-[0_12px_36px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)] rounded-3xl p-1.5 flex items-center justify-around">
                
                {/* 1. Botón Menú / Catálogo */}
                <button
                    onClick={() => setActiveTab('menu')}
                    className={cn(
                        "relative flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-300 active:scale-95 flex-1",
                        activeTab === 'menu' 
                            ? "bg-white dark:bg-zinc-800 shadow-md text-gray-900 dark:text-white font-extrabold" 
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <Utensils 
                        className="w-4 h-4 mb-0.5" 
                        style={{ color: activeTab === 'menu' ? primaryColor : undefined }}
                    />
                    <span className="text-[10px] tracking-tight">Menú</span>

                    {/* Active Pill Indicator */}
                    {activeTab === 'menu' && (
                        <div 
                            className="absolute -top-1 w-5 h-1 rounded-full animate-pulse"
                            style={{ backgroundColor: primaryColor }}
                        />
                    )}
                </button>

                {/* 2. Botón Buscar */}
                <button
                    onClick={handleSearchClick}
                    className="flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 flex-1"
                >
                    <Search className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] tracking-tight">Buscar</span>
                </button>

                {/* 3. Botón Horarios */}
                <button
                    onClick={onOpenSchedule}
                    className="flex flex-col items-center justify-center py-2 px-3 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 flex-1"
                >
                    <Clock className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] tracking-tight">Horarios</span>
                </button>

                {/* 4. Botón Carrito */}
                <button
                    onClick={() => setActiveTab('cart')}
                    className={cn(
                        "relative flex flex-col items-center justify-center py-2 px-4 rounded-2xl transition-all duration-300 active:scale-95 flex-1",
                        activeTab === 'cart' 
                            ? "bg-white dark:bg-zinc-800 shadow-md text-gray-900 dark:text-white font-extrabold" 
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                >
                    <div className="relative">
                        <ShoppingBag 
                            className="w-4 h-4 mb-0.5" 
                            style={{ color: activeTab === 'cart' ? primaryColor : undefined }}
                        />
                        {cartItemCount > 0 && (
                            <span 
                                className="absolute -top-2 -right-3 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full shadow-md animate-bounce"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {cartItemCount}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] tracking-tight">Carrito</span>

                    {/* Active Pill Indicator */}
                    {activeTab === 'cart' && (
                        <div 
                            className="absolute -top-1 w-5 h-1 rounded-full animate-pulse"
                            style={{ backgroundColor: primaryColor }}
                        />
                    )}
                </button>

            </div>
        </div>
    )
}
