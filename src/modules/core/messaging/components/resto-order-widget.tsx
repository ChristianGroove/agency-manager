import React from "react"
import { ShoppingBag, MapPin, Receipt, Check } from "lucide-react"

interface RestoOrderWidgetProps {
    orderData: {
        type: string
        total: number
        items: { name: string; qty: number; price: number }[]
        address?: string
        customer_notes?: string
    }
    isOutbound: boolean
}

export function RestoOrderWidget({ orderData, isOutbound }: RestoOrderWidgetProps) {
    const isRestaurantSide = !isOutbound // El restaurante lo recibe (inbound), el cliente lo envió

    return (
        <div className="flex flex-col w-64 md:w-72 bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-sm my-1">
            {/* Header */}
            <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/10">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <ShoppingBag className="w-4 h-4" />
                    <span>Nuevo Pedido</span>
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
                    <button className="w-full bg-black dark:bg-white text-white dark:text-black font-bold text-sm py-2 rounded-lg hover:opacity-90 transition-opacity">
                        Aceptar Pedido
                    </button>
                </div>
            )}
        </div>
    )
}
