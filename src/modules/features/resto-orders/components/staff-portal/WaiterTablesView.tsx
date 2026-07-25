"use client"

import React from "react"
import { UtensilsCrossed, BellRing, Clock, Users, Circle, Square, RectangleHorizontal } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface WaiterTablesViewProps {
    tables: any[]
    activeSessions: any[]
    zones: any[]
    staffId: string
}

export function WaiterTablesView({ tables, activeSessions, zones, staffId }: WaiterTablesViewProps) {
    // Map active sessions by table_id
    const sessionMap = new Map<string, any>()
    for (const session of activeSessions) {
        sessionMap.set(session.table_id, session)
    }

    // Group tables by zone
    const tablesByZone = new Map<string, { zone: any; tables: any[] }>()
    
    for (const zone of zones) {
        tablesByZone.set(zone.id, { zone, tables: [] })
    }

    for (const table of tables) {
        const entry = tablesByZone.get(table.zone_id)
        if (entry) {
            entry.tables.push(table)
        } else {
            // Unassigned to known zone
            const unknownZone = { id: table.zone_id, name: 'Zona Asignada' }
            tablesByZone.set(table.zone_id, { zone: unknownZone, tables: [table] })
        }
    }

    const zonesList = Array.from(tablesByZone.values()).filter(z => z.tables.length > 0)

    if (zonesList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm">
                <UtensilsCrossed className="w-12 h-12 text-zinc-400 mb-3" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">Sin Mesas Asignadas</h3>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                    No tienes mesas asignadas actualmente. Pide al administrador que te asigne a una zona.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24">
            {zonesList.map(({ zone, tables: zoneTables }) => (
                <div key={zone.id} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-brand-pink" />
                            {zone.name}
                        </h2>
                        <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            {zoneTables.length} mesas
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {zoneTables.map((table) => {
                            const session = sessionMap.get(table.id)
                            const isBilling = session?.status === 'payment_pending' || table.status === 'billing'
                            const isOccupied = session || table.status === 'occupied'
                            const isAvailable = !session && table.status === 'available'

                            let statusColor = "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                            let statusBadge = "Disponible"
                            let badgeBg = "bg-emerald-500 text-white"

                            if (isBilling) {
                                statusColor = "border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 shadow-md shadow-amber-500/10 animate-pulse"
                                statusBadge = "🔔 PIDIÓ CUENTA"
                                badgeBg = "bg-amber-500 text-white animate-pulse"
                            } else if (isOccupied) {
                                statusColor = "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100"
                                statusBadge = "Ocupada"
                                badgeBg = "bg-rose-500 text-white"
                            }

                            return (
                                <div
                                    key={table.id}
                                    className={cn(
                                        "relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3",
                                        statusColor
                                    )}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-lg text-zinc-900 dark:text-white flex items-center gap-1.5">
                                            Mesa {table.table_identifier}
                                        </span>
                                        <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs", badgeBg)}>
                                            {statusBadge}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    {session ? (
                                        <div className="space-y-1.5 pt-1 border-t border-black/5 dark:border-white/5 text-xs">
                                            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                                                    {session.guest_count || 1} personas
                                                </span>
                                                <span className="font-bold text-zinc-900 dark:text-white">
                                                    ${(session.total_accumulated || 0).toLocaleString('es-CO')}
                                                </span>
                                            </div>
                                            {session.opened_at && (
                                                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {formatDistanceToNow(new Date(session.opened_at), { locale: es, addSuffix: false })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-zinc-400 flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            <span>Capacidad: {table.capacity || 4}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
