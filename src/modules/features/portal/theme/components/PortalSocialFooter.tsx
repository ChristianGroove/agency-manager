"use client"

import React, { useState } from 'react'
import { 
    Instagram, 
    Facebook, 
    MessageCircle, 
    Globe, 
    MapPin, 
    Clock, 
    Video,
    Calendar
} from 'lucide-react'
import { PortalThemeConfig } from '../types'
import { evaluateStoreStatus } from '../utils/schedule-evaluator'
import { ScheduleModal } from './ScheduleModal'
import { cn } from '@/modules/infrastructure/utils/utils'

export interface PortalSocialFooterProps {
    config?: PortalThemeConfig
    orgName?: string
    isGourmet?: boolean
}

export function PortalSocialFooter({ config, orgName, isGourmet }: PortalSocialFooterProps) {
    const [showModal, setShowModal] = useState(false)

    if (config?.header_footer?.show_footer === false) return null

    const social = config?.social_links || {}
    const storeStatus = evaluateStoreStatus(config)
    const hours = storeStatus.todayHoursFormatted || config?.header_footer?.business_hours_text
    const address = config?.header_footer?.address_text
    const activePrimaryColor = config?.primary_color || '#4F46E5'

    const tenantLogos = config?.tenant_logos
    const footerLogo = isGourmet || config?.color_mode === 'dark'
        ? (tenantLogos?.main_dark || tenantLogos?.main_light)
        : (tenantLogos?.main_light || tenantLogos?.main_dark)

    const hasSocial = Boolean(
        social.instagram || social.facebook || social.tiktok || 
        social.whatsapp || social.website || social.google_maps
    )

    return (
        <>
            <footer className={cn(
                "w-full mt-12 py-10 px-4 border-t transition-all",
                isGourmet 
                    ? "bg-zinc-950 border-amber-500 border-opacity-20 text-amber-50" 
                    : "bg-white dark:bg-zinc-900 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-xl border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-300"
            )}>
                <div className="max-w-6xl mx-auto flex flex-col items-center justify-between gap-8 text-center">
                    
                    {/* Brand Logo or Name */}
                    <div className="space-y-3 max-w-md flex flex-col items-center">
                        {footerLogo ? (
                            <div className="h-10 sm:h-12 max-w-[200px] flex items-center justify-center">
                                <img src={footerLogo} alt={orgName || 'Logo de Marca'} className="max-h-full max-w-full object-contain opacity-90" />
                            </div>
                        ) : (
                            <h3 className={cn("text-lg font-black", isGourmet ? "text-amber-400 font-serif" : "text-gray-900 dark:text-white")}>
                                {config?.tenant_name || orgName || 'Mi Negocio'}
                            </h3>
                        )}
                        
                        {hours && (
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                    <Clock className="w-3.5 h-3.5 opacity-70 shrink-0 text-primary" style={!isGourmet && activePrimaryColor ? { color: activePrimaryColor } : undefined} />
                                    <span>{hours}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowModal(true)}
                                    className="text-[11px] font-extrabold flex items-center gap-1.5 hover:underline transition-all cursor-pointer mt-0.5 active:scale-95"
                                    style={isGourmet ? { color: '#fbbf24' } : { color: activePrimaryColor }}
                                >
                                    <span>Ver horarios completos</span>
                                    <Calendar className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {address && (
                            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                                <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                <span>{address}</span>
                            </div>
                        )}
                    </div>

                    {/* Social Media Buttons Grid */}
                    {hasSocial && (
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {social.instagram && (
                                <a 
                                    href={social.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-md hover:scale-110 transition-transform"
                                    title="Instagram"
                                >
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}

                            {social.facebook && (
                                <a 
                                    href={social.facebook} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 text-white shadow-md hover:scale-110 transition-transform"
                                    title="Facebook"
                                >
                                    <Facebook className="w-5 h-5" />
                                </a>
                            )}

                            {social.tiktok && (
                                <a 
                                    href={social.tiktok} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-black text-white border border-zinc-700 shadow-md hover:scale-110 transition-transform"
                                    title="TikTok"
                                >
                                    <Video className="w-5 h-5" />
                                </a>
                            )}

                            {social.whatsapp && (
                                <a 
                                    href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500 text-white shadow-md hover:scale-110 transition-transform"
                                    title="WhatsApp Directo"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                </a>
                            )}

                            {social.website && (
                                <a 
                                    href={social.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 text-white shadow-md hover:scale-110 transition-transform"
                                    title="Sitio Web"
                                >
                                    <Globe className="w-5 h-5" />
                                </a>
                            )}

                            {social.google_maps && (
                                <a 
                                    href={social.google_maps} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-600 text-white shadow-md hover:scale-110 transition-transform"
                                    title="Ver en Google Maps"
                                >
                                    <MapPin className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Copyright / Powered By */}
                    <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 w-full text-[11px] text-gray-400 dark:text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <p>© {new Date().getFullYear()} {config?.tenant_name || orgName || 'Mi Negocio'}. Todos los derechos reservados.</p>
                        <p className="flex items-center gap-1">
                            <span>Experiencia impulsada por</span>
                            <span className="font-extrabold text-primary">Pixy</span>
                        </p>
                    </div>

                </div>
            </footer>

            {/* Schedule Modal */}
            <ScheduleModal 
                isOpen={showModal} 
                onClose={() => setShowModal(false)} 
                config={config} 
                isGourmet={isGourmet} 
            />
        </>
    )
}
