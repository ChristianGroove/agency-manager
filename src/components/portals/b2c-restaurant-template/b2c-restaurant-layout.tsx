"use client"

import React from "react"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Store, ShoppingCart, ReceiptText, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export interface RestoPortalLayoutProps {
    children: React.ReactNode
    user: any
    currentOrgId: string | null
    isAdmin: boolean
    orgData?: any
}

/**
 * Plantilla de Portal: Restaurantes B2C (Bottom Navigation PWA)
 * Elimina la complejidad visual (Sidebars, FABs del Inbox) para ofrecer 
 * una experiencia "App de Comida" nativa y fluida.
 */
export function B2CRestaurantLayout({
    children,
    user,
    currentOrgId,
    orgData
}: RestoPortalLayoutProps) {
    const pathname = usePathname()

    // Configuración sencilla de Pestañas Inferiores (Bottom Tabs)
    const navItems = [
        { href: `/portal/${currentOrgId}`, icon: Store, label: "Menú" },
        { href: `/portal/${currentOrgId}/cart`, icon: ShoppingCart, label: "Carrito" },
        { href: `/portal/${currentOrgId}/orders`, icon: ReceiptText, label: "Mis Pedidos" },
        { href: `/portal/${currentOrgId}/profile`, icon: UserIcon, label: "Perfil" },
    ]

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black font-sans">
            <SystemAlertBanner />

            {/* TOP BAR: Branding Inyectado por el Tema Global */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
                <div className="container flex h-16 items-center flex-row justify-between">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-primary">{orgData?.name || "Resto"}</span>
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL (El Catálogo o Carrito) */}
            <main className="flex-1 w-full flex flex-col pb-20 sm:pb-0">
                <Suspense fallback={<GlobalLoader />}>
                    {children}
                </Suspense>
            </main>

            {/* BOTTOM NAV BAR (Mobile Only) */}
            <nav className="fixed bottom-0 z-50 w-full border-t bg-background sm:hidden pb-safe">
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <item.icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
