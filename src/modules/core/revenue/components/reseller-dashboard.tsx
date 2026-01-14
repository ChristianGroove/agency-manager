"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
    DollarSign, TrendingUp, Users, Clock, CheckCircle2,
    Building2, ArrowUpRight, Loader2, CreditCard,
    Sparkles, Target, Calendar, ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
    getResellerRevenueMetrics,
    getResellerSettlements,
    getResellerBillableEvents
} from "@/modules/core/revenue/actions"
import { getConnectAccountStatus, initiateConnectOnboarding } from "@/modules/core/revenue/stripe-connect"

// Types inferred from actions
type Metrics = Awaited<ReturnType<typeof getResellerRevenueMetrics>>
type SettlementData = Awaited<ReturnType<typeof getResellerSettlements>>[number]
type EventData = Awaited<ReturnType<typeof getResellerBillableEvents>>[number]

interface ResellerDashboardProps {
    organizationId: string
}

export function ResellerDashboard({ organizationId }: ResellerDashboardProps) {
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [settlements, setSettlements] = useState<SettlementData[]>([])
    const [events, setEvents] = useState<EventData[]>([])
    const [connectStatus, setConnectStatus] = useState<{
        exists: boolean
        onboarding_complete: boolean
        payouts_enabled: boolean
        stripe_account_id: string | null
    }>({ exists: false, onboarding_complete: false, payouts_enabled: false, stripe_account_id: null })
    const [loading, setLoading] = useState(true)
    const [onboardingLoading, setOnboardingLoading] = useState(false)

    useEffect(() => {
        loadData()
    }, [organizationId])

    const loadData = async () => {
        setLoading(true)
        try {
            const [metricsData, settlementsData, eventsData, connectData] = await Promise.all([
                getResellerRevenueMetrics(organizationId),
                getResellerSettlements(organizationId),
                getResellerBillableEvents(organizationId),
                getConnectAccountStatus()
            ])
            setMetrics(metricsData)
            setSettlements(settlementsData)
            setEvents(eventsData)
            setConnectStatus(connectData)
        } catch (error) {
            toast.error("Error cargando datos de revenue")
        } finally {
            setLoading(false)
        }
    }

    const handleStartOnboarding = async () => {
        setOnboardingLoading(true)
        try {
            const result = await initiateConnectOnboarding()
            if (result.success && result.onboarding_url) {
                // In production, this would redirect to Stripe
                toast.info("Onboarding iniciado", {
                    description: result.error // Contains placeholder note
                })
            } else {
                toast.error(result.error || "Error iniciando onboarding")
            }
        } finally {
            setOnboardingLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: "bg-amber-50 text-amber-700 border-amber-200",
            approved: "bg-blue-50 text-blue-700 border-blue-200",
            processing: "bg-purple-50 text-purple-700 border-purple-200",
            completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
            failed: "bg-red-50 text-red-700 border-red-200"
        }
        const labels: Record<string, string> = {
            pending: "Pendiente",
            approved: "Aprobado",
            processing: "Procesando",
            completed: "Pagado",
            failed: "Fallido"
        }
        return (
            <Badge variant="outline" className={styles[status] || ""}>
                {labels[status] || status}
            </Badge>
        )
    }

    const getEventTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            subscription_base: "bg-blue-100 text-blue-800",
            subscription_addon: "bg-indigo-100 text-indigo-800",
            addon: "bg-purple-100 text-purple-800",
            overage: "bg-orange-100 text-orange-800",
            upsell: "bg-emerald-100 text-emerald-800",
            one_time: "bg-gray-100 text-gray-800"
        }
        return (
            <Badge className={colors[type] || "bg-gray-100"}>
                {type.replace('_', ' ')}
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

    const totalPhaseClients = (metrics?.clients_by_phase.activation || 0) +
        (metrics?.clients_by_phase.retention || 0) +
        (metrics?.clients_by_phase.stable || 0)

    return (
        <div className="space-y-6">
            {/* Stripe Connect Status Banner */}
            {!connectStatus.payouts_enabled && (
                <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-purple-200 dark:border-purple-800">
                    <CardContent className="py-4 px-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl text-white">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {connectStatus.exists ? "Completa tu perfil de pagos" : "Configura tu cuenta de pagos"}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Conecta tu cuenta bancaria para recibir tus comisiones automáticamente.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleStartOnboarding}
                                disabled={onboardingLoading}
                                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            >
                                {onboardingLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                )}
                                {connectStatus.exists ? "Continuar" : "Comenzar"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Commission Card */}
                <Card className="md:col-span-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <CardContent className="p-6 relative">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">
                                    Comisiones Totales Ganadas
                                </p>
                                <p className="text-5xl font-bold mt-2">
                                    ${(metrics?.total_commission_earned || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-emerald-200" />
                                        <span className="text-emerald-100 text-sm">
                                            ${(metrics?.pending_commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} pendiente
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <TrendingUp className="h-10 w-10" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Clients Card */}
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">
                                    Clientes Activos
                                </p>
                                <p className="text-4xl font-bold mt-2">{metrics?.total_clients || 0}</p>
                            </div>
                            <div className="p-3 bg-white/10 rounded-xl">
                                <Users className="h-8 w-8" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <p className="text-blue-100 text-xs mb-2">Revenue generado</p>
                            <p className="text-xl font-semibold">
                                ${(metrics?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Clients by Phase */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Clientes por Fase de Comisión
                            </CardTitle>
                            <CardDescription>
                                Tu comisión varía según la antigüedad del cliente
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        {/* Phase 1 */}
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-emerald-500 hover:bg-emerald-600">25%</Badge>
                                <span className="text-xs text-muted-foreground">Mes 0-6</span>
                            </div>
                            <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">Fase 1: Activación</h4>
                            <p className="text-3xl font-bold text-emerald-600 mt-2">
                                {metrics?.clients_by_phase.activation || 0}
                            </p>
                            <Progress
                                value={totalPhaseClients > 0 ? ((metrics?.clients_by_phase.activation || 0) / totalPhaseClients) * 100 : 0}
                                className="mt-3 h-1.5 bg-emerald-100"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Comisión en todo: suscripción + add-ons
                            </p>
                        </div>

                        {/* Phase 2 */}
                        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-blue-500 hover:bg-blue-600">15%</Badge>
                                <span className="text-xs text-muted-foreground">Mes 7-12</span>
                            </div>
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Fase 2: Retención</h4>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {metrics?.clients_by_phase.retention || 0}
                            </p>
                            <Progress
                                value={totalPhaseClients > 0 ? ((metrics?.clients_by_phase.retention || 0) / totalPhaseClients) * 100 : 0}
                                className="mt-3 h-1.5 bg-blue-100"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Solo add-ons/upsells con actividad
                            </p>
                        </div>

                        {/* Phase 3 */}
                        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800">
                            <div className="flex items-center justify-between mb-2">
                                <Badge className="bg-purple-500 hover:bg-purple-600">10%</Badge>
                                <span className="text-xs text-muted-foreground">Mes 13+</span>
                            </div>
                            <h4 className="font-semibold text-purple-900 dark:text-purple-100">Fase 3: Estable</h4>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                {metrics?.clients_by_phase.stable || 0}
                            </p>
                            <Progress
                                value={totalPhaseClients > 0 ? ((metrics?.clients_by_phase.stable || 0) / totalPhaseClients) * 100 : 0}
                                className="mt-3 h-1.5 bg-purple-100"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Solo add-ons/upsells/one-time
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs: Settlements & Events */}
            <Tabs defaultValue="settlements" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="settlements" className="gap-2">
                        <DollarSign className="h-4 w-4" />
                        Mis Liquidaciones
                    </TabsTrigger>
                    <TabsTrigger value="events" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Eventos Recientes
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="settlements">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Historial de Pagos</CardTitle>
                            <CardDescription>
                                Tus liquidaciones mensuales y su estado
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {settlements.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No hay liquidaciones aún.</p>
                                    <p className="text-sm mt-1">Cuando tus clientes generen ingresos, verás tus comisiones aquí.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead>Período</TableHead>
                                                <TableHead className="text-right">Ingresos Brutos</TableHead>
                                                <TableHead className="text-right">Tu Comisión</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {settlements.map((settlement) => (
                                                <TableRow key={settlement.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span>
                                                                {format(new Date(settlement.period_start), 'dd MMM', { locale: es })} -
                                                                {format(new Date(settlement.period_end), 'dd MMM yyyy', { locale: es })}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        ${Number(settlement.gross_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className="text-emerald-600 font-semibold text-lg">
                                                            ${Number(settlement.net_payout).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Eventos de Facturación</CardTitle>
                            <CardDescription>
                                Pagos recientes de tus clientes adquiridos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {events.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                    <p>No hay eventos de facturación aún.</p>
                                    <p className="text-sm mt-1">Cuando tus clientes paguen por servicios, aparecerán aquí.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Descripción</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                                <TableHead>Liquidado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {events.slice(0, 10).map((event) => (
                                                <TableRow key={event.id}>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(event.event_date), 'dd MMM yyyy', { locale: es })}
                                                    </TableCell>
                                                    <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate">
                                                        {event.description || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${Number(event.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {event.settled ? (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        ) : (
                                                            <Clock className="h-4 w-4 text-amber-500" />
                                                        )}
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
            </Tabs>
        </div>
    )
}
