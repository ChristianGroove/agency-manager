"use client"

import React, { useState, useEffect } from "react"
import Image from "next/image"
import { UtensilsCrossed, ClipboardList, Banknote, User, RefreshCw, KeyRound, Check, X, Loader2, Shield } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { supabase } from "@/modules/core/database/supabase"
import { getWaiterDashboard, WaiterDashboard, switchStaffByPin } from "@/modules/features/resto-orders/actions/resto-staff-actions"
import { WaiterTablesView } from "./WaiterTablesView"
import { WaiterOrdersView } from "./WaiterOrdersView"
import { WaiterTipsSummary } from "./WaiterTipsSummary"
import { WaiterProfileView } from "./WaiterProfileView"
import { playBillAlertSound } from "@/modules/features/resto-orders/components/resto-orders-view-manager"
import { toast } from "sonner"

interface RestoStaffPortalProps {
    staff: any
    zoneAssignments: any[]
    settings: any
    token: string
}

const ROLE_LABELS: Record<string, string> = {
    waiter: "Mesero",
    mesero: "Mesero",
    cajero: "Cajero",
    host: "Host / Anfitrión",
    bartender: "Bartender",
    cocinero: "Cocinero / Chef"
}

export function RestoStaffPortal({ staff, zoneAssignments: initialZoneAssignments, settings, token }: RestoStaffPortalProps) {
    const [activeTab, setActiveTab] = useState<'tables' | 'orders' | 'tips' | 'profile'>('tables')
    const [dashboard, setDashboard] = useState<WaiterDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // PIN Switch Modal State
    const [showPinModal, setShowPinModal] = useState(false)
    const [enteredPin, setEnteredPin] = useState("")
    const [validatingPin, setValidatingPin] = useState(false)

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

    useEffect(() => {
        // Enforce default light theme on public staff portal for fresh incognito sessions
        if (typeof window !== 'undefined') {
            const hasExplicitDark = localStorage.getItem('theme') === 'dark'
            if (!hasExplicitDark) {
                document.documentElement.classList.remove('dark')
            }
        }
    }, [])

    const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Mesero'
    const roleLabel = ROLE_LABELS[staff.role] || 'Mesero'
    const logoSrc = settings?.isotipo_url || settings?.portal_logo_url || settings?.logos?.favicon || '/pixy-isotipo.png'

    const handleKeyPress = (num: string) => {
        if (enteredPin.length < 6) {
            const next = enteredPin + num
            setEnteredPin(next)
        }
    }

    const handleDeleteKey = () => {
        setEnteredPin(prev => prev.slice(0, -1))
    }

    const handleSwitchPin = async (pinToSubmit?: string) => {
        const pin = pinToSubmit || enteredPin
        if (!pin || pin.length < 4) {
            toast.error("Ingresa tu PIN de 4 dígitos")
            return
        }

        setValidatingPin(true)
        try {
            const res = await switchStaffByPin(staff.organization_id, pin)
            if (!res.success || !res.token) {
                toast.error(res.error || "PIN incorrecto")
                setEnteredPin("")
                return
            }

            toast.success(`Sesión cambiada a ${res.staff.first_name}`)
            setShowPinModal(false)
            setEnteredPin("")
            window.location.href = `/portal/${res.token}`
        } catch (e: any) {
            console.error(e)
            toast.error("Error al cambiar de sesión")
        } finally {
            setValidatingPin(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans">
            {/* Top Bar Header */}
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-zinc-800 px-4 py-3 shadow-xs">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Official Isotype Logo */}
                        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/80 p-1 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                            <img
                                src={logoSrc}
                                alt="Isotipo"
                                className="w-7 h-7 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                                {fullName}
                            </h1>
                            <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400 capitalize flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                {roleLabel}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* PIN Lock / Switch User Button */}
                        <button
                            onClick={() => {
                                setEnteredPin("")
                                setShowPinModal(true)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700 transition-all cursor-pointer"
                            title="Cambiar de usuario con PIN (Tablet Compartida)"
                        >
                            <KeyRound className="w-4 h-4 text-sky-500" />
                            <span className="hidden sm:inline">PIN</span>
                        </button>

                        <button
                            onClick={() => fetchDashboardData(true)}
                            className={cn(
                                "p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer",
                                refreshing && "animate-spin text-sky-500"
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
                    <div className="flex items-center justify-center p-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
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

            {/* PIN Switch Modal (Teclado Numérico en Pantalla) */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setShowPinModal(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-xs w-full border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-sky-500" />
                                Cambiar de Usuario
                            </h3>
                            <button onClick={() => setShowPinModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                            Ingresa tu PIN de 4 dígitos para activar tus mesas y comandas.
                        </p>

                        {/* PIN Dots Indicator */}
                        <div className="flex items-center justify-center gap-3 py-2">
                            {[0, 1, 2, 3].map((idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 transition-all",
                                        enteredPin.length > idx
                                            ? "bg-sky-500 border-sky-500 scale-110 shadow-sm shadow-sky-500/30"
                                            : "border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Onscreen Keypad Grid */}
                        <div className="grid grid-cols-3 gap-2.5 pt-2">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleKeyPress(num)}
                                    className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-black text-lg shadow-xs active:scale-95 transition-all cursor-pointer"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleDeleteKey}
                                className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 font-bold text-sm flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                                title="Borrar"
                            >
                                ⌫
                            </button>
                            <button
                                onClick={() => handleKeyPress('0')}
                                className="h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-black text-lg shadow-xs active:scale-95 transition-all cursor-pointer"
                            >
                                0
                            </button>
                            <button
                                onClick={() => handleSwitchPin()}
                                disabled={validatingPin || enteredPin.length < 4}
                                className="h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-sky-500/20 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
                                title="Ingresar"
                            >
                                {validatingPin ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Tab Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-zinc-800 px-4 py-2 shadow-lg">
                <div className="max-w-md mx-auto flex items-center justify-around">
                    <button
                        onClick={() => setActiveTab('tables')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold cursor-pointer",
                            activeTab === 'tables'
                                ? "text-sky-500 bg-sky-500/10"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <UtensilsCrossed className="w-5 h-5" />
                        <span>Mesas</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('orders')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold relative cursor-pointer",
                            activeTab === 'orders'
                                ? "text-sky-500 bg-sky-500/10"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <ClipboardList className="w-5 h-5" />
                        <span>Pedidos</span>
                        {(dashboard?.todayOrders?.length || 0) > 0 && (
                            <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('tips')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold cursor-pointer",
                            activeTab === 'tips'
                                ? "text-sky-500 bg-sky-500/10"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <Banknote className="w-5 h-5" />
                        <span>Propinas</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={cn(
                            "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-xs font-bold cursor-pointer",
                            activeTab === 'profile'
                                ? "text-sky-500 bg-sky-500/10"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
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
