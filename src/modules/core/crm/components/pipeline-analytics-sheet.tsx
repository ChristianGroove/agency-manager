"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Trophy, XCircle, Users, Target, BarChart3 } from "lucide-react"
import { Lead } from "@/types"
import { PipelineStage } from "../pipeline-actions"
import { useMemo } from "react"

interface PipelineAnalyticsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    leads: Lead[]
    stages: PipelineStage[]
}

export function PipelineAnalyticsSheet({ open, onOpenChange, leads, stages }: PipelineAnalyticsSheetProps) {
    const metrics = useMemo(() => {
        const total = leads.length
        const wonLeads = leads.filter(l => l.status === 'won' || l.status === 'converted')
        const lostLeads = leads.filter(l => l.status === 'lost')
        const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'converted' && l.status !== 'lost')

        const conversionRate = total > 0 ? ((wonLeads.length / total) * 100).toFixed(1) : '0'
        const lossRate = total > 0 ? ((lostLeads.length / total) * 100).toFixed(1) : '0'

        const leadsPerStage = stages.map(stage => ({
            stage: stage.name,
            count: leads.filter(l => l.status === stage.status_key).length,
            color: stage.color
        })).filter(s => s.count > 0)

        return {
            total,
            won: wonLeads.length,
            lost: lostLeads.length,
            active: activeLeads.length,
            conversionRate,
            lossRate,
            leadsPerStage,
        }
    }, [leads, stages])

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[500px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-900 dark:bg-white">
                                <BarChart3 className="h-4 w-4 text-white dark:text-slate-900" />
                            </div>
                            Analítica del Pipeline
                        </SheetTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Métricas de conversión y distribución</p>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Summary Card */}
                        <div className="bg-slate-900 dark:bg-zinc-800 text-white p-6 rounded-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-32 bg-slate-700/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                                        <Target className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Resumen General</h3>
                                        <p className="text-slate-400 text-sm">{metrics.total} leads en el pipeline</p>
                                    </div>
                                </div>

                                {/* Metrics Row */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <Trophy className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold">{metrics.conversionRate}%</p>
                                        <p className="text-xs text-slate-400">Conversión</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <Users className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold">{metrics.active}</p>
                                        <p className="text-xs text-slate-400">Activos</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                                        <XCircle className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                                        <p className="text-2xl font-bold">{metrics.lossRate}%</p>
                                        <p className="text-xs text-slate-400">Pérdida</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Stats */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Detalle</h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-zinc-700 rounded-lg">
                                            <Trophy className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Ganados</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.won}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-zinc-700 rounded-lg">
                                            <XCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Perdidos</p>
                                            <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.lost}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Distribution by Stage */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Distribución por Etapa</h4>

                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-4">
                                {metrics.leadsPerStage.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                        No hay leads en el pipeline
                                    </p>
                                ) : (
                                    metrics.leadsPerStage.map((item) => {
                                        const percentage = metrics.total > 0 ? ((item.count / metrics.total) * 100).toFixed(0) : '0'
                                        return (
                                            <div key={item.stage} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">{item.stage}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-mono text-xs bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300">
                                                        {item.count} ({percentage}%)
                                                    </Badge>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-zinc-700 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${item.color} transition-all duration-500`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Insights */}
                        {metrics.total > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Insights</h4>

                                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-slate-100 dark:bg-zinc-700 rounded-lg shrink-0">
                                            <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                            {Number(metrics.conversionRate) >= 20 && (
                                                <li className="flex items-center gap-2">
                                                    <span className="text-emerald-600">✓</span>
                                                    Excelente tasa de conversión ({metrics.conversionRate}%)
                                                </li>
                                            )}
                                            {Number(metrics.conversionRate) < 10 && Number(metrics.conversionRate) > 0 && (
                                                <li className="flex items-center gap-2">
                                                    <span className="text-amber-600">!</span>
                                                    Baja conversión - considera mejorar calificación
                                                </li>
                                            )}
                                            {metrics.active > metrics.won && (
                                                <li className="flex items-center gap-2">
                                                    <span className="text-slate-400">•</span>
                                                    {metrics.active} leads activos esperando cierre
                                                </li>
                                            )}
                                            {Number(metrics.lossRate) > 30 && (
                                                <li className="flex items-center gap-2">
                                                    <span className="text-red-600">⚠</span>
                                                    Alta pérdida ({metrics.lossRate}%) - revisa el proceso
                                                </li>
                                            )}
                                            {Number(metrics.conversionRate) < 20 && Number(metrics.lossRate) <= 30 && metrics.active <= metrics.won && (
                                                <li className="flex items-center gap-2">
                                                    <span className="text-slate-400">•</span>
                                                    Pipeline en estado normal
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
