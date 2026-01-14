"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
    DollarSign, TrendingUp, Users, Clock, CheckCircle2,
    AlertCircle, MoreHorizontal, Eye, CreditCard, XCircle,
    Building2, ArrowUpRight, Loader2, RefreshCw
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
    getAllSettlements,
    approveSettlement,
    getRevenueShareRules
} from "@/modules/core/revenue/actions"
import { executeConnectPayout } from "@/modules/core/revenue/stripe-connect"

// Types inferred from actions
type SettlementBase = Awaited<ReturnType<typeof getAllSettlements>>[number]
type SettlementData = SettlementBase & { reseller?: { id: string; name: string; slug: string } }
type RuleData = Awaited<ReturnType<typeof getRevenueShareRules>>[number]

// ============================================
// SETTLEMENTS MANAGER COMPONENT
// ============================================

export function SettlementsManager() {
    const [settlements, setSettlements] = useState<SettlementData[]>([])
    const [rules, setRules] = useState<RuleData[]>([])
    const [loading, setLoading] = useState(true)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [settlementsData, rulesData] = await Promise.all([
                getAllSettlements(),
                getRevenueShareRules()
            ])
            setSettlements(settlementsData)
            setRules(rulesData)
        } catch (error) {
            toast.error("Error cargando datos")
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id: string) => {
        startTransition(async () => {
            const result = await approveSettlement(id)
            if (result.success) {
                toast.success("Liquidación aprobada")
                loadData()
            } else {
                toast.error(result.error || "Error al aprobar")
            }
        })
    }

    const handlePayout = async (id: string) => {
        startTransition(async () => {
            const result = await executeConnectPayout(id)
            if (result.success) {
                toast.success("Payout ejecutado", {
                    description: result.error // Contains placeholder note
                })
                loadData()
            } else {
                toast.error(result.error || "Error en payout")
            }
        })
    }

    // Calculate metrics
    const metrics = {
        totalPending: settlements.filter(s => s.status === 'pending').length,
        totalApproved: settlements.filter(s => s.status === 'approved').length,
        totalCompleted: settlements.filter(s => s.status === 'completed').length,
        pendingAmount: settlements
            .filter(s => ['pending', 'approved'].includes(s.status))
            .reduce((sum, s) => sum + Number(s.net_payout), 0),
        totalPaidOut: settlements
            .filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + Number(s.net_payout), 0),
        platformRevenue: settlements
            .filter(s => s.status === 'completed')
            .reduce((sum, s) => sum + Number(s.platform_fee), 0)
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: "bg-amber-50 text-amber-700 border-amber-200",
            approved: "bg-blue-50 text-blue-700 border-blue-200",
            processing: "bg-purple-50 text-purple-700 border-purple-200",
            completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
            failed: "bg-red-50 text-red-700 border-red-200",
            cancelled: "bg-gray-50 text-gray-500 border-gray-200"
        }
        const labels: Record<string, string> = {
            pending: "Pendiente",
            approved: "Aprobado",
            processing: "Procesando",
            completed: "Pagado",
            failed: "Fallido",
            cancelled: "Cancelado"
        }
        return (
            <Badge variant="outline" className={styles[status] || ""}>
                {labels[status] || status}
            </Badge>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-100 dark:border-amber-900/30">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pendientes</p>
                                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">{metrics.totalPending}</p>
                            </div>
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Por Pagar</p>
                                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                                    ${metrics.pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <CreditCard className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Pagados</p>
                                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">
                                    ${metrics.totalPaidOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-100 dark:border-purple-900/30">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Revenue Pixy</p>
                                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                                    ${metrics.platformRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Settlements and Rules */}
            <Tabs defaultValue="settlements" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList className="bg-muted/50">
                        <TabsTrigger value="settlements" className="gap-2">
                            <DollarSign className="h-4 w-4" />
                            Liquidaciones
                        </TabsTrigger>
                        <TabsTrigger value="rules" className="gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Reglas de Comisión
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isPending}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {/* Settlements Tab */}
                <TabsContent value="settlements" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Historial de Liquidaciones</CardTitle>
                            <CardDescription>
                                Gestiona las liquidaciones pendientes y aprobadas de resellers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {settlements.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No hay liquidaciones registradas.</p>
                                    <p className="text-sm mt-1">Las liquidaciones se generan automáticamente al finalizar cada período.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead>Reseller</TableHead>
                                                <TableHead>Período</TableHead>
                                                <TableHead className="text-right">Bruto</TableHead>
                                                <TableHead className="text-right">Comisión</TableHead>
                                                <TableHead className="text-right">Pixy</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {settlements.map((settlement) => (
                                                <TableRow key={settlement.id} className="group">
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                                {settlement.reseller?.name?.[0] || 'R'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{settlement.reseller?.name || 'Reseller'}</p>
                                                                <p className="text-xs text-muted-foreground">{settlement.event_count} eventos</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <p>{format(new Date(settlement.period_start), 'dd MMM', { locale: es })}</p>
                                                            <p className="text-muted-foreground">a {format(new Date(settlement.period_end), 'dd MMM yyyy', { locale: es })}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${Number(settlement.gross_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-emerald-600 font-semibold">
                                                            ${Number(settlement.net_payout).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        ${Number(settlement.platform_fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                                                    <TableCell>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48">
                                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem>
                                                                    <Eye className="h-4 w-4 mr-2" />
                                                                    Ver Detalles
                                                                </DropdownMenuItem>
                                                                {settlement.status === 'pending' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleApprove(settlement.id)}
                                                                        className="text-blue-600"
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                                        Aprobar
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {settlement.status === 'approved' && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handlePayout(settlement.id)}
                                                                        className="text-emerald-600"
                                                                    >
                                                                        <CreditCard className="h-4 w-4 mr-2" />
                                                                        Ejecutar Payout
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {['pending', 'approved'].includes(settlement.status) && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem className="text-red-600">
                                                                            <XCircle className="h-4 w-4 mr-2" />
                                                                            Cancelar
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rules Tab */}
                <TabsContent value="rules" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Reglas de Comisión por Fase</CardTitle>
                            <CardDescription>
                                Configuración de porcentajes y eventos elegibles por fase de cliente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {rules.filter(r => !r.reseller_org_id).map((rule) => (
                                    <div
                                        key={rule.id}
                                        className={`p-5 rounded-xl border-2 transition-all ${rule.phase_name === 'activation'
                                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
                                            : rule.phase_name === 'retention'
                                                ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'
                                                : 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-bold text-lg capitalize">
                                                        Fase {rule.phase_name === 'activation' ? '1: Activación' : rule.phase_name === 'retention' ? '2: Retención' : '3: Estable'}
                                                    </h3>
                                                    <Badge variant="secondary">
                                                        Meses {rule.phase_start_month}-{rule.phase_end_month || '∞'}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {rule.requires_reseller_activity
                                                        ? `Requiere actividad en últimos ${rule.activity_window_days} días`
                                                        : 'Sin requisito de actividad'
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-4xl font-bold">{rule.commission_percent}%</p>
                                                <p className="text-xs text-muted-foreground">comisión</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {rule.eligible_event_types.map((type) => (
                                                <Badge key={type} variant="outline" className="text-xs">
                                                    {type.replace('_', ' ')}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
