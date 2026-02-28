"use client"

import React, { useState, useEffect } from "react"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Store, ShoppingCart, ReceiptText, User as UserIcon } from "lucide-react"

// Importar Componentes de Vistas Internas
import { RestoMenuGrid } from "./views/RestoMenuGrid"
import { RestoCartView } from "./views/RestoCartView"
import { RestoOrderTracker } from "./views/RestoOrderTracker"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getPortalCatalog } from "@/modules/core/portal/actions"

export interface RestoPortalLayoutProps {
    token?: string
    client?: any
    invoices?: any[]
    settings?: any

    user?: any
    currentOrgId?: string
    isAdmin?: boolean
    orgData?: any
}

export function B2CRestaurantLayout({
    token,
    client,
    invoices,
    settings,
    currentOrgId,
    orgData
}: RestoPortalLayoutProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders' | 'profile'>('menu')
    const [catalogItems, setCatalogItems] = useState<any[]>([])
    const [loadingCatalog, setLoadingCatalog] = useState(false)
    const { items: cartItems } = useRestoCart()

    // Fetch Menu Catalog
    useEffect(() => {
        async function fetchMenu() {
            if (!token) return
            setLoadingCatalog(true)
            try {
                const catalog = await getPortalCatalog(token)
                setCatalogItems(catalog || [])
            } catch (error) {
                console.error("Error fetching menu catalog:", error)
            } finally {
                setLoadingCatalog(false)
            }
        }
        fetchMenu()
    }, [token])

    const navItems = [
        { id: 'menu', icon: Store, label: "Menú" },
        { id: 'cart', icon: ShoppingCart, label: "Carrito" },
        { id: 'orders', icon: ReceiptText, label: "Mis Pedidos" },
        { id: 'profile', icon: UserIcon, label: "Perfil" },
    ] as const

    // Calcular Cantidad en Carrito
    const totalCartQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black font-sans">
            <SystemAlertBanner />

            {/* TOP BAR: Branding Inyectado por el Tema Global */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" style={{ borderBottomColor: settings?.portal_primary_color ? `${settings.portal_primary_color}30` : '' }}>
                <div className="container flex h-16 items-center flex-row justify-between">
                    <div className="flex items-center gap-2">
                        {settings?.portal_logo_url ? (
                            <img src={settings.portal_logo_url} alt="Logo" className="h-8 w-auto object-contain" />
                        ) : (
                            <span className="font-bold text-lg" style={{ color: settings?.portal_primary_color || '#F205E2' }}>
                                {orgData?.name || settings?.agency_name || "Resto"}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* CONTENIDO PRINCIPAL (El Catálogo o Carrito) */}
            <main className="flex-1 w-full flex flex-col pb-20">
                <Suspense fallback={<GlobalLoader />}>
                    {activeTab === 'menu' && (
                        loadingCatalog ? <GlobalLoader /> : <RestoMenuGrid items={catalogItems} orgId={currentOrgId || ""} />
                    )}
                    {activeTab === 'cart' && (
                        <RestoCartView orgId={currentOrgId || ""} />
                    )}
                    {activeTab === 'orders' && (
                        <RestoOrderTracker orgId={currentOrgId || ""} />
                    )}
                    {activeTab === 'profile' && (
                        <div className="p-8 text-center text-gray-500">
                            <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Mi Perfil</h2>
                            <p>Tus datos están asociados al token de sesión actual.</p>
                            {client && (
                                <div className="mt-6 text-left bg-white dark:bg-zinc-900 p-4 rounded-xl border">
                                    <p><strong>Nombre:</strong> {client.name}</p>
                                    <p><strong>Teléfono:</strong> {client.phone || 'No registrado'}</p>
                                </div>
                            )}
                        </div>
                    )}
                </Suspense>
            </main>

            {/* BOTTOM NAV BAR (Mobile Only) */}
            <nav className="fixed bottom-0 z-50 w-full border-t bg-background pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? '' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                style={{ color: isActive ? (settings?.portal_primary_color || '#F205E2') : '' }}
                            >
                                <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'stroke-[2.5px] scale-110' : ''}`} />
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>

                                {/* Badge de Notificación para el Carrito */}
                                {item.id === 'cart' && totalCartQuantity > 0 && (
                                    <span
                                        className="absolute top-1 max-sm:right-2 right-6 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white rounded-full px-1"
                                        style={{ backgroundColor: '#EF4444' }} // Siempre rojo para urgencia o primary
                                    >
                                        {totalCartQuantity}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
