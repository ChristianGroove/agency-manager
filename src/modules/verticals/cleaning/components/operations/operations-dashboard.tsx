
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getOperationsMetrics } from "../../actions/operation-actions"
import { Activity, CheckCircle2, Clock, DollarSign, ListTodo } from "lucide-react"

export function OperationsDashboard() {
    const [metrics, setMetrics] = useState({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        revenue: 0
    })
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadMetrics() {
            try {
                // Use today's date
                const today = new Date().toISOString()
                const data = await getOperationsMetrics(today)
                if (data) {
                    setMetrics(data)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setIsLoading(false)
            }
        }
        loadMetrics()
    }, [])

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Trabajos Hoy
                    </CardTitle>
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.total}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.completed} completados
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        En Curso
                    </CardTitle>
                    <Activity className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{metrics.in_progress}</div>
                    <p className="text-xs text-muted-foreground">
                        Operativos activos ahora
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Pendientes
                    </CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{metrics.pending}</div>
                    <p className="text-xs text-muted-foreground">
                        Por iniciar hoy
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Ingresos Estimados
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                        ${metrics.revenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Total proyectado hoy
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
