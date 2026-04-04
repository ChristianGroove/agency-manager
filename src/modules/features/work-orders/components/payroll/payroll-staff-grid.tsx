"use client"

import { useEffect, useState } from "react"
import { getStaffPayrollSummary, getPayrollStats, DateFilter } from "../../actions/payroll-summary-actions"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StaffPayrollCard } from "./staff-payroll-card"
import { Loader2, Calendar, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayrollStaffGridProps {
    viewMode?: 'list' | 'grid'
}

export function PayrollStaffGrid({ viewMode = 'list' }: PayrollStaffGridProps) {
    const [payrollMode, setPayrollMode] = useState<'period' | 'debt'>('debt')
    const [filter, setFilter] = useState<DateFilter>('month')
    const [staff, setStaff] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [filter, payrollMode])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const [staffData, statsData] = await Promise.all([
                getStaffPayrollSummary(filter, payrollMode),
                getPayrollStats(filter, payrollMode)
            ])
            setStaff(staffData)
            setStats(statsData)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <Button
                        variant={payrollMode === 'debt' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPayrollMode('debt')}
                        className="gap-2"
                    >
                        <DollarSign className="h-4 w-4" />
                        Deuda Acumulada
                    </Button>
                    <Button
                        variant={payrollMode === 'period' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPayrollMode('period')}
                        className="gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        Ver Período
                    </Button>
                </div>

                {/* Period Filter - only visible in period mode */}
                {payrollMode === 'period' && (
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as DateFilter)}>
                        <TabsList>
                            <TabsTrigger value="today">Hoy</TabsTrigger>
                            <TabsTrigger value="yesterday">Ayer</TabsTrigger>
                            <TabsTrigger value="week">Semana</TabsTrigger>
                            <TabsTrigger value="month">Mes</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Total Adeudado</div>
                            <div className="text-2xl font-bold text-red-600">
                                ${stats.totalOwed.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Total Horas</div>
                            <div className="text-2xl font-bold">{stats.totalHours}h</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Con Deuda</div>
                            <div className="text-2xl font-bold">
                                {stats.staffWithDebt}/{stats.totalStaff}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Activos</div>
                            <div className="text-2xl font-bold text-green-600">
                                {stats.activeStaff}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Staff Grid or Table */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : staff.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <p className="text-muted-foreground">
                            No hay personal registrado o sin actividad en este período
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map((s) => (
                        <StaffPayrollCard
                            key={s.id}
                            {...s}
                            mode={payrollMode}
                            onRefresh={loadData}
                        />
                    ))}
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Personal</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Horas</TableHead>
                                <TableHead>Total Ganado</TableHead>
                                <TableHead>Adeudado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((s) => (
                                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50">
                                    <TableCell className="font-medium">{s.name}</TableCell>
                                    <TableCell>
                                        {s.amountOwed > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                                                🔴 DEUDA
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                                🟢 AL DÍA
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>{s.totalHours}h</TableCell>
                                    <TableCell className="font-semibold">${s.totalEarned.toLocaleString()}</TableCell>
                                    <TableCell className={s.amountOwed > 0 ? 'font-bold text-red-600' : 'text-green-600'}>
                                        ${s.amountOwed.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
