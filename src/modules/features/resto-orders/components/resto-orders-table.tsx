"use client"

import React, { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChefHat, ShoppingBag, MapPin, Receipt, X } from "lucide-react"

export function RestoOrdersTable({ 
    orders,
    selectedOrder,
    setSelectedOrder
}: { 
    orders: any[],
    selectedOrder?: any,
    setSelectedOrder?: (order: any | null) => void
}) {

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
        cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }

    const statusLabels: Record<string, string> = {
        pending: 'Pendiente',
        preparing: 'En Cocina',
        ready: 'Listo',
        completed: 'Entregado',
        cancelled: 'Cancelado',
    }

    return (
        <>
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-zinc-400 font-semibold border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Modo</th>
                                <th className="px-6 py-4">Total</th>
                                <th className="px-6 py-4">Pago</th>
                                <th className="px-6 py-4">Estado Cocina</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No hay pedidos registrados aún.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            {format(new Date(order.created_at), "MMM d, h:mm a", { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {order.leads?.name || 'Invitado'}
                                            {order.resto_mode === 'dine_in' && order.table_id && (
                                                <span className="ml-2 text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-zinc-300">
                                                    Mesa {order.table_id}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 capitalize text-gray-600 dark:text-zinc-400">
                                            {order.resto_mode.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                            ${order.total?.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {order.payment_status === 'paid' ? 'Pagado' : 'Por Pagar'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[order.kitchen_status] || 'bg-gray-100 text-gray-800'}`}>
                                                {statusLabels[order.kitchen_status] || order.kitchen_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedOrder?.(order)}
                                                className="text-brand-pink hover:underline font-semibold text-sm"
                                            >
                                                Ver Detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalle */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-brand-pink" />
                                Detalle del Pedido
                            </h2>
                            <button onClick={() => setSelectedOrder?.(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/10">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Total a pagar</p>
                                    <p className="text-xl font-bold text-primary">${selectedOrder.total?.toLocaleString('es-CO')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Propinas</p>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">${selectedOrder.tip_amount?.toLocaleString('es-CO') || '0'}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-sm mb-2 text-gray-900 dark:text-white border-b pb-1 dark:border-zinc-800">Productos</h3>
                                <div className="space-y-2">
                                    {(selectedOrder.items_snapshot || []).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-sm items-start">
                                            <div className="flex-1">
                                                <span className="font-bold mr-2 text-gray-900 dark:text-white">{item.quantity}x</span>
                                                <span className="text-gray-700 dark:text-gray-300">{item.title}</span>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <p className="text-xs text-gray-400 mt-0.5 ml-6">
                                                        + {item.modifiers.map((m:any) => m.optionName).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="font-medium text-gray-600 dark:text-gray-400">
                                                ${(item.price * item.quantity).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedOrder.delivery_address && (
                                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white flex items-center gap-1">
                                        <MapPin className="w-4 h-4 text-gray-400" /> Dirección de Entrega
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 pl-5">{selectedOrder.delivery_address}</p>
                                </div>
                            )}

                            {selectedOrder.customer_notes && (
                                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800">
                                    <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white flex items-center gap-1">
                                        <Receipt className="w-4 h-4 text-gray-400" /> Notas del Cliente
                                    </h3>
                                    <p className="text-sm text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg italic">
                                        "{selectedOrder.customer_notes}"
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 text-center">
                            <button onClick={() => setSelectedOrder?.(null)} className="font-semibold text-sm hover:underline text-gray-600 dark:text-gray-300">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
