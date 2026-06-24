"use client"

import React, { useState, useEffect } from "react"
import { ShoppingBag, MapPin, Receipt, Loader2, Bike, CircleCheckBig, ChefHat } from "lucide-react"
import { updateRestoOrderStatus } from "@/modules/features/resto-orders/actions"
import { supabase } from "@/modules/core/database/supabase"
import { toast } from "sonner"

interface RestoOrderWidgetProps {
    messageId?: string
    orderData: {
        type: string
        order_id?: string
        total: number
        items: { name?: string; title?: string; qty?: number; quantity?: number; price: number }[]
        address?: string
        customer_notes?: string
    }
    isOutbound: boolean
    status?: string // Legacy message status
}

export function RestoOrderWidget({ messageId, orderData, isOutbound, status }: RestoOrderWidgetProps) {
    const isRestaurantSide = !isOutbound
    const [loading, setLoading] = useState(false)
    const [kitchenStatus, setKitchenStatus] = useState<string>('pending')
    const [liveOrder, setLiveOrder] = useState<any>(null)

    const orderId = orderData.order_id

    // Fetch and subscribe to the real resto_order
    useEffect(() => {
        if (!orderId) return

        const fetchOrder = async () => {
            const { data } = await supabase.from('resto_orders').select('*').eq('id', orderId).single()
            if (data) {
                setLiveOrder(data)
                setKitchenStatus(data.kitchen_status)
            }
        }
        fetchOrder()

        const channel = supabase.channel(`widget-${orderId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'resto_orders', filter: `id=eq.${orderId}` },
                (payload) => {
                    setLiveOrder((prev: any) => ({ ...prev, ...payload.new }))
                    setKitchenStatus(payload.new.kitchen_status)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orderId])

    const handleAction = async (nextStatus: string) => {
        if (!orderId) {
            toast.error("Este es un pedido legacy, no se puede actualizar aquí.")
            return
        }

        setLoading(true)
        try {
            const result = await updateRestoOrderStatus(orderId, nextStatus)
            if (result.success !== false) {
                // local optimistic
                setKitchenStatus(nextStatus)
                toast.success(
                    nextStatus === 'preparing' ? "Pedido en cocina" :
                        nextStatus === 'ready' ? "Pedido despachado/listo" :
                            "Pedido completado"
                )
            } else {
                toast.error("Error al actualizar el pedido")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const effectiveStatus = kitchenStatus
    const isPreparing = effectiveStatus === 'preparing'
    const isReady = effectiveStatus === 'ready'
    const isCompleted = effectiveStatus === 'completed'

    const headerLabel = isCompleted ? "Pedido Completado" :
        isReady ? "Pedido Despachado / Listo" :
            isPreparing ? "Pedido en Cocina" : "Nuevo Pedido"

    // Use liveOrder if available, fallback to orderData (for legacy)
    const displayTotal = liveOrder?.total ?? orderData.total
    const displayItems = liveOrder?.items_snapshot ?? orderData.items
    const displayAddress = liveOrder?.delivery_address ?? orderData.address
    const displayNotes = liveOrder?.customer_notes ?? orderData.customer_notes
    const displayTable = liveOrder?.resto_tables?.table_identifier || liveOrder?.metadata?.table_identifier

    return (
        <div className="flex flex-col w-64 md:w-72 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm my-1">
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b transition-colors ${
                isCompleted ? 'bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-900/20' :
                isReady ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' :
                isPreparing ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-100' :
                'bg-primary/10 border-primary/10'
            }`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${
                    isCompleted ? 'text-violet-600' :
                    isReady ? 'text-emerald-600' :
                    isPreparing ? 'text-orange-600' :
                    'text-primary'
                }`}>
                    {isCompleted ? <CircleCheckBig className="w-4 h-4" /> :
                     isReady ? <Bike className="w-4 h-4" /> :
                     isPreparing ? <ChefHat className="w-4 h-4" /> :
                     <ShoppingBag className="w-4 h-4" />}
                    <span>{headerLabel}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                    ${displayTotal?.toLocaleString('es-CO')}
                </span>
            </div>

            {/* Receipt Items */}
            <div className="p-4 flex flex-col space-y-3">
                <div className="flex flex-col space-y-1">
                    {displayItems?.map((item: any, idx: number) => {
                        const qty = item.quantity || item.qty || 1
                        const name = item.title || item.name || 'Item'
                        return (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                    <span className="font-bold text-gray-900 dark:text-white mr-2">{qty}x</span>
                                    {name}
                                </span>
                                <span className="text-gray-500">${(item.price * qty).toLocaleString('es-CO')}</span>
                            </div>
                        )
                    })}
                </div>

                {displayTable && (
                    <div className="flex items-start gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <MapPin className="w-4 h-4 text-brand-pink mt-0.5" />
                        <span className="text-xs font-bold text-brand-pink leading-snug">
                            {displayTable}
                        </span>
                    </div>
                )}

                {displayAddress && !displayTable && (
                    <div className="flex items-start gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                            {displayAddress}
                        </span>
                    </div>
                )}

                {displayNotes && (
                    <div className="flex items-start gap-2 pt-2">
                        <Receipt className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-xs italic text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md w-full">
                            {displayNotes}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions for the CRM Agent */}
            {isRestaurantSide && !isCompleted && (
                <div className="p-2 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 space-y-2">
                    {kitchenStatus === 'pending' && (
                        <button
                            onClick={() => handleAction('preparing')}
                            disabled={loading}
                            className="w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceptar Pedido (Cocina)"}
                        </button>
                    )}
                    
                    {kitchenStatus === 'preparing' && (
                        <button
                            onClick={() => handleAction('ready')}
                            disabled={loading}
                            className="w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <Bike className="w-4 h-4" />
                                    Enviar / Listo
                                </>
                            )}
                        </button>
                    )}

                    {kitchenStatus === 'ready' && (
                        <button
                            onClick={() => handleAction('completed')}
                            disabled={loading}
                            className="w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <CircleCheckBig className="w-4 h-4" />
                                    Completar Pedido
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            {isCompleted && (
                <div className="p-2 bg-violet-50 dark:bg-violet-900/10 border-t border-violet-100 dark:border-violet-900/20">
                    <div className="flex items-center justify-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-sm py-1">
                        <CircleCheckBig className="w-4 h-4" />
                        Pedido Completado
                    </div>
                </div>
            )}
        </div>
    )
}
