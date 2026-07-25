'use client'

import { useState, useEffect } from 'react'
import { RestoOrdersTable } from "./resto-orders-table"
import { FloorBuilderCanvas } from "@/modules/features/resto/tables/components/floor-builder-canvas"
import { KdsBoard } from "@/modules/features/resto-orders/components/kds-board"
import { RestoTable, RestoZone } from "@/modules/features/resto/tables/store/use-tables-store"
import { LayoutList, Map, ChefHat, ClipboardList, Maximize2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { SectionHeader } from "@/components/layout/section-header"
import { supabase } from "@/modules/core/database/supabase"
import { updateRestoOrderStatus, GroupedOrder } from "../actions"
import { closeSession } from "@/modules/features/portal/components/b2c-restaurant-template/actions/resto-session-actions"

interface RestoOrdersViewManagerProps {
    orders: any[]
    groupedOrders: GroupedOrder[]
    zones: RestoZone[]
    tables: RestoTable[]
    orgId: string
    orgSlug?: string
}

export function RestoOrdersViewManager({ orders: initialOrders, groupedOrders: initialGrouped, zones, tables, orgId, orgSlug }: RestoOrdersViewManagerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'kds'>('list')
    const [orders, setOrders] = useState<any[]>(initialOrders)
    const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>(initialGrouped)

    // Sync state when server props change
    useEffect(() => {
        const enrichedOrders = initialOrders.map(o => {
            if (o.table_id && !o.resto_tables) {
                const matchedTable = tables.find(t => t.id === o.table_id)
                if (matchedTable) {
                    return { ...o, resto_tables: { table_identifier: matchedTable.table_identifier } }
                }
            }
            return o
        })
        setOrders(enrichedOrders)
    }, [initialOrders, tables])

    useEffect(() => {
        setGroupedOrders(initialGrouped)
    }, [initialGrouped])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase.channel('resto-orders-global')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'resto_orders', filter: `organization_id=eq.${orgId}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const { data: fullOrder } = await supabase
                            .from('resto_orders')
                            .select(`*, leads (name, phone)`)
                            .eq('id', payload.new.id)
                            .single()
                        
                        if (fullOrder) {
                            const matchedTable = tables.find(t => t.id === fullOrder.table_id)
                            if (matchedTable) {
                                fullOrder.resto_tables = { table_identifier: matchedTable.table_identifier }
                            }
                            setOrders(prev => [fullOrder, ...prev])
                            toast.success("¡Nueva orden recibida!")
                            setTimeout(() => window.location.reload(), 1500)
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'resto_table_sessions', filter: `organization_id=eq.${orgId}` },
                (payload) => {
                    if (payload.new.status === 'payment_pending' || payload.new.status === 'closed') {
                        setTimeout(() => window.location.reload(), 800)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orgId, tables])

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kitchen_status: newStatus } : o))
        await updateRestoOrderStatus(orderId, newStatus)
    }

    const handleTableClick = async (table: RestoTable) => {
        if (table.status === 'billing') {
            if (window.confirm(`La mesa ${table.table_identifier} ha pedido la cuenta. ¿Confirmar pago y liberar mesa?`)) {
                if (table.current_session_id) {
                    const res = await closeSession(table.current_session_id, orgId)
                    if (res.success) {
                        toast.success(`Mesa ${table.table_identifier} liberada`)
                        window.location.reload()
                    } else {
                        toast.error("Error al liberar mesa: " + res.error)
                    }
                } else {
                    toast.error("No se encontró session_id en esta mesa.")
                }
            }
            return
        }

        const activeOrder = orders.find(o => 
            o.resto_mode === 'dine_in' && 
            (o.table_id === table.id) && 
            ['pending', 'preparing', 'ready'].includes(o.kitchen_status)
        )

        if (activeOrder) {
            toast.info(`Mesa ${table.table_identifier}: pedido activo en cocina (${activeOrder.kitchen_status})`)
        } else {
            toast.info(`La mesa ${table.table_identifier} no tiene pedidos activos.`)
        }
    }

    const requestFullScreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
    }

    return (
        <div className="flex flex-col space-y-6 flex-1 h-full min-h-0">
            {/* Section Header */}
            <SectionHeader
                title="Gestor de Pedidos"
                subtitle="Historial de comandas y estado de restaurante."
                icon={ClipboardList}
                action={
                    <div className="flex items-center gap-3">
                        {/* Fullscreen CTA placed to the LEFT of the main multitab */}
                        {viewMode === 'kds' && (
                            <button
                                onClick={requestFullScreen}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm transition-all whitespace-nowrap"
                                title="Pantalla Completa KDS"
                            >
                                <Maximize2 className="w-3.5 h-3.5 text-orange-500" />
                                Pantalla Completa
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                                    viewMode === 'list' 
                                        ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200/50 dark:border-zinc-700" 
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <LayoutList className="w-4 h-4" />
                                Lista
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                                    viewMode === 'map' 
                                        ? "bg-white dark:bg-zinc-800 text-brand-pink dark:text-brand-pink shadow-sm border border-zinc-200/50 dark:border-zinc-700" 
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <Map className="w-4 h-4" />
                                Mapa de Mesas
                            </button>
                            <button
                                onClick={() => setViewMode('kds')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap",
                                    viewMode === 'kds' 
                                        ? "bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm border border-zinc-200/50 dark:border-zinc-700" 
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <ChefHat className="w-4 h-4" />
                                KDS
                            </button>
                        </div>
                    </div>
                }
            />

            <div className={cn(
                "flex-1 relative flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm",
                viewMode === 'kds' ? "min-h-[calc(100vh-13rem)] border-none bg-transparent dark:bg-transparent shadow-none" : "min-h-[600px]"
            )}>
                {viewMode === 'list' && (
                    <div className="p-4 flex-1 overflow-auto">
                        <RestoOrdersTable 
                            groupedOrders={groupedOrders}
                        />
                    </div>
                )}
                
                {viewMode === 'map' && (
                    <div className="absolute inset-0">
                        <FloorBuilderCanvas 
                            initialZones={zones}
                            initialTables={tables}
                            orgId={orgId}
                            orgSlug={orgSlug}
                            readOnly={false}
                            defaultMode="live"
                            onTableClick={handleTableClick}
                        />
                    </div>
                )}

                {viewMode === 'kds' && (
                    <div className="absolute inset-0 flex flex-col p-1">
                        <KdsBoard orders={orders} onStatusChange={handleStatusChange} />
                    </div>
                )}
            </div>
        </div>
    )
}
