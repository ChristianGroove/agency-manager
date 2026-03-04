"use client"

import React, { useState } from "react"
import { PortalAccessWidget } from "./portal-access-widget"
import { GlobalDashboardBanner } from "./global-dashboard-banner"

interface RestoDashboardProps {
    dashboardData: any
    extraData: any
    onReload: () => void
}

export function RestoDashboard({ dashboardData, extraData, onReload }: RestoDashboardProps) {
    const { orgDetails } = extraData || {}
    const bannerConfig = dashboardData?.bannerConfig

    // Configurar URL del portal público
    const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/portal/${orgDetails?.slug}` : `https://pixy.do/portal/${orgDetails?.slug}`

    return (
        <div className="w-full flex justify-center pb-24">
            <div className="max-w-5xl w-full flex flex-col gap-8">

                {/* Saludo */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mt-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white animate-in slide-in-from-bottom-2 duration-500">
                            ¡Hola, {orgDetails?.name || 'Restaurante'}! 👋
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 animate-in slide-in-from-bottom-3 duration-700">
                            Desde aquí puedes acceder a las herramientas principales de tu negocio.
                        </p>
                    </div>
                </div>

                {/* Main Action Widget */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <PortalAccessWidget url={portalUrl} orgName={orgDetails?.name || "Catálogo"} />
                </div>

                {/* Futuros componentes de Analíticas de Restaurante irían aquí (Pedidos Hoy, Promedio Ticket, etc). */}
                <div className="flex items-center justify-center p-12 bg-gray-50/50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800 text-gray-400">
                    <span className="text-sm">Analíticas y gestión de comandas estarán disponibles en la próxima actualización.</span>
                </div>

                {/* Global Banner - Movido al fondo */}
                {bannerConfig?.is_active && (
                    <div className="mt-6">
                        <GlobalDashboardBanner config={bannerConfig} />
                    </div>
                )}
            </div>
        </div>
    )
}
