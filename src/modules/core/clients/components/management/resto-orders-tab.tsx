"use client"

import React, { useEffect, useState } from "react"
import { ShoppingBag, CreditCard, TrendingUp, Calendar, Loader2, SearchX } from "lucide-react"
import { getRestoClientOrders, RestoOrderHistoryItem } from "@/components/portals/b2c-restaurant-template/actions/resto-orders-actions"
import { RestoOrderWidget } from "@/modules/core/messaging/components/resto-order-widget"

interface RestoOrdersTabProps {
    orgId: string
    clientId: string
}

export function RestoOrdersTab({ orgId, clientId }: RestoOrdersTabProps) {
    const [orders, setOrders] = useState<RestoOrderHistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!orgId || !clientId) return

        async function fetchOrders() {
            setLoading(true)
            try {
                const data = await getRestoClientOrders(orgId, clientId)
                setOrders(data || [])
            } catch (error) {
                console.error("Error cargando historial de pedidos:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, [orgId, clientId])

    // Calcular Métricas
    const totalSpent = orders.reduce((acc, order) => acc + (order.metadata?.total || 0), 0)
    const averageTicket = orders.length > 0 ? totalSpent / orders.length : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="font-bold text-gray-900">Historial de Consumo</h3>
                    <p className="text-sm text-gray-500">Métricas clave y cronología de pedidos B2C.</p>
                </div>
            </div>

            {/* Metrics KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Monto Gastado (LTV)</p>
                        <h4 className="text-2xl font-bold text-gray-900">${totalSpent.toLocaleString('es-CO')}</h4>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <CreditCard className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Pedidos</p>
                        <h4 className="text-2xl font-bold text-gray-900">{orders.length}</h4>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Ticket Promedio</p>
                        <h4 className="text-2xl font-bold text-gray-900">${Math.round(averageTicket).toLocaleString('es-CO')}</h4>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Timeline Histórico */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-primary" /> Recibos Cronológicos
                    </h4>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                            <p className="text-sm">Buscando conversaciones previas...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-60 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <SearchX className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="text-gray-900 font-bold mb-1">Sin historial comercial</h4>
                            <p className="text-sm text-gray-500 max-w-sm">
                                Este contacto aún no ha finalizado ningún pedido a través del portal B2C o no hemos registrado transacciones en su chat.
                            </p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-4">
                            {orders.map((order, idx) => (
                                <div key={order.id} className="relative pl-6">
                                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-primary ring-4 ring-white" />

                                    <div className="flex flex-col mb-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 tracking-wider uppercase mb-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(order.created_at).toLocaleDateString()} a las {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {/* Reutilización Masiva: Renderizamos el mismo Widget del Inbox pero solo lectura */}
                                    <div className="pointer-events-none opacity-90 scale-95 origin-left w-fit">
                                        <RestoOrderWidget orderData={order.metadata as any} isOutbound={true} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
