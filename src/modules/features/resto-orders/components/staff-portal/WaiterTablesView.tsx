"use client"

import React from "react"
import { UtensilsCrossed, BellRing, Clock, Users, Receipt, AlertCircle, CheckCircle2, UserCheck, Flame } from "lucide-react"
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

    // Calculate Summary Metrics
    let totalBillingCount = 0
    let totalOccupiedCount = 0
    let totalAvailableCount = 0

    tables.forEach(table => {
        const session = sessionMap.get(table.id)
        if (session?.status === 'payment_pending' || table.status === 'billing') {
            totalBillingCount++
        } else if (session || table.status === 'occupied') {
            totalOccupiedCount++
        } else {
            totalAvailableCount++
        }
    })

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
            const unknownZone = { id: table.zone_id, name: 'Zona Asignada' }
            tablesByZone.set(table.zone_id, { zone: unknownZone, tables: [table] })
        }
    }

    const zonesList = Array.from(tablesByZone.values()).filter(z => z.tables.length > 0)

    if (zonesList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                <UtensilsCrossed className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Sin Mesas Asignadas</h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                    No tienes mesas asignadas en este momento. Pide al administrador que te asigne a una zona operativa.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-24 font-sans">
            {/* Quick Zone Operational Stats */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Disponibles</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{totalAvailableCount}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ocupadas</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xl font-black text-sky-600 dark:text-sky-400">{totalOccupiedCount}</span>
                        <Users className="w-4 h-4 text-sky-500" />
                    </div>
                </div>

                <div className={cn(
                    "p-3 rounded-2xl border transition-all flex flex-col justify-between",
                    totalBillingCount > 0
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 animate-shadow-pulse-slow-amber shadow-sm shadow-amber-500/10"
                        : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800"
                )}>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        totalBillingCount > 0 ? "text-amber-800 dark:text-amber-300 font-black" : "text-slate-400"
                    )}>Pidiendo Cuenta</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className={cn(
                            "text-xl font-black",
                            totalBillingCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"
                        )}>{totalBillingCount}</span>
                        <BellRing className={cn("w-4 h-4", totalBillingCount > 0 ? "text-amber-500" : "text-slate-400")} />
                    </div>
                </div>
            </div>

            {/* Zones List */}
            {zonesList.map(({ zone, tables: zoneTables }) => (
                <div key={zone.id} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            {zone.name}
                        </h2>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            {zoneTables.length} mesas
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {zoneTables.map((table) => {
                            const session = sessionMap.get(table.id)
                            const isBilling = session?.status === 'payment_pending' || table.status === 'billing'
                            const isOccupied = session || table.status === 'occupied'
                            const isMyTable = session?.waiter_id === staffId

                            return (
                                <div
                                    key={table.id}
                                    className={cn(
                                        "relative p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between space-y-3 shadow-xs",
                                        isBilling
                                            ? "border-amber-400 dark:border-amber-500 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 shadow-md shadow-amber-500/10"
                                            : isOccupied
                                                ? "border-sky-200 dark:border-sky-800/60 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white"
                                                : "border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 text-slate-900 dark:text-white hover:border-emerald-400"
                                    )}
                                >
                                    {/* Header: Table Identifier & Status Pill */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black text-lg text-slate-900 dark:text-white leading-none">
                                                Mesa {table.table_identifier}
                                            </span>
                                            {isMyTable && (
                                                <span className="w-2 h-2 rounded-full bg-sky-500" title="Atendida por ti" />
                                            )}
                                        </div>

                                        {isBilling ? (
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs animate-shadow-pulse-slow-amber flex items-center gap-1">
                                                <BellRing className="w-2.5 h-2.5" /> Cuenta
                                            </span>
                                        ) : isOccupied ? (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200/80">
                                                Ocupada
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                                                Disponible
                                            </span>
                                        )}
                                    </div>

                                    {/* Body: Prominent Bill Amount / Session Metadata */}
                                    {session ? (
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                            {/* Account Total (Featured Value) */}
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                                    {isBilling ? 'Total a Cobrar' : 'Consumo Actual'}
                                                </span>
                                                <div className="flex items-center justify-between">
                                                    <span className={cn(
                                                        "text-xl font-black tracking-tight",
                                                        isBilling ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-white"
                                                    )}>
                                                        ${(session.total_accumulated || 0).toLocaleString('es-CO')}
                                                    </span>
                                                    <Receipt className={cn("w-4 h-4", isBilling ? "text-amber-500" : "text-sky-500")} />
                                                </div>
                                            </div>

                                            {/* Extra Metadata: Guests & Duration */}
                                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 pt-1">
                                                <span className="flex items-center gap-1 font-semibold text-[11px]">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    {session.guest_count || 1} pers.
                                                </span>
                                                {session.opened_at && (
                                                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDistanceToNow(new Date(session.opened_at), { locale: es, addSuffix: false })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 space-y-1">
                                            <div className="flex items-center justify-between text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    Capacidad: {table.capacity || 4} pers.
                                                </span>
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Lista</span>
                                            </div>
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
