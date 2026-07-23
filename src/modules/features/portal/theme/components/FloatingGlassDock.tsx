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
}

export function FloatingGlassDock({
    items,
    activeTab,
    setActiveTab,
    cartItemCount = 0,
    primaryColor = '#08B7E9',
    isCompact = false
}: FloatingGlassDockProps) {
    return (
        <div 
            className={cn(
                "z-40 transition-all duration-300 pointer-events-auto",
                isCompact 
                    ? "absolute bottom-3 left-3 right-3" 
                    : "fixed bottom-4 left-4 right-4 max-w-md mx-auto"
            )}
        >
            <div className="bg-white/65 dark:bg-zinc-900/75 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-3xl p-1.5 flex items-center justify-around">
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

                            {/* Active Pill Indicator */}
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
