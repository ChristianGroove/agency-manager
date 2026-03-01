"use client"

import React, { useEffect, useState } from "react"
import { ReceiptText, CheckCircle2, Clock, MapPin, ChefHat, Bike, CalendarDays } from "lucide-react"
import { useRestoCart } from "@/hooks/use-resto-cart"
import { getRestoGuestOrders } from "../actions/resto-guest-tracking"
import { getRestoClientOrders, RestoOrderHistoryItem } from "../actions/resto-orders-actions"
import { RestoOrderWidget } from "@/modules/core/messaging/components/resto-order-widget"

export function RestoOrderTracker({ orgId, client }: { orgId: string, client?: any }) {
    const { recentOrders } = useRestoCart()
    const [orders, setOrders] = useState<RestoOrderHistoryItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true)
            try {
                let fetchedOrders: RestoOrderHistoryItem[] = []

                if (client?.id) {
                    // SI SOMOS CLIENTE: Fetch oficial desde la DB vinculada al ID
                    fetchedOrders = await getRestoClientOrders(orgId, client.id)
                } else if (recentOrders && recentOrders.length > 0) {
                    // SI SOMOS GUEST: Fetch por IDs guardados en el navegador
                    fetchedOrders = await getRestoGuestOrders(recentOrders, orgId)
                }

                setOrders(fetchedOrders)
            } catch (error) {
                console.error("Error fetching orders:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchOrders()
    }, [recentOrders, orgId, client?.id])

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

    // El prototipo visual de "Live Tracking" PWA
    return (
        <div className="flex flex-col w-full h-full p-4 pb-24 space-y-6">
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>

            <div className="space-y-4">
                {orders.map((order) => {
                    const orderDate = new Date(order.created_at)
                    return (
                        <div key={order.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-primary" />
                                        {orderDate.toLocaleDateString()}
                                    </h3>
                                    <p className="text-sm text-gray-500">{orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <span className={
                                    `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ` +
                                    (order.status === 'read' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")
                                }>
                                    {order.status === 'read' ? "Tomado" : "Enviado a Cocina"}
                                </span>
                            </div>

                            {/* Mostrar el detalle de items reusando el Widget ya diseñado para el CRM */}
                            <div className="-mx-5 border-y border-gray-50 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 py-2 flex justify-center scale-95 origin-center pointer-events-none">
                                <RestoOrderWidget orderData={order.metadata as any} isOutbound={true} />
                            </div>

                            {/* Progress Bar Visual (Simulado MVP) */}
                            <div className="relative pt-6 pb-2">
                                <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded bg-gray-100 dark:bg-zinc-800">
                                    <div style={{ width: order.status === 'read' ? "100%" : "30%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-1000"></div>
                                </div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
                                <div className="flex flex-col items-center gap-1 text-primary">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Enviado</span>
                                </div>
                                <div className={`flex flex-col items-center gap-1 ${order.status === 'read' ? 'text-primary' : 'opacity-40'}`}>
                                    <ChefHat className="w-5 h-5" />
                                    <span>Preparando</span>
                                </div>
                                <div className="flex flex-col items-center gap-1 opacity-40">
                                    <Bike className="w-5 h-5" />
                                    <span>En Camino</span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
