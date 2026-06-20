'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { useMemo } from "react"

interface ExecutionsChartProps {
    data: any[]
}

export function ExecutionsChart({ data }: ExecutionsChartProps) {
    const chartData = useMemo(() => {
        // Group by date (DD/MM) and count status
        const grouped: Record<string, { date: string, success: number, failed: number }> = {}

        data.forEach(item => {
            if (!item.started_at) return
            const date = new Date(item.started_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })

            if (!grouped[date]) {
                grouped[date] = { date, success: 0, failed: 0 }
            }

            if (item.status === 'completed') grouped[date].success++
            else if (item.status === 'failed') grouped[date].failed++
        })

        // Sort by date (assuming simple string sort works for DD/MM within same year, strictly speaking parsing is safer but this is MVP)
        // Reverse because input is typically DESC
        return Object.values(grouped).reverse()
    }, [data])

    if (data.length === 0) {
        return (
            <Card className="col-span-4 h-[350px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos suficientes para mostrar el gráfico</p>
            </Card>
        )
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Resumen de Ejecuciones</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar
                            dataKey="success"
                            name="Exitosos"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                            stackId="a"
                        />
                        <Bar
                            dataKey="failed"
                            name="Fallidos"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                            stackId="a"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
