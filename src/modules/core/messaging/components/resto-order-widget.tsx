"use client"

import React, { useState } from "react"
import { ShoppingBag, MapPin, Receipt, Check, Loader2, Bike, CircleCheckBig } from "lucide-react"
import { updateRestoOrderStatus } from "@/components/portals/b2c-restaurant-template/actions/checkout-actions"
import { toast } from "sonner"

interface RestoOrderWidgetProps {
    messageId?: string
    orderData: {
        type: string
        total: number
        items: { name: string; qty: number; price: number }[]
        address?: string
        customer_notes?: string
        order_status?: string
    }
    isOutbound: boolean
    status?: string
}

export function RestoOrderWidget({ messageId, orderData, isOutbound, status }: RestoOrderWidgetProps) {
    const isRestaurantSide = !isOutbound
    const [loading, setLoading] = useState(false)
    const [currentStatus, setCurrentStatus] = useState(status)

    const effectiveStatus = orderData.order_status || currentStatus

    const isAccepted = effectiveStatus === 'read' || effectiveStatus === 'shipped' || effectiveStatus === 'completed'
    const isShipped = effectiveStatus === 'shipped' || effectiveStatus === 'completed'
    const isCompleted = effectiveStatus === 'completed'

    const handleAction = async (nextStatus: 'read' | 'shipped' | 'completed') => {
        if (!messageId) return

        setLoading(true)
        try {
            const result = await updateRestoOrderStatus(messageId, nextStatus)
            if (result.success) {
                setCurrentStatus(nextStatus)
                toast.success(
                    nextStatus === 'read' ? "Pedido aceptado" :
                        nextStatus === 'shipped' ? "Pedido despachado" :
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

    const headerLabel = isCompleted ? "Pedido Completado" :
        isShipped ? "Pedido en Camino" :
            isAccepted ? "Pedido Tomado" : "Nuevo Pedido"

    return (
        <div className="flex flex-col w-64 md:w-72 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm my-1">
            {/* Header */}
            <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{headerLabel}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                    ${orderData.total.toLocaleString('es-CO')}
                </span>
            </div>

            {/* Receipt Items */}
            <div className="p-4 flex flex-col space-y-3">
                <div className="flex flex-col space-y-1">
                    {orderData.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-sm">
                            <span className="text-gray-700 dark:text-gray-300">
                                <span className="font-bold text-gray-900 dark:text-white mr-2">{item.qty}x</span>
                                {item.name}
                            </span>
                            <span className="text-gray-500">${(item.price * item.qty).toLocaleString('es-CO')}</span>
                        </div>
                    ))}
                </div>

                {orderData.address && (
                    <div className="flex items-start gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                            {orderData.address}
                        </span>
                    </div>
                )}

                {orderData.customer_notes && (
                    <div className="flex items-start gap-2 pt-2">
                        <Receipt className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-xs italic text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md w-full">
                            {orderData.customer_notes}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions for the CRM Agent */}
            {isRestaurantSide && !isCompleted && (
                <div className="p-2 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                    {!isAccepted ? (
                        <button
                            onClick={() => handleAction('read')}
                            disabled={loading}
                            className="w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceptar Pedido"}
                        </button>
                    ) : !isShipped ? (
                        <button
                            onClick={() => handleAction('shipped')}
                            disabled={loading}
                            className="w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <Bike className="w-4 h-4" />
                                    Enviar Pedido
                                </>
                            )}
                        </button>
                    ) : (
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
                        Pedido completado
                    </div>
                </div>
            )}

            {isShipped && !isCompleted && (
                <div className="p-2 bg-green-50 dark:bg-emerald-900/10 border-t border-green-100 dark:border-emerald-900/20">
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-emerald-400 font-bold text-sm py-1">
                        <Bike className="w-4 h-4" />
                        En camino al cliente
                    </div>
                </div>
            )}
        </div>
    )
}
