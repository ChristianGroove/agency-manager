'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react"

interface PerformanceStatsProps {
    stats: {
        total: number
        success: number
        failed: number
        avgDuration: number
    }
}

export function PerformanceStats({ stats }: PerformanceStatsProps) {
    const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0'
    const formattedDuration = stats.avgDuration < 1000
        ? `${stats.avgDuration.toFixed(0)} ms`
        : `${(stats.avgDuration / 1000).toFixed(2)} s`

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Ejecuciones
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                        En total
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Tasa de Éxito
                    </CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.success} completados
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Fallidos
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.failed}</div>
                    <p className="text-xs text-muted-foreground">
                        Requieren atención
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Duración Promedio
                    </CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formattedDuration}</div>
                    <p className="text-xs text-muted-foreground">
                        Por ejecución exitosa
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
