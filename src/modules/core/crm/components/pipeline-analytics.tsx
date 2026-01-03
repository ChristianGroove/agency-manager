"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Trophy, XCircle, Clock, Target, Users } from "lucide-react"
import { Lead } from "@/types"
import { PipelineStage } from "../pipeline-actions"
import { useMemo } from "react"

interface PipelineAnalyticsProps {
    leads: Lead[]
    stages: PipelineStage[]
}

export function PipelineAnalytics({ leads, stages }: PipelineAnalyticsProps) {
    const metrics = useMemo(() => {
        const total = leads.length
        const wonLeads = leads.filter(l => l.status === 'won' || l.status === 'converted')
        const lostLeads = leads.filter(l => l.status === 'lost')
        const activeLeads = leads.filter(l => l.status !== 'won' && l.status !== 'converted' && l.status !== 'lost')

        const conversionRate = total > 0 ? ((wonLeads.length / total) * 100).toFixed(1) : '0'
        const lossRate = total > 0 ? ((lostLeads.length / total) * 100).toFixed(1) : '0'

        // Calculate average leads per stage
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
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analítica del Pipeline</h3>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Conversion Rate */}
                <Card className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
                            <p className="text-3xl font-bold text-green-600">{metrics.conversionRate}%</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {metrics.won} de {metrics.total} leads
                            </p>
                        </div>
                        <Trophy className="h-10 w-10 text-green-500 opacity-20" />
                    </div>
                </Card>

                {/* Loss Rate */}
                <Card className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Tasa de Pérdida</p>
                            <p className="text-3xl font-bold text-red-600">{metrics.lossRate}%</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {metrics.lost} leads perdidos
                            </p>
                        </div>
                        <XCircle className="h-10 w-10 text-red-500 opacity-20" />
                    </div>
                </Card>

                {/* Active Pipeline */}
                <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Pipeline Activo</p>
                            <p className="text-3xl font-bold text-blue-600">{metrics.active}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Leads en progreso
                            </p>
                        </div>
                        <Users className="h-10 w-10 text-blue-500 opacity-20" />
                    </div>
                </Card>
            </div>

            {/* Leads per Stage Distribution */}
            <Card className="p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Distribución por Etapa
                </h4>
                <div className="space-y-3">
                    {metrics.leadsPerStage.map((item) => {
                        const percentage = metrics.total > 0 ? ((item.count / metrics.total) * 100).toFixed(0) : '0'
                        return (
                            <div key={item.stage} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                        <span className="font-medium">{item.stage}</span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        {item.count} leads ({percentage}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${item.color}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* Quick Insights */}
            {metrics.total > 0 && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start gap-3">
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-semibold text-blue-900">Insights Rápidos</p>
                            <ul className="text-sm text-blue-800 space-y-1">
                                {metrics.conversionRate >= '20' && (
                                    <li>✓ Excelente tasa de conversión ({metrics.conversionRate}%)</li>
                                )}
                                {metrics.active > metrics.won && (
                                    <li>• Tienes más leads activos ({metrics.active}) que ganados ({metrics.won})</li>
                                )}
                                {metrics.lossRate > '30' && (
                                    <li>⚠ Alta tasa de pérdida ({metrics.lossRate}%) - revisa tu proceso de calificación</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}
