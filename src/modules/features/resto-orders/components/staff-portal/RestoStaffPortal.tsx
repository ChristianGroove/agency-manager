"use client"

import React, { useState, useEffect } from "react"
import { UtensilsCrossed, ClipboardList, Banknote, User, RefreshCw, Bell } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { supabase } from "@/modules/core/database/supabase"
import { getWaiterDashboard, WaiterDashboard } from "@/modules/features/resto-orders/actions/resto-staff-actions"
import { WaiterTablesView } from "./WaiterTablesView"
import { WaiterOrdersView } from "./WaiterOrdersView"
import { WaiterTipsSummary } from "./WaiterTipsSummary"
import { WaiterProfileView } from "./WaiterProfileView"
import { playBillAlertSound } from "@/modules/features/resto-orders/components/resto-orders-view-manager"

interface RestoStaffPortalProps {
    staff: any
    zoneAssignments: any[]
    settings: any
    token: string
}

export function RestoStaffPortal({ staff, zoneAssignments: initialZoneAssignments, settings, token }: RestoStaffPortalProps) {
    const [activeTab, setActiveTab] = useState<'tables' | 'orders' | 'tips' | 'profile'>('tables')
    const [dashboard, setDashboard] = useState<WaiterDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchDashboardData = async (isManual = false) => {
        if (isManual) setRefreshing(true)
        try {
            const data = await getWaiterDashboard(token)
            setDashboard(data)
        } catch (e) {
            console.error("Error fetching waiter dashboard:", e)
        } finally {
            setLoading(false)
            if (isManual) setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchDashboardData()

        // Realtime subscription
        if (staff?.organization_id) {
            const channel = supabase.channel(`resto-waiter-${staff.id}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'resto_table_sessions', filter: `organization_id=eq.${staff.organization_id}` },
                    (payload) => {
                        if (payload.new && (payload.new as any).status === 'payment_pending') {
                            playBillAlertSound()
                        }
                        fetchDashboardData()
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'resto_orders', filter: `organization_id=eq.${staff.organization_id}` },
                    () => {
                        fetchDashboardData()
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [token, staff?.organization_id])

    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Mesero'

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
            {/* Top Bar Header */}
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800 px-4 py-3 shadow-xs">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-pink to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-brand-pink/20">
                            {fullName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="font-black text-sm text-zinc-900 dark:text-white leading-tight">
                                {fullName}
                            </h1>
                            <p className="text-[11px] font-semibold text-zinc-400 capitalize flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {staff.role || 'Mesero'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchDashboardData(true)}
                            className={cn(
                                "p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all",
                                refreshing && "animate-spin text-brand-pink"
                            )}
                            title="Actualizar datos"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl text-xs font-black">
                            ${(dashboard?.todayTips || 0).toLocaleString('es-CO')}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 max-w-md w-full mx-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center p-12 text-zinc-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-brand-pink" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'tables' && (
                            <WaiterTablesView
                                tables={dashboard?.tables || []}
                                activeSessions={dashboard?.activeSessions || []}
                                zones={dashboard?.zones || []}
                                staffId={staff.id}
                            />
                        )}

                        {activeTab === 'orders' && (
                            <WaiterOrdersView
                                todayOrders={dashboard?.todayOrders || []}
                                activeSessions={dashboard?.activeSessions || []}
                            />
                        )}

                        {activeTab === 'tips' && (
                            <WaiterTipsSummary
                                token={token}
                                todayTips={dashboard?.todayTips || 0}
                            />
                        )}

                        {activeTab === 'profile' && (
                            <WaiterProfileView
                                staff={staff}
                                zones={dashboard?.zones || []}
                                zoneAssignments={initialZoneAssignments}
                            />
                        )}
                    </>
                )}
            </main>

            {/* Bottom Tab Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border-t border-zinc-200/60 dark:border-zinc-800 px-4 py-2 shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-around">
                    <button
                        onClick={() => setActiveTab('tables')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold",
                            activeTab === 'tables'
                                ? "text-brand-pink bg-brand-pink/10"
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <UtensilsCrossed className="w-5 h-5" />
                        <span>Mesas</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('orders')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold relative",
                            activeTab === 'orders'
                                ? "text-brand-pink bg-brand-pink/10"
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <ClipboardList className="w-5 h-5" />
                        <span>Pedidos</span>
                        {(dashboard?.todayOrders?.length || 0) > 0 && (
                            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-brand-pink animate-ping" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('tips')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold",
                            activeTab === 'tips'
                                ? "text-brand-pink bg-brand-pink/10"
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <Banknote className="w-5 h-5" />
                        <span>Propinas</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold",
                            activeTab === 'profile'
                                ? "text-brand-pink bg-brand-pink/10"
                                : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <User className="w-5 h-5" />
                        <span>Perfil</span>
                    </button>
                </div>
            </nav>
        </div>
    )
}
