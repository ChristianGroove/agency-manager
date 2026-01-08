"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BadgeDollarSign, Cpu, TrendingUp, AlertCircle, BarChart3 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface UsageStats {
    totalTokens: number
    estimatedCost: number
    byTask: { task: string; tokens: number; calls: number }[]
    byProvider: { provider: string; tokens: number; successRate: number }[]
}

export function AIUsageAnalytics() {
    const [stats, setStats] = useState<UsageStats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/ai/usage-stats')
            const data = await res.json()

            if (data.success) {
                setStats(data.stats)
            } else {
                setError(data.error || 'Error al cargar estadísticas')
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Cargando estadísticas de uso...
            </div>
        )
    }

    if (error) {
        return (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                <CardContent className="py-4 flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </CardContent>
            </Card>
        )
    }

    if (!stats) return null

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            Tokens Totales
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {stats.totalTokens.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">últimos 30 días</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <BadgeDollarSign className="h-3 w-3" />
                            Costo Estimado
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-emerald-600">
                            ${stats.estimatedCost.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">USD aproximado</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Llamadas API
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">
                            {stats.byTask.reduce((acc, t) => acc + t.calls, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">total de requests</p>
                    </CardContent>
                </Card>
            </div>

            {/* By Task Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Uso por Tipo de Tarea
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarea</TableHead>
                                <TableHead className="text-right">Llamadas</TableHead>
                                <TableHead className="text-right">Tokens</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.byTask.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                        No hay datos de uso aún
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.byTask.map((item) => (
                                    <TableRow key={item.task}>
                                        <TableCell className="font-mono text-xs">
                                            {item.task}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.calls.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.tokens.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* By Provider */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Uso por Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Proveedor</TableHead>
                                <TableHead className="text-right">Tokens</TableHead>
                                <TableHead className="text-right">Success Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.byProvider.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                        No hay datos aún
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stats.byProvider.map((item) => (
                                    <TableRow key={item.provider}>
                                        <TableCell className="font-medium capitalize">
                                            {item.provider}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.tokens.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={item.successRate >= 95 ? 'text-emerald-600' : 'text-amber-600'}>
                                                {item.successRate.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
