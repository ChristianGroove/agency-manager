
'use client'

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Clock, PlayCircle, Calendar as CalendarIcon, TrendingUp } from "lucide-react"
import { getOperationsMetrics } from "../actions/operation-actions"

interface CleaningStatsWidgetProps {
    title?: string
}

export function CleaningStatsWidget({ title }: CleaningStatsWidgetProps) {
    const [metrics, setMetrics] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadMetrics()
    }, [])

    const loadMetrics = async () => {
        try {
            const data = await getOperationsMetrics(new Date().toISOString())
            setMetrics(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
                ))}
            </div>
        )
    }

    if (!metrics) return null

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Trabajos Hoy</CardTitle>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.total_jobs}</div>
                    <p className="text-xs text-muted-foreground">
                        Programados para hoy
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">En Curso</CardTitle>
                    <PlayCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{metrics.in_progress}</div>
                    <p className="text-xs text-muted-foreground">
                        Actualmente activos
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completados</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
                    <p className="text-xs text-muted-foreground">
                        Finalizados con éxito
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">PDTES Asignar</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{metrics.pending}</div>
                    <p className="text-xs text-muted-foreground">
                        Requieren atención
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
