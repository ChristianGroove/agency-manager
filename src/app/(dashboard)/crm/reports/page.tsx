'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
    Users, DollarSign, TrendingUp, MessageSquare, Target, Award,
    BarChart3, PieChart, Activity, Clock, ArrowUpRight, ArrowDownRight,
    RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    getCRMStats, getLeadsBySource, getLeadsByStatus, getRecentActivity, getAgentPerformance,
    type CRMStats, type LeadsBySource, type LeadsByStatus, type RecentActivity, type AgentPerformance
} from '@/modules/core/crm/analytics-actions'

import { SectionHeader } from "@/components/layout/section-header"

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('30')
    const [stats, setStats] = useState<CRMStats | null>(null)
    const [sourceData, setSourceData] = useState<LeadsBySource[]>([])
    const [funnelData, setFunnelData] = useState<LeadsByStatus[]>([])
    const [activities, setActivities] = useState<RecentActivity[]>([])
    const [agents, setAgents] = useState<AgentPerformance[]>([])

    useEffect(() => {
        loadData()
    }, [timeRange])

    async function loadData() {
        setLoading(true)
        const days = parseInt(timeRange)

        const [statsRes, sourceRes, funnelRes, activityRes, agentRes] = await Promise.all([
            getCRMStats(days),
            getLeadsBySource(days),
            getLeadsByStatus(),
            getRecentActivity(10),
            getAgentPerformance()
        ])

        if (statsRes.success) setStats(statsRes.stats!)
        if (sourceRes.success) setSourceData(sourceRes.data!)
        if (funnelRes.success) setFunnelData(funnelRes.data!)
        if (activityRes.success) setActivities(activityRes.data!)
        if (agentRes.success) setAgents(agentRes.data!)

        setLoading(false)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
    }

    const statusLabels: Record<string, string> = {
        new: 'Nuevos',
        contacted: 'Contactados',
        qualified: 'Calificados',
        negotiation: 'Negociación',
        won: 'Ganados',
        lost: 'Perdidos'
    }

    const statusColors: Record<string, string> = {
        new: 'bg-blue-500',
        contacted: 'bg-yellow-500',
        qualified: 'bg-purple-500',
        negotiation: 'bg-orange-500',
        won: 'bg-green-500',
        lost: 'bg-red-500'
    }

    return (
        <div className="h-full space-y-6 overflow-auto">
            {/* Header */}
            <SectionHeader
                title="Analytics Hub"
                subtitle="Centro de inteligencia y métricas de crecimiento"
                icon={BarChart3}
                action={
                    <div className="flex items-center gap-3">
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Últimos 7 días</SelectItem>
                                <SelectItem value="30">Últimos 30 días</SelectItem>
                                <SelectItem value="90">Últimos 90 días</SelectItem>
                                <SelectItem value="365">Este año</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
                            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Leads</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-white mt-1">
                                {loading ? '...' : stats?.totalLeads.toLocaleString()}
                            </p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                                +{stats?.newLeadsThisMonth || 0} este periodo
                            </p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-2xl">
                            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Valor Pipeline</p>
                            <p className="text-3xl font-bold text-emerald-900 dark:text-white mt-1">
                                {loading ? '...' : formatCurrency(stats?.pipelineValue || 0)}
                            </p>
                            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">
                                Oportunidades abiertas
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Tasa de Conversión</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-white mt-1">
                                {loading ? '...' : `${stats?.conversionRate || 0}%`}
                            </p>
                            <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                                Promedio: {formatCurrency(stats?.avgDealSize || 0)}/deal
                            </p>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-2xl">
                            <Target className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Conversaciones Abiertas</p>
                            <p className="text-3xl font-bold text-orange-900 dark:text-white mt-1">
                                {loading ? '...' : stats?.openConversations || 0}
                            </p>
                            <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                                Pendientes de respuesta
                            </p>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-2xl">
                            <MessageSquare className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Funnel Chart */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Embudo de Ventas</h3>
                            <p className="text-sm text-muted-foreground">Distribución por etapa</p>
                        </div>
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-4">
                        {funnelData.map((stage, idx) => {
                            const maxCount = Math.max(...funnelData.map(s => s.count))
                            const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
                            return (
                                <div key={stage.status} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{statusLabels[stage.status] || stage.status}</span>
                                        <span className="text-muted-foreground">{stage.count} ({formatCurrency(stage.value)})</span>
                                    </div>
                                    <div className="h-8 bg-gray-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-lg transition-all duration-500", statusColors[stage.status])}
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        {funnelData.length === 0 && !loading && (
                            <div className="py-8 text-center text-muted-foreground">
                                No hay datos de embudo disponibles
                            </div>
                        )}
                    </div>
                </Card>

                {/* Source Distribution */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Fuentes de Leads</h3>
                            <p className="text-sm text-muted-foreground">Origen de los contactos</p>
                        </div>
                        <PieChart className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                        {sourceData.slice(0, 8).map((source, idx) => {
                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500']
                            return (
                                <div key={source.source} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-3 h-3 rounded-full", colors[idx % colors.length])} />
                                        <span className="font-medium capitalize">{source.source}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground">{source.count}</span>
                                        <Badge variant="secondary" className="font-mono">{source.percentage}%</Badge>
                                    </div>
                                </div>
                            )
                        })}
                        {sourceData.length === 0 && !loading && (
                            <div className="py-8 text-center text-muted-foreground">
                                No hay datos de fuentes disponibles
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Agent Leaderboard */}
                <Card className="p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Rendimiento del Equipo</h3>
                            <p className="text-sm text-muted-foreground">Top performers por valor cerrado</p>
                        </div>
                        <Award className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                        {agents.slice(0, 5).map((agent, idx) => (
                            <div key={agent.agentId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                                        idx === 0 ? "bg-yellow-500" : idx === 1 ? "bg-gray-400" : idx === 2 ? "bg-orange-600" : "bg-gray-300"
                                    )}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-medium">{agent.agentName}</p>
                                        <p className="text-xs text-muted-foreground">{agent.leadsAssigned} leads asignados</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">{formatCurrency(agent.totalValue)}</p>
                                    <p className="text-xs text-muted-foreground">{agent.dealsWon} deals ({agent.conversionRate}%)</p>
                                </div>
                            </div>
                        ))}
                        {agents.length === 0 && !loading && (
                            <div className="py-8 text-center text-muted-foreground">
                                No hay datos de equipo disponibles
                            </div>
                        )}
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-lg">Actividad Reciente</h3>
                            <p className="text-sm text-muted-foreground">Últimos movimientos</p>
                        </div>
                        <Activity className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {activities.map(activity => (
                                <div key={activity.id} className="flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        activity.type === 'deal_won' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                        {activity.type === 'deal_won' ? <TrendingUp className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{activity.leadName}</p>
                                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && !loading && (
                                <div className="py-8 text-center text-muted-foreground">
                                    Sin actividad reciente
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>
        </div>
    )
}
