"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase" // Nota: usar el cliente de BROWSER
import { ReceiptText, CheckCircle2, Clock, MapPin, ChefHat, Bike } from "lucide-react"

export function RestoOrderTracker({ orgId }: { orgId: string }) {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // En un PWA B2C real sin Auth tradicional, usaríamos LocalStorage para guardar 
        // los IDs de conversación recientes del cliente y consultarlos aquí.
        // Simularemos una interfaz vacía elegante o cargaremos datos genéricos en MVP.
        const fetchOrders = async () => {
            // Simulando fetch de localStorage-based orders
            setLoading(false)
        }
        fetchOrders()
    }, [])

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

    // El prototipo visual de "Live Tracking" PWA (Para mostrar el potencial)
    return (
        <div className="flex flex-col w-full h-full p-4 pb-24 space-y-6">
            <h1 className="text-2xl font-bold">Mis Pedidos</h1>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-lg">Pedido #8492</h3>
                        <p className="text-sm text-gray-500">Hoy, 8:45 PM</p>
                    </div>
                    <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        En Preparación
                    </span>
                </div>

                {/* Progress Bar Visual */}
                <div className="relative pt-6 pb-2">
                    <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded bg-gray-100 dark:bg-zinc-800">
                        <div style={{ width: "50%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
                    <div className="flex flex-col items-center gap-1 text-primary">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Recibido</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-primary">
                        <ChefHat className="w-5 h-5" />
                        <span>Cocina</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 opacity-40">
                        <Bike className="w-5 h-5" />
                        <span>En Camino</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
