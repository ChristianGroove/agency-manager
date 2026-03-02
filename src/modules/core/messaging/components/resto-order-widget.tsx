"use client"

import React, { useState } from "react"
import { ShoppingBag, MapPin, Receipt, Check, Loader2 } from "lucide-react"
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
    }
    isOutbound: boolean
    status?: string
}

export function RestoOrderWidget({ messageId, orderData, isOutbound, status }: RestoOrderWidgetProps) {
    const isRestaurantSide = !isOutbound
    const [loading, setLoading] = useState(false)
    const [currentStatus, setCurrentStatus] = useState(status)

    const isAccepted = currentStatus === 'read'

    const handleAccept = async () => {
        if (!messageId || isAccepted) return

        setLoading(true)
        try {
            const result = await updateRestoOrderStatus(messageId, 'read')
            if (result.success) {
                setCurrentStatus('read')
                toast.success("Pedido aceptado exitosamente")
            } else {
                toast.error("Error al aceptar el pedido")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col w-64 md:w-72 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm my-1">
            {/* Header */}
            <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isAccepted ? "Pedido Tomado" : "Nuevo Pedido"}</span>
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
            {isRestaurantSide && (
                <div className="p-2 bg-gray-50 dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800">
                    <button
                        onClick={handleAccept}
                        disabled={loading || isAccepted}
                        className={`w-full font-bold text-sm py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${isAccepted
                            ? "bg-green-500 text-white cursor-default"
                            : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-[0.98]"
                            }`}
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isAccepted ? (
                            <>
                                <Check className="w-4 h-4" />
                                Pedido Aceptado
                            </>
                        ) : (
                            "Aceptar Pedido"
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
