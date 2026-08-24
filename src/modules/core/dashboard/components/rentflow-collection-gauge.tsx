"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    ShieldCheck,
    ArrowUpRight,
    TrendingUp
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface RentFlowCollectionGaugeProps {
    totalExpectedRent: number
    grossCollected: number
    collectionRate: number
    lateAmount: number
    pendingAmount: number
    currentPeriod?: string
}

export function RentFlowCollectionGauge({
    totalExpectedRent = 0,
    grossCollected = 0,
    collectionRate = 0,
    lateAmount = 0,
    pendingAmount = 0,
    currentPeriod
}: RentFlowCollectionGaugeProps) {
    const router = useRouter()

    // Format Period (e.g. 2026-08 -> Agosto 2026)
    const formattedPeriod = React.useMemo(() => {
        if (!currentPeriod) return "Mes en curso"
        const [year, month] = currentPeriod.split("-")
        const date = new Date(Number(year), Number(month) - 1, 1)
        return date.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    }, [currentPeriod])

    // Math percentages for bar
    const total = totalExpectedRent > 0 ? totalExpectedRent : 1
    const paidPct = Math.min(100, Math.round((grossCollected / total) * 100))
    const latePct = Math.min(100 - paidPct, Math.round((lateAmount / total) * 100))
    const pendingPct = Math.max(0, 100 - paidPct - latePct)

    const formatCOP = (val: number) => `$ ${Math.round(val || 0).toLocaleString("es-CO")}`

    return (
        <Card className="glass-card p-6 md:p-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-white/5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Semáforo de Cobranza
                        </span>
                        <Badge variant="outline" className="text-[11px] font-normal capitalize px-2 py-0 border-gray-200 dark:border-white/10 text-muted-foreground">
                            {formattedPeriod}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
                        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Recaudo Mensual de Rentas
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            (Total esperado: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatCOP(totalExpectedRent)}</span>)
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push("/rentals?tab=collection")}
                        className="rounded-lg h-9 text-xs font-medium gap-1.5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer shadow-none"
                    >
                        <span>Gestionar Cobros</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {/* Live Progress Bar */}
            <div className="py-5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        Efectividad de recaudo
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        {paidPct}% recaudado
                    </span>
                </div>

                {/* Segmented Bar */}
                <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex p-0.5 gap-0.5">
                    {paidPct > 0 && (
                        <div
                            style={{ width: `${paidPct}%` }}
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            title={`Al Día: ${paidPct}%`}
                        />
                    )}
                    {pendingPct > 0 && (
                        <div
                            style={{ width: `${pendingPct}%` }}
                            className="h-full rounded-full bg-amber-500/80 transition-all duration-500"
                            title={`Por Vencer: ${pendingPct}%`}
                        />
                    )}
                    {latePct > 0 && (
                        <div
                            style={{ width: `${latePct}%` }}
                            className="h-full rounded-full bg-rose-500 transition-all duration-500"
                            title={`En Mora: ${latePct}%`}
                        />
                    )}
                </div>
            </div>

            {/* 4 Semáforo Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* 1. Al Día / Recaudado */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Al Día
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            {paidPct}%
                        </span>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCOP(grossCollected)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Disponible para dispersión
                        </p>
                    </div>
                </div>

                {/* 2. Por Vencer / En Plazo */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Por Vencer
                        </span>
                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                            {pendingPct}%
                        </span>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCOP(pendingAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Próximos a vencer este mes
                        </p>
                    </div>
                </div>

                {/* 3. En Mora / Cartera Vencida */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            En Mora
                        </span>
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                            {latePct}%
                        </span>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCOP(lateAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {lateAmount > 0 ? "Requiere gestión de cobro" : "Sin cartera vencida"}
                        </p>
                    </div>
                </div>

                {/* 4. Garantía & Póliza Colectiva */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            Pólizas Colectivas
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                            Asegurado
                        </span>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            0 Siniestros
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Cobertura de fianza al día
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    )
}
