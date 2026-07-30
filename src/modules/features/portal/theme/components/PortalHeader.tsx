"use client"

import React from 'react'
import { Sparkles } from 'lucide-react'
import { PortalThemeConfig } from '../types'
import { evaluateStoreStatus } from '../utils/schedule-evaluator'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface PortalHeaderProps {
    config?: PortalThemeConfig
    orgName?: string
    logoUrl?: string
    tableIdentifier?: string | null
    isGourmet?: boolean
    isCompact?: boolean
}

export function PortalHeader({ config, orgName, logoUrl, tableIdentifier, isGourmet, isCompact }: PortalHeaderProps) {
    if (config?.header_footer?.show_header === false && !isCompact) return null

    const tagline = config?.header_footer?.custom_tagline || 'Disfruta de nuestra mejor selección'
    const storeStatus = evaluateStoreStatus(config)

    // Resolver Logo de Marca del Tenant (Main Dark, Main Light, Portal Iso o Auto)
    const logoVariant = config?.logo_variant || 'auto'
    const tenantLogos = config?.tenant_logos

    let activeLogoUrl = logoUrl || ''

    if (logoVariant === 'main_dark') {
        activeLogoUrl = tenantLogos?.main_dark || tenantLogos?.main_light || logoUrl || ''
    } else if (logoVariant === 'main_light') {
        activeLogoUrl = tenantLogos?.main_light || tenantLogos?.main_dark || logoUrl || ''
    } else if (logoVariant === 'portal_iso') {
        activeLogoUrl = tenantLogos?.portal_iso || tenantLogos?.main_dark || tenantLogos?.main_light || logoUrl || ''
    } else {
        // 'auto': Segun el tema (Gourmet / Oscuro usa main_dark, Claro usa main_light)
        if (isGourmet || config?.color_mode === 'dark') {
            activeLogoUrl = tenantLogos?.main_dark || tenantLogos?.main_light || logoUrl || ''
        } else {
            activeLogoUrl = tenantLogos?.main_light || tenantLogos?.main_dark || logoUrl || ''
        }
    }

    const activePrimaryColor = config?.primary_color || '#4F46E5'

    const badgeStyles = storeStatus.isOpen
        ? (isGourmet ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800")
        : storeStatus.isForceClosed
        ? "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30"
        : "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"

    const dotColor = storeStatus.isOpen
        ? "bg-emerald-500"
        : storeStatus.isForceClosed
        ? "bg-amber-500"
        : "bg-rose-500"

    return (
        <header className={cn(
            "w-full shrink-0 relative overflow-hidden transition-all border-b",
            isGourmet 
                ? "bg-zinc-950 border-amber-500 border-opacity-20 text-amber-50" 
                : "bg-white dark:bg-zinc-900 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-xl border-gray-100 dark:border-zinc-800 text-gray-900 dark:text-white"
        )}>
            {/* Top-to-Bottom Fading Vertical Branding Gradient */}
            {!isGourmet && (
                <div 
                    className="absolute inset-x-0 top-0 h-full pointer-events-none opacity-25 dark:opacity-20 transition-opacity"
                    style={{
                        background: `linear-gradient(to bottom, ${activePrimaryColor}40 0%, ${activePrimaryColor}00 100%)`
                    }}
                />
            )}

            <div className={cn("w-full max-w-7xl mx-auto py-4 relative z-10", isCompact ? "px-3" : "px-4 sm:px-6 md:px-8 lg:px-12")}>
                
                {/* MOBILE LAYOUT (< md o when isCompact): Stacked Vertically */}
                <div className={cn("flex-col items-center text-center space-y-2 w-full", isCompact ? "flex" : "flex md:hidden")}>
                    {/* Line 1: Logo Centered */}
                    <div className="flex justify-center w-full">
                        {activeLogoUrl ? (
                            <div className="h-12 sm:h-14 flex items-center justify-center shrink-0 max-w-[240px]">
                                <img 
                                    src={activeLogoUrl} 
                                    alt={orgName || 'Logo de Marca'} 
                                    className="max-h-full max-w-full object-contain drop-shadow-sm" 
                                />
                            </div>
                        ) : (
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shrink-0",
                                isGourmet ? "bg-amber-500 text-zinc-950" : "bg-primary text-white"
                            )}>
                                {(orgName || 'R')[0].toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Line 2: Status Badge Alone Centered */}
                    <div className="flex justify-center w-full">
                        <span className={cn(
                            "inline-flex items-center px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-colors",
                            badgeStyles
                        )}>
                            <span className={cn("w-2 h-2 rounded-full mr-1.5 animate-pulse", dotColor)} />
                            {storeStatus.statusBadgeText}
                        </span>
                    </div>

                    {/* Line 3: Tagline Phrase */}
                    {tagline && (
                        <p className={cn(
                            "text-xs line-clamp-2 max-w-xs",
                            isGourmet ? "text-amber-200/80 font-serif italic" : "text-gray-500 dark:text-zinc-400 font-medium"
                        )}>
                            {tagline}
                        </p>
                    )}
                </div>

                {/* DESKTOP LAYOUT (md: and up unless isCompact): Logo Left, Badge & Tagline Right-Justified */}
                <div className={cn("items-center justify-between w-full gap-6", isCompact ? "hidden" : "hidden md:flex")}>
                    {/* Left Side: Brand Logo */}
                    <div className="flex items-center">
                        {activeLogoUrl ? (
                            <div className="h-14 md:h-16 flex items-center justify-center shrink-0 max-w-[300px]">
                                <img 
                                    src={activeLogoUrl} 
                                    alt={orgName || 'Logo de Marca'} 
                                    className="max-h-full max-w-full object-contain drop-shadow-sm" 
                                />
                            </div>
                        ) : (
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shrink-0",
                                isGourmet ? "bg-amber-500 text-zinc-950" : "bg-primary text-white"
                            )}>
                                {(orgName || 'R')[0].toUpperCase()}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Status Badge & Tagline Phrase (Justified Right) */}
                    <div className="flex flex-col items-end text-right space-y-1.5 shrink-0">
                        <div className="flex items-center justify-end gap-2">
                            {tableIdentifier && (
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border mr-1",
                                    isGourmet
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                        : "bg-primary/10 text-primary border-primary/20"
                                )}>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Mesa #{tableIdentifier}</span>
                                </div>
                            )}

                            <span className={cn(
                                "inline-flex items-center px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm shrink-0 transition-colors",
                                badgeStyles
                            )}>
                                <span className={cn("w-2 h-2 rounded-full mr-1.5 animate-pulse", dotColor)} />
                                {storeStatus.statusBadgeText}
                            </span>
                        </div>

                        {tagline && (
                            <p className={cn(
                                "text-xs line-clamp-1 max-w-lg text-right",
                                isGourmet ? "text-amber-200/80 font-serif italic" : "text-gray-500 dark:text-zinc-400 font-medium"
                            )}>
                                {tagline}
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </header>
    )
}
