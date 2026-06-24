"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { ReceiptText, CheckCircle2, ChefHat, Bike, CalendarDays, CircleCheckBig, RotateCcw, ChevronRight, ShoppingBag, X } from "lucide-react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getRestoGuestOrders } from "../actions/resto-guest-tracking"
import { getRestoClientOrders, RestoOrderHistoryItem } from "../actions/resto-orders-actions"
import { supabase } from "@/modules/core/database/supabase"

/** Resolve the effective order status from both fields */
function resolveStatus(order: RestoOrderHistoryItem): string {
    return order.kitchen_status || 'pending'
}

/** Map status to step index (0-3) */
function statusToStep(status: string): number {
    switch (status) {
        case 'preparing': return 1
        case 'ready': return 2
        case 'completed': return 3
        default: return 0 // pending = Recibido
    }
}

const STEPS = [
    { key: 'delivered', label: 'Recibido', icon: CheckCircle2 },
    { key: 'read', label: 'En Cocina', icon: ChefHat },
    { key: 'shipped', label: 'En Camino', icon: Bike },
    { key: 'completed', label: 'Completado', icon: CircleCheckBig },
] as const

const DINE_IN_STEPS = [
    { key: 'delivered', label: 'Recibido', icon: CheckCircle2 },
    { key: 'read', label: 'En Cocina', icon: ChefHat },
    { key: 'shipped', label: 'Listo', icon: CheckCircle2 },
    { key: 'completed', label: 'Completado', icon: CircleCheckBig },
] as const

const STATUS_NOTIFICATIONS: Record<string, { emoji: string; title: string; message: string }> = {
    preparing: { emoji: '🍳', title: '¡Tu pedido fue aceptado!', message: 'Está siendo preparado en cocina.' },
    ready: { emoji: '🚀', title: '¡Tu pedido fue enviado / Está listo!', message: 'Va en camino o está listo en barra.' },
}

export function RestoOrderTracker({ orgId, client }: { orgId: string, client?: any }) {
    const { recentOrders, addItem, tableIdentifier } = useRestoCart()
    const [orders, setOrders] = useState<RestoOrderHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [notification, setNotification] = useState<{ emoji: string; title: string; message: string } | null>(null)
    const [expandedCompletedId, setExpandedCompletedId] = useState<string | null>(null)
    const prevStatusRef = useRef<Record<string, string>>({})

    const fetchOrders = useCallback(async (isPolling = false) => {
        try {
            let fetchedOrders: RestoOrderHistoryItem[] = []

            if (client?.id) {
                fetchedOrders = await getRestoClientOrders(orgId, client.id)
            } else if (recentOrders && recentOrders.length > 0) {
                fetchedOrders = await getRestoGuestOrders(recentOrders, orgId)
            }

            // Detectar cambios de estado para notificaciones
            if (isPolling && fetchedOrders.length > 0) {
                for (const order of fetchedOrders) {
                    const newStatus = resolveStatus(order)
                    const prevStatus = prevStatusRef.current[order.id]

                    if (prevStatus && prevStatus !== newStatus && STATUS_NOTIFICATIONS[newStatus]) {
                        setNotification(STATUS_NOTIFICATIONS[newStatus])
                        // Auto-dismiss después de 4 segundos
                        setTimeout(() => setNotification(null), 4000)
                    }
                }
            }

            // Guardar estados actuales para la próxima comparación
            const statusMap: Record<string, string> = {}
            fetchedOrders.forEach(o => { statusMap[o.id] = resolveStatus(o) })
            prevStatusRef.current = statusMap

            setOrders(fetchedOrders)
        } catch (error) {
            console.error("Error fetching orders:", error)
        } finally {
            if (!isPolling) setLoading(false)
        }
    }, [recentOrders, orgId, client?.id])

    // Fetch inicial
    useEffect(() => { 
        fetchOrders(false) 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Realtime Sync (No más fast-refresh costoso por polling)
    useEffect(() => {
        const filter = client?.id ? `lead_id=eq.${client.id}` : `organization_id=eq.${orgId}`
        
        const channel = supabase
            .channel(`tracker_resto_orders_${client?.id || 'guest'}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resto_orders',
                    filter: filter,
                },
                (payload) => {
                    // Si es guest, solo refrescar si el id actualizado/insertado está en sus recentOrders
                    if (!client?.id) {
                        const affectedId = (payload.new as any)?.id || (payload.old as any)?.id
                        if (!recentOrders?.includes(affectedId)) return
                    }
                    console.log('Realtime Order Update (Tracker):', payload)
                    fetchOrders(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, client?.id])

    if (loading) return <div className="p-8 text-center text-gray-500">Buscando tus pedidos...</div>

    if (orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full mt-20">
                <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                    <ReceiptText className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">Aún no tienes pedidos</h2>
                <p className="text-gray-500 text-sm">Tus pedidos activos o pasados aparecerán aquí.</p>
            </div>
        )
    }

    // Separar pedidos activos vs completados
    const activeOrders = orders.filter(o => resolveStatus(o) !== 'completed')
    const completedOrders = orders.filter(o => resolveStatus(o) === 'completed').slice(0, 5)

    const handleRepeatOrder = (order: RestoOrderHistoryItem) => {
        const items = order.items_snapshot || []
        for (const item of items) {
            addItem({
                menuItemId: item.menuItemId || item.title, // Fallback si no hay ID
                title: item.title,
                price: item.price,
                quantity: item.quantity,
            })
        }
        // Navegar al tab carrito forzando el state del layout
        window.dispatchEvent(new CustomEvent('resto-navigate', { detail: 'cart' }))
    }

    return (
        <div className="flex flex-col w-full h-full p-4 pb-24 space-y-6">
            <h1 className="text-2xl font-bold text-center">Mis Pedidos</h1>

            {/* ══════ Notificación Popup ══════ */}
            {notification && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 p-5 max-w-xs w-full text-center space-y-2">
                        <div className="text-4xl">{notification.emoji}</div>
                        <h3 className="font-bold text-lg">{notification.title}</h3>
                        <p className="text-sm text-gray-500">{notification.message}</p>
                        <button
                            onClick={() => setNotification(null)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ══════ Pedidos Activos ══════ */}
            <div className="space-y-4">
                {activeOrders.map((order) => {
                    const status = resolveStatus(order)
                    const currentStep = statusToStep(status)
                    const orderDate = new Date(order.created_at)
                    const isDineIn = order.resto_mode === 'dine_in' || order.resto_mode === 'dine-in'
                    const stepsToUse = isDineIn ? DINE_IN_STEPS : STEPS
                    const progressPercent = ((currentStep + 1) / stepsToUse.length) * 100

                    return (
                        <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-primary" />
                                        {orderDate.toLocaleDateString()}
                                    </h3>
                                    <p className="text-xs text-gray-500">{orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    ${order.total?.toLocaleString('es-CO') || '0'}
                                </span>
                            </div>

                            {/* Items List (compacto) */}
                            <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4 space-y-1">
                                {(order.items_snapshot || []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">
                                            <span className="font-semibold mr-1">{item.quantity}x</span>{item.title}
                                        </span>
                                        <span className="text-gray-500 text-xs">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                                    </div>
                                ))}
                                {order.delivery_address && !isDineIn && (
                                    <div className="flex items-center gap-1 pt-1 text-xs text-gray-400">
                                        <Bike className="w-3 h-3" />
                                        {order.delivery_address}
                                    </div>
                                )}
                                {isDineIn && (
                                    <div className="flex items-center gap-1 pt-1 text-xs text-primary/80 font-medium">
                                        <CircleCheckBig className="w-3 h-3" />
                                        Orden en Mesa {tableIdentifier ? `(${tableIdentifier})` : ''}
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="relative pt-2 pb-2">
                                <div className="overflow-hidden h-1 mb-4 rounded-full bg-gray-100 dark:bg-zinc-800">
                                    <div
                                        style={{ width: `${progressPercent}%` }}
                                        className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                                    />
                                </div>
                            </div>

                            {/* 4-Step Icons */}
                            <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                                {stepsToUse.map((step, i) => {
                                    const Icon = step.icon
                                    const isCurrentStep = i === currentStep
                                    return (
                                        <div
                                            key={step.key}
                                            className={`flex flex-col items-center gap-1 transition-all duration-300 ${isCurrentStep ? 'text-primary font-bold scale-110' : 'opacity-40'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{step.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ══════ Pedidos Completados (Cards Compactas) ══════ */}
            {completedOrders.length > 0 && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center">
                        Completados
                    </h2>
                    {completedOrders.map((order) => {
                        const orderDate = new Date(order.created_at)
                        const items = order.items_snapshot || []
                        const total = order.total || 0
                        const isExpanded = expandedCompletedId === order.id

                        return (
                            <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden transition-all duration-300">
                                {/* Compact Row */}
                                <button
                                    onClick={() => setExpandedCompletedId(isExpanded ? null : order.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <CircleCheckBig className="w-4 h-4 text-violet-500 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {orderDate.toLocaleDateString()} · ${total.toLocaleString('es-CO')}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {items.length} producto{items.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-zinc-800 animate-in slide-in-from-top-2 fade-in duration-200">
                                        <div className="pt-3 space-y-1">
                                            {items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-sm">
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        <span className="font-semibold mr-1">{item.quantity}x</span>{item.title}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">${(item.price * item.quantity).toLocaleString('es-CO')}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-zinc-800">
                                            <span className="text-sm font-bold">Total: ${total.toLocaleString('es-CO')}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRepeatOrder(order)
                                                }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Repetir Pedido
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
