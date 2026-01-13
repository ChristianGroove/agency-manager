"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, MessageCircle, TrendingUp, Crown, Handshake, User, Loader2 } from "lucide-react"
import { getHierarchyMetrics, type HierarchyMetrics, type HierarchyStats } from "../analytics-actions"
import { cn } from "@/lib/utils"

/**
 * HierarchyAnalytics
 * 
 * Dashboard component showing aggregated statistics across
 * the organization hierarchy (Platform → Reseller → Client).
 * 
 * Features:
 * - Total counts by entity type
 * - Breakdown by hierarchy level
 * - Visual indicators for each level
 */
export function HierarchyAnalytics() {
    const [metrics, setMetrics] = useState<HierarchyMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadMetrics()
    }, [])

    const loadMetrics = async () => {
        setLoading(true)
        const result = await getHierarchyMetrics()
        if (result.data) {
            setMetrics(result.data)
        } else {
            setError(result.error)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                {error}
            </div>
        )
    }

    if (!metrics) return null

    // Level icons and colors
    const levelConfig: Record<string, { icon: any, color: string, bgColor: string }> = {
        platform: { icon: Crown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
        reseller: { icon: Handshake, color: 'text-blue-600', bgColor: 'bg-blue-100' },
        operator: { icon: Building2, color: 'text-amber-600', bgColor: 'bg-amber-100' },
        client: { icon: User, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Organizaciones"
                    value={metrics.totalOrganizations}
                    icon={Building2}
                    description="Total activas en la plataforma"
                    color="purple"
                />
                <MetricCard
                    title="Leads"
                    value={metrics.totalLeads}
                    icon={Users}
                    description="Leads totales en el CRM"
                    color="blue"
                />
                <MetricCard
                    title="Conversaciones"
                    value={metrics.totalConversations}
                    icon={MessageCircle}
                    description="Chats activos e históricos"
                    color="green"
                />
                <MetricCard
                    title="Crecimiento"
                    value={`+${metrics.statsByLevel.reduce((a, b) => a + b.count, 0)}`}
                    icon={TrendingUp}
                    description="Organizaciones este período"
                    color="amber"
                />
            </div>

            {/* Hierarchy Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Distribución por Nivel</CardTitle>
                    <CardDescription>
                        Organizaciones agrupadas por tipo en la jerarquía
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {metrics.statsByLevel.map(stat => {
                            const config = levelConfig[stat.level] || levelConfig.client
                            const Icon = config.icon

                            return (
                                <div
                                    key={stat.level}
                                    className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-white to-gray-50 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-3 rounded-xl",
                                            config.bgColor
                                        )}>
                                            <Icon className={cn("h-5 w-5", config.color)} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold capitalize">{stat.level}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {stat.activeCount} activos, {stat.suspendedCount} suspendidos
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold">{stat.count}</span>
                                        <Badge variant="secondary" className="ml-2">
                                            {Math.round((stat.count / metrics.totalOrganizations) * 100)}%
                                        </Badge>
                                    </div>
                                </div>
                            )
                        })}

                        {metrics.statsByLevel.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground">
                                No hay datos de jerarquía disponibles
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// Helper component for metric cards
function MetricCard({
    title,
    value,
    icon: Icon,
    description,
    color
}: {
    title: string
    value: string | number
    icon: any
    description: string
    color: 'purple' | 'blue' | 'green' | 'amber'
}) {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600',
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        amber: 'bg-amber-100 text-amber-600',
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className={cn("p-3 rounded-xl", colorClasses[color])}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-3xl font-bold">{value}</span>
                </div>
                <div className="mt-4">
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
            </CardContent>
        </Card>
    )
}
