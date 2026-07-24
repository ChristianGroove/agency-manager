'use client'

import { useState, useEffect } from 'react'
import { RestoOrdersTable } from "./resto-orders-table"
import { FloorBuilderCanvas } from "@/modules/features/resto/tables/components/floor-builder-canvas"
import { KdsBoard } from "@/modules/features/resto-orders/components/kds-board"
import { RestoTable, RestoZone } from "@/modules/features/resto/tables/store/use-tables-store"
import { LayoutList, Map, PenTool, ChefHat, ClipboardList, Maximize2 } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { SectionHeader } from "@/components/layout/section-header"
import { supabase } from "@/modules/core/database/supabase"
import { updateRestoOrderStatus } from "../actions"
import { closeSession } from "@/modules/features/portal/components/b2c-restaurant-template/actions/resto-session-actions"

interface RestoOrdersViewManagerProps {
    orders: any[] // TODO: specific type
    zones: RestoZone[]
    tables: RestoTable[]
    orgId: string
    orgSlug?: string
}

export function RestoOrdersViewManager({ orders: initialOrders, zones, tables, orgId, orgSlug }: RestoOrdersViewManagerProps) {
    const [viewMode, setViewMode] = useState<'list' | 'map' | 'kds'>('list')
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
    const [orders, setOrders] = useState<any[]>(initialOrders)

    // Sincronizar state si llegan nuevos props del server y enriquecer con nombres de mesas locales
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

    // Suscripción Realtime a nivel global del Gestor
    useEffect(() => {
        const channel = supabase.channel('resto-orders-global')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'resto_orders', filter: `organization_id=eq.${orgId}` },
                async (payload) => {
                    if (payload.eventType === 'INSERT') {
                        // Fetch the joined data for the new order
                        const { data: fullOrder } = await supabase
                            .from('resto_orders')
                            .select(`
                                *,
                                leads (name, phone)
                            `)
                            .eq('id', payload.new.id)
                            .single()
                        
                        if (fullOrder) {
                            // Local mapping for table identifier since there is no foreign key relation in the DB for join
                            const matchedTable = tables.find(t => t.id === fullOrder.table_id)
                            if (matchedTable) {
                                fullOrder.resto_tables = { table_identifier: matchedTable.table_identifier }
                            }

                            setOrders(prev => [fullOrder, ...prev])
                            toast.success("¡Nueva orden recibida!")
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
                { event: 'UPDATE', schema: 'public', table: 'resto_tables', filter: `organization_id=eq.${orgId}` },
                (payload) => {
                    // Update the visual state of the table
                    const newTable = payload.new
                    // Note: FloorBuilderCanvas reads from 'tables' state, but 'tables' is passed as prop.
                    // We need to manage tables in state to update the map!
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
                        // Note: Realtime subscription on tables will update the UI automatically if set up,
                        // otherwise a page refresh or manual state update is needed.
                        // We rely on the refresh or next state sync for now.
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

        // Buscar si hay una orden activa para esta mesa
        const activeOrder = orders.find(o => 
            o.resto_mode === 'dine_in' && 
            (o.table_id === table.table_identifier || o.resto_tables?.table_identifier === table.table_identifier || o.table_id === table.id) && 
            ['pending', 'preparing', 'ready'].includes(o.kitchen_status)
        )

        if (activeOrder) {
            setSelectedOrder(activeOrder)
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
        <div className="flex flex-col space-y-6 flex-1">
            {/* Section Header injected here so we can put Tabs in the action slot */}
            <SectionHeader
                title="Gestor de Pedidos"
                subtitle="Historial de comandas y estado de restaurante."
                icon={ClipboardList}
                action={
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
                                    ? "bg-white dark:bg-zinc-800 text-brand dark:text-brand-light shadow-sm border border-zinc-200/50 dark:border-zinc-700" 
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
                }
            />

            {/* KDS Fullscreen action row */}
            {viewMode === 'kds' && (
                <div className="flex justify-end -mt-2">
                    <button 
                        onClick={requestFullScreen}
                        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                        <Maximize2 className="w-4 h-4" />
                        Pantalla Completa
                    </button>
                </div>
            )}

            <div className={cn(
                "flex-1 relative flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/50 overflow-hidden shadow-sm",
                viewMode === 'kds' ? "min-h-[800px] border-none bg-transparent dark:bg-transparent shadow-none" : "min-h-[600px]"
            )}>
                {viewMode === 'list' && (
                    <div className="p-4 flex-1 overflow-auto">
                        <RestoOrdersTable 
                            orders={orders} 
                            selectedOrder={selectedOrder}
                            setSelectedOrder={setSelectedOrder}
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
                        
                        {selectedOrder && (
                            <div className="absolute inset-0 z-50 pointer-events-none">
                                <div className="pointer-events-auto h-full w-full">
                                    <RestoOrdersTable 
                                        orders={[]} // Empty to not render list
                                        selectedOrder={selectedOrder}
                                        setSelectedOrder={setSelectedOrder}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'kds' && (
                    <div className="absolute inset-0 flex flex-col">
                        <KdsBoard orders={orders} onStatusChange={handleStatusChange} />
                    </div>
                )}
            </div>
        </div>
    )
}
