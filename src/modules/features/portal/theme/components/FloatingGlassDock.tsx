"use client"

import React from 'react'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface DockNavItem {
    id: string
    icon: any
    label: string
}

export interface FloatingGlassDockProps {
    items: readonly DockNavItem[] | DockNavItem[]
    activeTab: string
    setActiveTab: (tab: any) => void
    cartItemCount?: number
    primaryColor?: string
    isCompact?: boolean
    dockStyle?: 'floating_glass' | 'capsule_pill' | 'full_width_dock'
}

export function FloatingGlassDock({
    items,
    activeTab,
    setActiveTab,
    cartItemCount = 0,
    primaryColor = '#08B7E9',
    isCompact = false,
    dockStyle = 'floating_glass'
}: FloatingGlassDockProps) {

    // Style 1: Floating Glass Island (Isla Glass Satinada Flotante)
    if (dockStyle === 'floating_glass') {
        return (
            <div 
                className={cn(
                    "z-40 transition-all duration-300 pointer-events-auto",
                    isCompact 
                        ? "absolute bottom-3 left-3 right-3" 
                        : "fixed bottom-4 left-4 right-4 max-w-md mx-auto"
                )}
            >
                <div className="bg-white/70 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-3xl p-1.5 flex items-center justify-around">
                    {items.map((item) => {
                        const isActive = activeTab === item.id
                        const IconComponent = item.icon
                        const isCart = item.id === 'cart'

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 active:scale-95 flex-1 min-w-0",
                                    isActive 
                                        ? "bg-white/90 dark:bg-zinc-800/90 shadow-md text-gray-900 dark:text-white font-extrabold" 
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                )}
                            >
                                <div className="relative">
                                    <IconComponent 
                                        className="w-4 h-4 mb-0.5 shrink-0" 
                                        style={{ color: isActive ? primaryColor : undefined }}
                                    />
                                    {isCart && cartItemCount > 0 && (
                                        <span 
                                            className="absolute -top-2 -right-3 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full shadow-md animate-bounce"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {cartItemCount}
                                        </span>
                                    )}
                                </div>

                                <span className="text-[10px] tracking-tight truncate max-w-full">{item.label}</span>

                                {isActive && (
                                    <div 
                                        className="absolute -top-1 w-5 h-1 rounded-full animate-pulse"
                                        style={{ backgroundColor: primaryColor }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Style 2: Capsule Pill (Cápsula Neón Compacta)
    if (dockStyle === 'capsule_pill') {
        return (
            <div 
                className={cn(
                    "z-40 transition-all duration-300 pointer-events-auto",
                    isCompact 
                        ? "absolute bottom-3 left-4 right-4" 
                        : "fixed bottom-5 left-6 right-6 max-w-sm mx-auto"
                )}
            >
                <div className="bg-zinc-950/90 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/20 dark:border-zinc-700/60 shadow-[0_16px_48px_rgba(0,0,0,0.4)] rounded-full p-1.5 flex items-center justify-around">
                    {items.map((item) => {
                        const isActive = activeTab === item.id
                        const IconComponent = item.icon
                        const isCart = item.id === 'cart'

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "relative flex items-center justify-center gap-1.5 py-2 px-3 rounded-full transition-all duration-300 active:scale-95 flex-1 min-w-0",
                                    isActive 
                                        ? "text-white font-extrabold shadow-lg" 
                                        : "text-zinc-400 hover:text-white"
                                )}
                                style={{
                                    backgroundColor: isActive ? primaryColor : 'transparent'
                                }}
                            >
                                <div className="relative">
                                    <IconComponent className="w-4 h-4 shrink-0" />
                                    {isCart && cartItemCount > 0 && (
                                        <span 
                                            className="absolute -top-2 -right-3 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full shadow-md bg-red-500 animate-bounce"
                                        >
                                            {cartItemCount}
                                        </span>
                                    )}
                                </div>

                                <span className="text-[11px] tracking-tight truncate">{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        )
    }

    // Style 3: Full Width Dock (Barra Flotante Borde a Borde)
    return (
        <div 
            className={cn(
                "z-40 transition-all duration-300 pointer-events-auto w-full",
                isCompact 
                    ? "absolute bottom-0 left-0 right-0" 
                    : "fixed bottom-0 left-0 right-0"
            )}
        >
            <div className="bg-white/85 dark:bg-zinc-900/90 backdrop-blur-2xl border-t border-gray-200/80 dark:border-zinc-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-3 pb-safe pt-2 flex items-center justify-around">
                {items.map((item) => {
                    const isActive = activeTab === item.id
                    const IconComponent = item.icon
                    const isCart = item.id === 'cart'

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-300 active:scale-95 flex-1 min-w-0",
                                isActive 
                                    ? "text-gray-900 dark:text-white font-extrabold" 
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div 
                                    className="absolute -top-2 w-8 h-1 rounded-full shadow-sm"
                                    style={{ backgroundColor: primaryColor }}
                                />
                            )}

                            <div className="relative">
                                <IconComponent 
                                    className={cn("w-5 h-5 mb-0.5 shrink-0 transition-transform", isActive && "scale-110")} 
                                    style={{ color: isActive ? primaryColor : undefined }}
                                />
                                {isCart && cartItemCount > 0 && (
                                    <span 
                                        className="absolute -top-1.5 -right-3 text-[9px] font-black text-white px-1.5 py-0.5 rounded-full shadow-md animate-bounce"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {cartItemCount}
                                    </span>
                                )}
                            </div>

                            <span className="text-[10px] tracking-tight truncate max-w-full">{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
