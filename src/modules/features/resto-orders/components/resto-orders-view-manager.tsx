'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RestoOrdersTable } from "./resto-orders-table"
import { FloorBuilderCanvas } from "@/modules/features/resto/tables/components/floor-builder-canvas"
import { KdsBoard } from "@/modules/features/resto-orders/components/kds-board"
import { RestoStaffAdminView } from "@/modules/features/resto-orders/components/resto-staff-admin-view"
import { RestoTable, RestoZone } from "@/modules/features/resto/tables/store/use-tables-store"
import { LayoutList, Map, ChefHat, ClipboardList, Maximize2, Volume2, BellRing, Users } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { toast } from "sonner"
import { SectionHeader } from "@/components/layout/section-header"
import { supabase } from "@/modules/core/database/supabase"
import { updateRestoOrderStatus, GroupedOrder } from "../actions"
import { closeSession } from "@/modules/features/portal/components/b2c-restaurant-template/actions/resto-session-actions"

function playTone(freq: number, durationSec: number, type: OscillatorType = 'sine') {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + durationSec);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + durationSec);
    } catch (e) {
        console.error("Audio error:", e);
    }
}

export function playKitchenAlertSound() {
    // High C to High G Chime (Nueva Orden)
    playTone(523.25, 0.2);
    setTimeout(() => playTone(783.99, 0.3), 150);
}

export function playBillAlertSound() {
    // Urgent Double Cash Register Beep (Pedir Cuenta)
    playTone(880, 0.25, 'triangle');
    setTimeout(() => playTone(1320, 0.35, 'triangle'), 150);
}

interface RestoOrdersViewManagerProps {
    orders: any[]
    groupedOrders: GroupedOrder[]
    zones: RestoZone[]
    tables: RestoTable[]
    orgId: string
    orgSlug?: string
}

export function RestoOrdersViewManager({ orders: initialOrders, groupedOrders: initialGrouped, zones, tables, orgId, orgSlug }: RestoOrdersViewManagerProps) {
    const router = useRouter()
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
                            playKitchenAlertSound()
                            toast.success("¡Nueva orden recibida en cocina!")
                            router.refresh()
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
                        router.refresh()
                    } else if (payload.eventType === 'DELETE') {
                        setOrders(prev => prev.filter(o => o.id !== payload.old.id))
                        router.refresh()
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'resto_table_sessions', filter: `organization_id=eq.${orgId}` },
                (payload) => {
                    if (payload.new && payload.new.status === 'payment_pending') {
                        playBillAlertSound()
                        const matchedTable = tables.find(t => t.id === payload.new.table_id)
                        const tableNum = matchedTable?.table_identifier || ''
                        toast.warning(`🔔 ¡Mesa ${tableNum ? '#' + tableNum : ''} ha solicitado la cuenta!`, {
                            duration: 10000,
                            description: 'Selecciona "Cobrar Cuenta" para confirmar y liberar la mesa.'
                        })
                        router.refresh()
                    } else if (payload.new && payload.new.status === 'closed') {
                        router.refresh()
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [orgId, tables, router])

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await updateRestoOrderStatus(orderId, newStatus)
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, kitchen_status: newStatus } : o))
            toast.success(`Estado de orden actualizado a ${newStatus}`)
        } catch (e) {
            toast.error("Error al actualizar estado")
        }
    }

    const handleTableClick = (table: RestoTable) => {
        if (table.current_session_id) {
            setViewMode('list')
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
                subtitle="Historial de comandas, mapa de restaurante y gestión de personal."
                icon={ClipboardList}
                action={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                playBillAlertSound()
                                setTimeout(() => playKitchenAlertSound(), 400)
                                toast.success("🔊 Alertas sonoras probadas e inmovilizadas en el navegador.")
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm transition-all whitespace-nowrap"
                            title="Probar alertas sonoras (desbloquea audio en el navegador)"
                        >
                            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Probar Sonido</span>
                        </button>
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
