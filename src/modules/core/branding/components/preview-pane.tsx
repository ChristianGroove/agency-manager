"use client"

import { BrandingConfig } from "@/types/branding"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Layers, CreditCard, Search, Bell, Menu, Server } from "lucide-react"

interface PreviewPaneProps {
    settings: BrandingConfig
    mode?: 'dashboard' | 'login'
}

export function PreviewPane({ settings, mode = 'dashboard' }: PreviewPaneProps) {

    // Dynamic Styles based on props (Corrected for Nested Config)
    const brandPrimary = settings.colors?.primary || '#F205E2'
    const brandSecondary = settings.colors?.secondary || '#00E0FF'
    const brandBgColor = settings.login_bg_color || '#F3F4F6'

    // We use a CSS variable scope for the preview to isolate it
    const previewStyle = {
        '--preview-primary': brandPrimary,
        '--preview-secondary': brandSecondary,
        fontFamily: settings.font_family || 'Inter, sans-serif'
    } as React.CSSProperties

    if (mode === 'login') {
        return (
            <div
                className="w-full aspect-video rounded-lg border shadow-sm overflow-hidden relative flex items-center justify-center p-8 transition-all"
                style={{
                    ...previewStyle,
                    backgroundColor: brandBgColor,
                    backgroundImage: settings.logos?.login_bg ? `url(${settings.logos.login_bg})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="w-full max-w-[320px] bg-white rounded-xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-center">
                        {settings.logos.main ? (
                            <img src={settings.logos.main} alt="Logo" className="h-8 object-contain" />
                        ) : (
                            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-center font-bold text-gray-900 text-lg">
                            {settings.portal_title || 'Portal de Cliente'}
                        </h3>
                        <p className="text-center text-xs text-gray-500">
                            Ingresa con tu correo registrado
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="h-9 w-full bg-gray-50 rounded border border-gray-200" />
                        <button
                            className="w-full h-9 rounded text-white text-sm font-medium shadow-sm transition-colors"
                            style={{ backgroundColor: brandPrimary }}
                        >
                            Ingresar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Dashboard Mode
    return (
        <div
            className="w-full aspect-video rounded-lg border shadow-sm overflow-hidden flex bg-gray-50 text-xs"
            style={previewStyle}
        >
            {/* Sidebar Mock */}
            <div className="w-1/4 bg-white border-r flex flex-col p-4">
                <div className="mb-6">
                    {settings.logos.main ? (
                        <img src={settings.logos.main} alt="Logo" className="h-5 object-contain" />
                    ) : (
                        <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    )}
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 p-2 rounded text-white" style={{ backgroundColor: 'black' }}>
                        <LayoutDashboard className="h-3 w-3" />
                        <span className="opacity-90">Resumen</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded text-gray-500 hover:bg-gray-50">
                        <Layers className="h-3 w-3" />
                        <span>Servicios</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded text-gray-500 hover:bg-gray-50">
                        <CreditCard className="h-3 w-3" />
                        <span>Facturas</span>
                    </div>
                </div>

                <div className="mt-auto pt-4 border-t flex items-center gap-2 opacity-70">
                    <div className="h-6 w-6 rounded-full bg-gray-200 shrink-0" />
                    <div className="w-full space-y-1">
                        <div className="h-2 w-16 bg-gray-200 rounded" />
                        <div className="h-1.5 w-10 bg-gray-200 rounded" />
                    </div>
                </div>
            </div>

            {/* Main Content Mock */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-12 border-b bg-white flex items-center justify-end px-4">
                    <Bell className="h-4 w-4 text-gray-400" />
                </header>

                <div className="p-4 space-y-4 overflow-hidden">
                    {/* Welcome Banner */}
                    <div className="p-4 rounded-lg bg-white border shadow-sm flex justify-between items-center">
                        <div className="space-y-1">
                            <div className="h-3 w-32 bg-gray-200 rounded" />
                            <div className="h-2 w-20 bg-gray-100 rounded" />
                        </div>
                        <button
                            className="px-3 py-1.5 rounded text-white font-medium text-[10px]"
                            style={{ backgroundColor: brandPrimary }}
                        >
                            Nuevo Ticket
                        </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-3 rounded-lg border shadow-sm space-y-2">
                                <div className="h-2 w-8 bg-gray-100 rounded" />
                                <div className="h-4 w-12 bg-gray-200 rounded" />
                            </div>
                        ))}
                    </div>

                    {/* Sample Table */}
                    <div className="bg-white rounded-lg border shadow-sm p-3 space-y-2 opacity-60">
                        <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
                        <div className="h-2 w-full bg-gray-50 rounded" />
                        <div className="h-2 w-full bg-gray-50 rounded" />
                    </div>
                </div>
            </div>
        </div>
    )
}
