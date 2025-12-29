"use client"

import { useEffect, useState } from "react"
import { getOperationsMetrics } from "../../actions/metrics-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

export function OperationsDashboard() {
    const [metrics, setMetrics] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadMetrics()
        // Refresh every 60 seconds
        const interval = setInterval(loadMetrics, 60000)
        return () => clearInterval(interval)
    }, [])

    const loadMetrics = async () => {
        setIsLoading(true)
        try {
            const data = await getOperationsMetrics()
            setMetrics(data)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading && !metrics) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="h-20 bg-gray-100 animate-pulse rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    if (!metrics) return null

    const cards = [
        {
            title: "Trabajos Hoy",
            value: metrics.total,
            icon: Briefcase,
            color: "text-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            title: "En Curso",
            value: metrics.inProgress,
            icon: Clock,
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        },
        {
            title: "Completados",
            value: metrics.completed,
            icon: CheckCircle,
            color: "text-green-600",
            bgColor: "bg-green-50"
        },
        {
            title: "Pendientes",
            value: metrics.pending,
            icon: AlertCircle,
            color: "text-gray-600",
            bgColor: "bg-gray-50"
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <Card key={card.title} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <div className={`text-3xl font-bold ${card.color}`}>
                                    {card.value}
                                </div>
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {card.value === 0 ? 'Ninguno' : card.value === 1 ? '1 trabajo' : `${card.value} trabajos`}
                            </p>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
