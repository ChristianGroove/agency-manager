"use client"

import React from "react"
import { ClipboardList, Clock, Utensils, CheckCircle2, ChefHat, AlertCircle } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface WaiterOrdersViewProps {
    todayOrders: any[]
    activeSessions: any[]
}

const KITCHEN_STATUS_CONFIG: Record<string, { label: string; bg: string; icon: any }> = {
    pending: { label: "Pendiente", bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800", icon: Clock },
    preparing: { label: "En Preparación", bg: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 animate-pulse", icon: ChefHat },
    ready: { label: "¡LISTO PARA SERVIR!", bg: "bg-emerald-500 text-white animate-bounce shadow-md shadow-emerald-500/30", icon: CheckCircle2 },
    completed: { label: "Entregado", bg: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", icon: CheckCircle2 },
    cancelled: { label: "Cancelado", bg: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300", icon: AlertCircle }
}

export function WaiterOrdersView({ todayOrders, activeSessions }: WaiterOrdersViewProps) {
    if (!todayOrders || todayOrders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
                <ClipboardList className="w-12 h-12 text-zinc-400 mb-3" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">Sin Pedidos Activos</h3>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                    No tienes comanda registrada en tus mesas en este momento.
                </p>
            </div>
        )
    }

    // Session lookup for table identifiers
    const sessionMap = new Map<string, any>()
    for (const session of activeSessions) {
        sessionMap.set(session.id, session)
    }

    return (
        <div className="space-y-4 pb-24">
            <h2 className="font-black text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2 px-1">
                <ClipboardList className="w-4 h-4 text-brand-pink" />
                Comandas en Curso ({todayOrders.length})
            </h2>

            <div className="space-y-3">
                {todayOrders.map((order) => {
                    const session = sessionMap.get(order.session_id)
                    const tableIdentifier = session?.resto_tables?.table_identifier || order.table_id || '?'
                    const kitchenConfig = KITCHEN_STATUS_CONFIG[order.kitchen_status] || KITCHEN_STATUS_CONFIG.pending
                    const KitchenIcon = kitchenConfig.icon

                    // Parse items snapshot
                    let items: any[] = []
                    if (Array.isArray(order.items_snapshot)) {
                        items = order.items_snapshot
                    } else if (typeof order.items_snapshot === 'string') {
                        try {
                            items = JSON.parse(order.items_snapshot)
                        } catch (e) {
                            items = []
                        }
                    }

                    return (
                        <div
                            key={order.id}
                            className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-4 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-3"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-base text-zinc-900 dark:text-white flex items-center gap-1.5">
                                        <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        Mesa {tableIdentifier}
                                    </span>
                                    {order.round_number > 1 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            Ronda #{order.round_number}
                                        </span>
                                    )}
                                </div>

                                <span className={cn("text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border", kitchenConfig.bg)}>
                                    <KitchenIcon className="w-3 h-3" />
                                    {kitchenConfig.label}
                                </span>
                            </div>

                            {/* Items List */}
                            <div className="space-y-1.5 text-xs">
                                {items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start justify-between text-zinc-800 dark:text-zinc-200">
                                        <span className="font-semibold">
                                            <span className="font-bold text-brand-pink mr-1.5">{item.quantity || 1}x</span>
                                            {item.name || item.title}
                                        </span>
                                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                                            ${((item.price || item.base_price || 0) * (item.quantity || 1)).toLocaleString('es-CO')}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400">
                                <span>
                                    {formatDistanceToNow(new Date(order.created_at), { locale: es, addSuffix: true })}
                                </span>
                                <span className="font-bold text-zinc-900 dark:text-white text-xs">
                                    Total: ${Number(order.total || 0).toLocaleString('es-CO')}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
