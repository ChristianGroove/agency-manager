"use client"

import React from 'react'
import { ExternalLink, Tag } from 'lucide-react'
import { PortalThemeConfig } from '../types'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface PortalPromoBannerProps {
    config?: PortalThemeConfig
    position: 'top' | 'bottom'
    isGourmet?: boolean
}

export function PortalPromoBanner({ config, position, isGourmet }: PortalPromoBannerProps) {
    const banner = config?.promo_banner

    if (!banner?.enabled || !banner?.image_url) return null
    if ((banner.position || 'top') !== position) return null

    const handleBannerClick = () => {
        if (banner.target_url) {
            window.open(banner.target_url, '_blank', 'noopener,noreferrer')
        }
    }

    const isClickable = Boolean(banner.target_url)
    const hasAltText = Boolean(banner.alt_text && banner.alt_text.trim() !== '')

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 my-4 sm:my-6">
            <div 
                onClick={handleBannerClick}
                className={cn(
                    "relative w-full h-auto rounded-2xl md:rounded-3xl overflow-hidden group transition-all duration-300 bg-transparent",
                    isClickable && "cursor-pointer hover:scale-[1.008]",
                    isGourmet 
                        ? "border border-amber-500/30" 
                        : ""
                )}
            >
                <img 
                    src={banner.image_url} 
                    alt={banner.alt_text || 'Banner Publicitario'} 
                    className="w-full h-auto block group-hover:scale-105 transition-transform duration-700"
                />

                {/* Subtle Overlay Gradient (Solo si hay texto o enlace) */}
                {(hasAltText || isClickable) && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                )}

                {/* Promo Badge & Target Indicator */}
                {(hasAltText || isClickable) && (
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-5 sm:right-5 flex items-center justify-between pointer-events-none z-10">
                        {hasAltText ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-md">
                                <Tag className="w-3.5 h-3.5 text-amber-400" />
                                <span>{banner.alt_text}</span>
                            </span>
                        ) : <div />}

                        {isClickable && (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-white backdrop-blur-md shadow-lg group-hover:translate-x-1 transition-transform ml-auto">
                                <span>Ver Oferta</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
