"use client"

import React, { useState, useEffect } from "react"
import { Banknote, Calendar, TrendingUp, DollarSign, Award, Loader2 } from "lucide-react"
import { getWaiterTipsSummary, WaiterTipsSummary as TipsSummaryType } from "@/modules/features/resto-orders/actions/resto-staff-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface WaiterTipsSummaryProps {
    token: string
    todayTips: number
}

export function WaiterTipsSummary({ token, todayTips: initialTodayTips }: WaiterTipsSummaryProps) {
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
    const [loading, setLoading] = useState(false)
    const [summary, setSummary] = useState<TipsSummaryType | null>(null)

    useEffect(() => {
        async function fetchTips() {
            setLoading(true)
            try {
                const res = await getWaiterTipsSummary(token, period)
                setSummary(res)
            } catch (e) {
                console.error("Error fetching tips:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchTips()
    }, [token, period])

    return (
        <div className="space-y-5 pb-24">
            {/* Period Selector Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                {(['today', 'week', 'month'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            period === p
                                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm"
                                : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                        }`}
                    >
                        {p === 'today' ? 'Hoy' : p === 'week' ? 'Esta Semana' : 'Este Mes'}
                    </button>
                ))}
            </div>

            {/* Featured Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-3xl p-6 shadow-lg shadow-emerald-500/20 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-200" />
                        Propinas Recaudadas
                    </span>
                    <Banknote className="w-6 h-6 text-emerald-200/80" />
                </div>

                <div className="space-y-1">
                    <div className="text-3xl font-black tracking-tight">
                        ${(summary?.totalTips || 0).toLocaleString('es-CO')}
                    </div>
                    <p className="text-xs text-emerald-100 font-medium">
                        {summary?.tipCount || 0} sesiones con propina registrada
                    </p>
                </div>
            </div>

            {/* Tips Breakdown List */}
            <div className="space-y-3">
                <h3 className="font-black text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2 px-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Historial de Propinas
                </h3>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                    </div>
                ) : !summary || summary.tipsBySession.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-400 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
                        No hay propinas registradas en este período.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {summary.tipsBySession.map((tip) => (
                            <div
                                key={tip.sessionId}
                                className="flex items-center justify-between p-3.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-zinc-200/60 dark:border-zinc-800 shadow-xs"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                                        Mesa {tip.tableIdentifier || '?'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-zinc-900 dark:text-white">
                                            Mesa #{tip.tableIdentifier}
                                        </div>
                                        <div className="text-[11px] text-zinc-400">
                                            {format(new Date(tip.date), "d MMM, h:mm a", { locale: es })}
                                        </div>
                                    </div>
                                </div>

                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                    +${tip.tipAmount.toLocaleString('es-CO')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
