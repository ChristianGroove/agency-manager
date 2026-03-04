"use client"

import React, { useState, useEffect } from "react"
import { Suspense } from "react"
import { GlobalLoader } from "@/components/ui/global-loader"
import { SystemAlertBanner } from "@/components/layout/system-alert-banner"
import { Store, ShoppingCart, ReceiptText, User as UserIcon, Check, MapPin, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"

// Importar Componentes de Vistas Internas
import { RestoMenuGrid } from "./views/RestoMenuGrid"
import { RestoCartView } from "./views/RestoCartView"
import { RestoOrderTracker } from "./views/RestoOrderTracker"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getPortalCatalog } from "@/modules/core/portal/actions"
import { useSearchParams } from "next/navigation"
import { updateClientAddress } from "./actions/checkout-actions"

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
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const { items: cartItems, clearCart } = useRestoCart()
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

    // Escuchar evento de navegación interna (usado por "Repetir Pedido")
    useEffect(() => {
        const handler = (e: Event) => {
            const tab = (e as CustomEvent).detail as 'menu' | 'cart' | 'orders' | 'profile'
            if (tab) setActiveTab(tab)
        }
        window.addEventListener('resto-navigate', handler)
        return () => window.removeEventListener('resto-navigate', handler)
    }, [])

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
        ...(client ? [
            { id: 'orders', icon: ReceiptText, label: "Mis Pedidos" },
            { id: 'profile', icon: UserIcon, label: "Perfil" },
        ] : []),
    ] as const

    // Redirigir si el tab activo deja de existir (seguridad)
    useEffect(() => {
        if (!client && (activeTab === 'orders' || activeTab === 'profile')) {
            setActiveTab('menu')
        }
    }, [client, activeTab])

    // Calcular Cantidad en Carrito
    const totalCartQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0)

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-black font-sans">
            <SystemAlertBanner />

            {/* TOP BAR: Branding Inyectado por el Tema Global */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm" style={{ borderBottomColor: settings?.portal_primary_color ? `${settings.portal_primary_color}30` : '' }}>
                <div className="container flex h-16 items-center flex-row justify-center">
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
                        loadingCatalog ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[50vh]">
                                <div
                                    className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-4"
                                    style={{ borderColor: `${settings?.portal_primary_color || '#F205E2'}40`, borderTopColor: settings?.portal_primary_color || '#F205E2' }}
                                />
                                <p className="text-gray-500 font-medium animate-pulse">
                                    {settings?.portal_catalog_loading_text || 'Cargando catálogo...'}
                                </p>
                            </div>
                        ) : <RestoMenuGrid items={catalogItems} orgId={currentOrgId || ""} primaryColor={settings?.portal_primary_color} />
                    )}
                    {activeTab === 'cart' && (
                        <RestoCartView orgId={currentOrgId || ""} primaryColor={settings?.portal_primary_color} />
                    )}
                    {activeTab === 'orders' && (
                        <RestoOrderTracker orgId={currentOrgId || ""} client={client} />
                    )}
                    {activeTab === 'profile' && (
                        <div className="p-8 text-center text-gray-500">
                            <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Mi Perfil</h2>

                            {client ? (
                                <RestoClientProfile client={client} primaryColor={settings?.portal_primary_color} />
                            ) : (
                                // Modo Guest: Leer de Zustand Memory
                                (() => {
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
                                })()
                            )}
                        </div>
                    )}
                </Suspense>
            </main>

            {/* BOTTOM NAV BAR (Mobile Only) */}
            <nav className="fixed bottom-0 z-50 w-full border-t bg-background pb-safe shadow-[0_-4_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as 'menu' | 'cart' | 'orders' | 'profile')}
                                className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? '' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                style={{ color: isActive ? (settings?.portal_primary_color || '#F205E2') : '' }}
                            >
                                <item.icon className={`h-5 w-5 transition-transform ${isActive ? 'stroke-[2.5px] scale-110' : ''}`} />
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>

                                {/* Badge de Notificación para el Carrito */}
                                {item.id === 'cart' && totalCartQuantity > 0 && (
                                    <span
                                        className="absolute top-1 left-1/2 ml-2 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white rounded-full px-1"
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

            {/* Modal de Pedido Exitoso */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300 border border-white/20">
                        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <Check className="h-10 w-10 stroke-[3px]" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">¡Pedido Recibido!</h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                Tu pedido ha sido enviado a la cocina.
                                <span className="block font-semibold mt-1 text-gray-700 dark:text-gray-300">Te notificaremos por WhatsApp cualquier novedad.</span>
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full h-12 rounded-2xl text-white font-bold text-lg shadow-lg hover:opacity-90 active:scale-95 transition-all"
                            style={{ backgroundColor: settings?.portal_primary_color || '#F205E2' }}
                        >
                            ¡Genial!
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function RestoClientProfile({ client, primaryColor }: { client: any, primaryColor?: string }) {
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
        setSaving(true)
        const result = await updateClientAddress(client.id, address)
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
