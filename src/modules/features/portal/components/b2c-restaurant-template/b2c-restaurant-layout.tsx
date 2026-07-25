"use client"

import React, { useState, useEffect } from "react"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Store, ShoppingCart, ReceiptText, User as UserIcon, Check, MapPin, Pencil, X, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"

// Importar Componentes de Vistas Internas
import { RestoMenuGrid } from "./views/RestoMenuGrid"
import { RestoCartView } from "./views/RestoCartView"
import { RestoOrderTracker } from "./views/RestoOrderTracker"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getPortalCatalog } from "@/modules/features/portal/services/portal-service"
import { useSearchParams } from "next/navigation"
import { RestoDineInTab } from "./views/RestoDineInTab"
import { updateClientAddress } from "./actions/checkout-actions"
import { validateTableQR } from "./actions/resto-dinein-actions"
import { toast } from "sonner"
import { supabase } from "@/modules/core/database/supabase"
import { PortalThemeProvider } from "@/modules/features/portal/theme/portal-theme-provider"
import { PortalHeader } from "@/modules/features/portal/theme/components/PortalHeader"
import { PortalPromoBanner } from "@/modules/features/portal/theme/components/PortalPromoBanner"
import { PortalSocialFooter } from "@/modules/features/portal/theme/components/PortalSocialFooter"
import { CyberGlassBackground } from "@/modules/features/portal/theme/components/CyberGlassBackground"
import { FloatingGlassDock } from "@/modules/features/portal/theme/components/FloatingGlassDock"

import { cn } from "@/modules/infrastructure/utils/utils"

export interface RestoPortalLayoutProps {
    token?: string
    client?: any
    invoices?: any[]
    settings?: any
    catalog?: any[] // NEW: Support external injection

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
    catalog, // Added to destructuring
    currentOrgId,
    orgData
}: RestoPortalLayoutProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'orders' | 'profile'>('menu')
    const [catalogItems, setCatalogItems] = useState<any[]>(catalog || [])
    const [loadingCatalog, setLoadingCatalog] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const { items: cartItems, clearCart, setTableContext, clearTableContext, orderMode, tableIdentifier, sessionId } = useRestoCart()
    const searchParams = useSearchParams()

    // Detectar éxito de pedido tras redirección
    useEffect(() => {
        if (searchParams.get('orderSuccess') === 'true') {
            setActiveTab('orders')
            clearCart() // Limpiar el carrito solo al aterrizar con éxito en el portal persistente
            setShowSuccessModal(true)

            // Limpiar el parámetro de la URL sin recargar para estetica
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [searchParams, clearCart])

    // Interceptar modo Dine-in
    useEffect(() => {
        const tableToken = searchParams.get('table')
        if (tableToken && currentOrgId) {
            validateTableQR(currentOrgId, tableToken).then(res => {
                if (res.success && res.tableId && res.sessionId) {
                    setTableContext(res.tableId, res.tableIdentifier || "Mesa", res.sessionId)
                    toast.success(`Conectado a ${res.tableIdentifier}`)
                    // Limpiar URL
                    const url = new URL(window.location.href)
                    url.searchParams.delete('table')
                    window.history.replaceState({}, '', url.toString())
                } else {
                    toast.error(res.error || "Código de mesa inválido")
                }
            }).catch(console.error)
        }
    }, [searchParams, currentOrgId, setTableContext])

    // Escuchar evento de navegación interna (usado por "Repetir Pedido")
    useEffect(() => {
        const handler = (e: Event) => {
            const tab = (e as CustomEvent).detail as 'menu' | 'cart' | 'orders' | 'profile'
            if (tab) setActiveTab(tab)
        }
        window.addEventListener('resto-navigate', handler)
        return () => window.removeEventListener('resto-navigate', handler)
    }, [])


    // Escuchar cierres de sesión en tiempo real (si la mesa es liberada por el admin)
    useEffect(() => {
        if (orderMode !== 'dine-in' || !sessionId) return

        const channel = supabase.channel(`global_session_${sessionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'resto_table_sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                if (payload.new && payload.new.status === 'closed') {
                    clearTableContext()
                    toast.info("La mesa ha sido liberada. ¡Gracias por tu visita!")
                    setActiveTab('menu')
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clearTableContext, sessionId, orderMode])

    // Fetch Menu Catalog (Only if not provided by parent)
    useEffect(() => {
        async function fetchMenu() {
            if (!token || (catalog && catalog.length > 0)) return
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
        ...(orderMode === 'dine-in' ? [
            { id: 'orders', icon: ReceiptText, label: "Mi Cuenta" }
        ] : client ? [
            { id: 'orders', icon: ReceiptText, label: "Mis Pedidos" },
            { id: 'profile', icon: UserIcon, label: "Perfil" },
        ] : []),
    ] as const

    // Redirigir si el tab activo deja de existir (seguridad)
    useEffect(() => {
        if (!client && orderMode !== 'dine-in' && (activeTab === 'orders' || activeTab === 'profile')) {
            setActiveTab('menu')
        }
    }, [client, activeTab, orderMode])

    // UX: Scroll automático al inicio al cambiar entre pestañas del menú inferior
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [activeTab])

    // UX: Estado y detector de scroll para el botón discreto "Volver arriba"
    const [showScrollTop, setShowScrollTop] = useState(false)
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 280) {
                setShowScrollTop(true)
            } else {
                setShowScrollTop(false)
            }
        }
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Calcular Cantidad en Carrito
    const totalCartQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0)

    const themeConfig = settings?.portal_theme_config || settings?.portal_modules?.theme_config
    const isGourmet = themeConfig?.theme_id === 'gourmet_elegance'
    const isDarkOrGourmet = isGourmet || themeConfig?.color_mode === 'dark'
    const effectivePrimaryColor = themeConfig?.primary_color || settings?.portal_primary_color || '#4F46E5'
    const isCyberGlass = themeConfig?.theme_id === 'cyber_glass_3d'
    const isFloatingDock = isCyberGlass || themeConfig?.category_nav_style === 'floating_dock'

    // Enforce theme mode (light vs dark) on document root ONLY for public portal routes (/portal/*, /p/*)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const path = window.location.pathname
        const isPublicPortal = path.startsWith('/portal') || path.startsWith('/p/')
        if (!isPublicPortal) return // DO NOT touch document classes when rendering inside dashboard!

        const root = document.documentElement
        const colorMode = themeConfig?.color_mode || 'light'
        const isGourmetTheme = themeConfig?.theme_id === 'gourmet_elegance'

        if (isGourmetTheme || colorMode === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
    }, [themeConfig?.color_mode, themeConfig?.theme_id])

    return (
        <PortalThemeProvider config={themeConfig}>
            {isCyberGlass && (
                <CyberGlassBackground 
                    primaryColor={effectivePrimaryColor} 
                    secondaryColor={themeConfig?.secondary_color} 
                    isDark={isDarkOrGourmet} 
                    isFixed={true}
                />
            )}
            <div className={cn("flex flex-col min-h-screen font-sans transition-colors duration-300 relative z-10", isCyberGlass ? "bg-transparent text-gray-900 dark:text-white" : isDarkOrGourmet ? "dark bg-zinc-950 text-amber-50" : "bg-gray-50 text-gray-900")}>
                <SystemAlertBanner />

                {/* LANDING PAGE HEADER */}
                <PortalHeader 
                    config={themeConfig} 
                    orgName={themeConfig?.tenant_name || settings?.agency_name || orgData?.name} 
                    logoUrl={settings?.portal_logo_url}
                    tableIdentifier={tableIdentifier}
                    isGourmet={isGourmet}
                />

                {/* DINE-IN BANNER */}
                {orderMode === 'dine-in' && tableIdentifier && (
                    <div 
                        className="w-full py-3 px-4 text-center font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 border-b sticky top-0 z-30 transition-colors shadow-sm"
                        style={{
                            backgroundColor: `${effectivePrimaryColor}18`,
                            borderColor: `${effectivePrimaryColor}35`,
                            color: isDarkOrGourmet ? '#ffffff' : '#0f172a'
                        }}
                    >
                        <MapPin className="w-5 h-5 shrink-0" style={{ color: effectivePrimaryColor }} />
                        <span className="flex-1 text-center font-black tracking-tight">Estás ordenando en Mesa #{tableIdentifier}</span>
                        <button 
                            onClick={() => {
                                if (sessionId) {
                                    toast.info("Mesa activa: Para desconectarte solicita la cuenta o la liberación al mesero.")
                                } else {
                                    clearTableContext()
                                }
                            }} 
                            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white" 
                            title="Desconectar de la mesa"
                        >
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>
                )}

                {/* PROMO BANNER (TOP - Only visible on Menu tab) */}
                {activeTab === 'menu' && (
                    <PortalPromoBanner config={themeConfig} position="top" isGourmet={isGourmet} />
                )}

                {/* CONTENIDO PRINCIPAL (El Catálogo o Carrito) */}
                <main className="flex-1 w-full flex flex-col pb-24">
                    <Suspense fallback={<GlobalLoader />}>
                        {activeTab === 'menu' && (
                            loadingCatalog ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[50vh]">
                                    <div
                                        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"
                                    />
                                    <p className="text-gray-500 font-medium animate-pulse">
                                        {settings?.portal_catalog_loading_text || 'Cargando catálogo...'}
                                    </p>
                                </div>
                            ) : <RestoMenuGrid items={catalogItems} orgId={currentOrgId || ""} primaryColor={effectivePrimaryColor} />
                        )}
                        {activeTab === 'cart' && (
                            <RestoCartView orgId={currentOrgId || ""} primaryColor={effectivePrimaryColor} />
                        )}
                        {activeTab === 'orders' && (
                            orderMode === 'dine-in' ? (
                                <RestoDineInTab orgId={currentOrgId || ""} primaryColor={effectivePrimaryColor} />
                            ) : (
                                <RestoOrderTracker orgId={currentOrgId || ""} client={client} />
                            )
                        )}
                        {activeTab === 'profile' && (
                            <div className="p-8 text-center text-gray-500">
                                <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Mi Perfil</h2>

                                {client ? (
                                    <RestoClientProfile client={client} token={token} primaryColor={effectivePrimaryColor} />
                                ) : (
                                    <RestoGuestProfile />
                                )}
                            </div>
                        )}
                    </Suspense>

                    {/* PROMO BANNER (BOTTOM - Only visible on Menu tab) */}
                    {activeTab === 'menu' && (
                        <PortalPromoBanner config={themeConfig} position="bottom" isGourmet={isGourmet} />
                    )}

                    {/* SOCIAL FOOTER (Only visible on Menu tab) */}
                    {activeTab === 'menu' && (
                        <PortalSocialFooter config={themeConfig} orgName={themeConfig?.tenant_name || settings?.agency_name || orgData?.name} isGourmet={isGourmet} />
                    )}
                </main>

            {/* Subtle Glass Back To Top Arrow Button (30% Fill Opacity + Backdrop Blur) */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 p-2 rounded-full bg-white/30 dark:bg-zinc-900/30 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-900/50 transition-all duration-300 active:scale-90 flex items-center justify-center shrink-0"
                    title="Volver arriba"
                    aria-label="Volver arriba"
                >
                    <ChevronUp className="w-4 h-4 stroke-[2.5px]" style={{ color: effectivePrimaryColor }} />
                </button>
            )}

            {/* BOTTOM DOCK NAV BAR */}
            <FloatingGlassDock 
                items={navItems}
                activeTab={activeTab} 
                setActiveTab={(tab) => setActiveTab(tab as 'menu' | 'cart' | 'orders' | 'profile')} 
                cartItemCount={totalCartQuantity} 
                primaryColor={effectivePrimaryColor}
                dockStyle={themeConfig?.dock_style || 'floating_glass'}
            />

            {/* Modal de Pedido Exitoso */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300 border border-white border-opacity-20">
                        <div className="h-20 w-20 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Check className="h-10 w-10 stroke-[3px]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">¡Pedido Recibido!</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                Tu pedido ha sido enviado a la cocina.
                                {orderMode !== 'dine-in' && (
                                    <span className="block font-semibold mt-1 text-gray-700 dark:text-gray-300">Te notificaremos por WhatsApp cualquier novedad.</span>
                                )}
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full h-12 rounded-2xl text-white font-bold text-lg shadow-lg hover:opacity-90 active:scale-95 transition-all"
                            style={{ backgroundColor: effectivePrimaryColor }}
                        >
                            ¡Genial!
                        </Button>
                    </div>
                </div>
            )}
            </div>
        </PortalThemeProvider>
    )
}

function RestoClientProfile({ client, token, primaryColor }: { client: any, token?: string, primaryColor?: string }) {
    const [address, setAddress] = useState(client.address || '')
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const { setCustomerProfile } = useRestoCart()

    // Pre-cargar dirección en zustand para el carrito
    useEffect(() => {
        if (client.address) {
            setCustomerProfile({ address: client.address })
        }
    }, [client.address, setCustomerProfile])

    const handleSave = async () => {
        if (!token) return
        setSaving(true)
        const result = await updateClientAddress(token, client.id, address)
        if (result.success) {
            setCustomerProfile({ address })
            setIsEditing(false)
        }
        setSaving(false)
    }

    return (
        <>
            <p className="text-sm text-gray-500">Tus datos están asociados al token de sesión actual.</p>
            <div className="mt-6 text-left bg-white dark:bg-zinc-900 p-4 rounded-xl border space-y-3">
                <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Nombre</span>
                    <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                </div>
                <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Teléfono</span>
                    <p className="font-medium text-gray-900 dark:text-white">{client.phone || 'No registrado'}</p>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Dirección
                        </span>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                            >
                                <Pencil className="w-3 h-3" /> Editar
                            </button>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-primary/30 outline-none"
                                placeholder="Ej: Cra 4g #40-54 apto 101"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="h-8 text-xs rounded-lg text-white font-bold"
                                    style={{ backgroundColor: primaryColor || '#F205E2' }}
                                >
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => { setAddress(client.address || ''); setIsEditing(false) }}
                                    className="h-8 text-xs"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="font-medium text-gray-900 dark:text-white">
                            {client.address || <span className="text-gray-400 italic">Sin dirección registrada</span>}
                        </p>
                    )}
                </div>
            </div>
        </>
    )
}

function RestoGuestProfile() {
    const { customerProfile } = useRestoCart()
    if (customerProfile?.name || customerProfile?.phone) {
        return (
            <>
                <p>Estos son los datos que ingresaste localmente. Serán recordados para tu próximo carrito.</p>
                <div className="mt-6 text-left bg-white dark:bg-zinc-900 p-4 rounded-xl border">
                    <p><strong>Nombre:</strong> {customerProfile.name || 'Sin especificar'}</p>
                    <p><strong>Teléfono:</strong> {customerProfile.phone || 'Sin especificar'}</p>
                    {customerProfile.address && <p><strong>Dirección:</strong> {customerProfile.address}</p>}
                </div>
            </>
        )
    }
    return (
        <div className="mt-6 space-y-2">
            <p>Aún no tenemos tus datos de contacto.</p>
            <p className="text-sm">Cuando realices tu primer pedido en el carrito, recordaremos tu nombre y dirección en este dispositivo.</p>
        </div>
    )
}

