"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Service } from "@/types"
import { Calendar, CreditCard, Clock, FileText, Activity, CheckCircle2, AlertCircle, XCircle, PauseCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { StatusBadge } from "@/components/ui/status-badge"
import { resolveServiceState } from "@/domain/state/service"
import { CreateInvoiceSheet } from "@/modules/core/billing/create-invoice-sheet"

interface ServiceDetailModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    service: Service | null
}

export function ServiceDetailModal({ isOpen, onOpenChange, service }: ServiceDetailModalProps) {
    const [cycles, setCycles] = useState<any[]>([])
    const [loadingCycles, setLoadingCycles] = useState(false)

    useEffect(() => {
        if (isOpen && service?.id) {
            fetchCycles(service.id)
        }
    }, [isOpen, service])

    const fetchCycles = async (serviceId: string) => {
        setLoadingCycles(true)
        try {
            // 1. Fetch Cycles (without join to avoid ambiguity)
            const { data: cyclesData, error: cyclesError } = await supabase
                .from('billing_cycles')
                .select('*')
                .eq('service_id', serviceId)
                .order('start_date', { ascending: false })

            if (cyclesError) throw cyclesError
            if (!cyclesData) {
                setCycles([])
                return
            }

            // 2. Fetch Invoices manually
            const invoiceIds = cyclesData
                .map(c => c.invoice_id)
                .filter(id => id !== null && id !== undefined)

            let invoicesMap: Record<string, any> = {}

            if (invoiceIds.length > 0) {
                const { data: invoicesData } = await supabase
                    .from('invoices')
                    .select('id, number, is_late_issued, status, due_date')
                    .in('id', invoiceIds)

                if (invoicesData) {
                    invoicesData.forEach(inv => {
                        invoicesMap[inv.id] = inv
                    })
                }
            }

            // 3. Merge
            const mergedCycles = cyclesData.map(c => ({
                ...c,
                invoice: c.invoice_id ? invoicesMap[c.invoice_id] : null
            }))

            setCycles(mergedCycles)

        } catch (error) {
            console.error("Error fetching cycles:", error)
        } finally {
            setLoadingCycles(false)
        }
    }

    if (!service) return null

    // New State Resolution
    const { status: normalizedStatus, color: statusColor, label: statusLabel } = resolveServiceState(service)

    const iconMap: Record<string, any> = {
        active: CheckCircle2,
        paused: PauseCircle,
        cancelled: XCircle,
        completed: CheckCircle2,
        draft: Activity
    }
    const StatusIcon = iconMap[normalizedStatus] || Activity

    const frequencyLabels: Record<string, string> = {
        monthly: 'Mensual',
        biweekly: 'Quincenal',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual'
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">

                {/* Header with Status Pattern */}
                <div className={`p-6 border-b border-gray-100 ${statusColor.replace('text-', 'bg-opacity-20 ')} bg-opacity-50 flex-none`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm ${statusColor}`}>
                            <Activity className="h-6 w-6" />
                        </div>
                        <StatusBadge status={service.status || 'draft'} type="service" className="text-sm px-3 py-1 font-semibold" entity={service} />
                    </div>
                    <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                        {service.name}
                    </DialogTitle>
                    <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        Creado el {format(new Date(service.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="info" className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Información General</TabsTrigger>
                                <TabsTrigger value="cycles">Suscripción & Ciclos</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="info" className="p-6 space-y-8 mt-0">
                            {/* Grid Info */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Financials */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" /> Financiero
                                    </h4>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Monto Recurrente</p>
                                            <p className="text-xl font-bold text-gray-900">
                                                ${service.amount?.toLocaleString()}
                                            </p>
                                        </div>
                                        <Separator className="bg-gray-200" />
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Frecuencia</p>
                                            <p className="font-medium text-gray-900">
                                                {frequencyLabels[service.frequency || 'monthly'] || service.frequency}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <Calendar className="h-4 w-4" /> Fechas Clave
                                    </h4>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Facturación Programada</p>
                                            <p className="font-medium text-indigo-600">
                                                {/* @ts-ignore */}
                                                {service.next_billing_date
                                                    /* @ts-ignore */
                                                    ? format(new Date(service.next_billing_date), "dd/MM/yyyy")
                                                    : "No programada"}
                                            </p>
                                        </div>
                                        <Separator className="bg-gray-200" />
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Inicio de Servicio</p>
                                            <p className="font-medium text-gray-900">
                                                {/* @ts-ignore */}
                                                {service.service_start_date
                                                    /* @ts-ignore */
                                                    ? format(new Date(service.service_start_date), "dd/MM/yyyy")
                                                    : (service.created_at ? format(new Date(service.created_at), "dd/MM/yyyy") : "No definida")
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            {service.description && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> Detalles Adicionales
                                    </h4>
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-gray-600 text-sm leading-relaxed">
                                        {service.description}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="cycles" className="p-6 mt-0 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-lg">Historial de Ciclos</h3>
                                <Badge variant="outline" className="font-normal">
                                    {cycles.length} ciclos registrados
                                </Badge>
                            </div>

                            <div className="rounded-md border border-gray-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Periodo</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="text-right">Factura</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingCycles ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    Cargando ciclos...
                                                </TableCell>
                                            </TableRow>
                                        ) : cycles.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    No hay ciclos de facturación registrados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            cycles.map((cycle) => (
                                                <TableRow key={cycle.id}>
                                                    <TableCell>
                                                        <StatusBadge status={cycle.status} type="cycle" entity={cycle} />
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <div className="flex flex-col">
                                                            <span>Desde: {format(new Date(cycle.start_date), "dd MMM yyyy", { locale: es })}</span>
                                                            <span className="text-muted-foreground text-xs">Hasta: {format(new Date(cycle.end_date), "dd MMM yyyy", { locale: es })}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        ${cycle.amount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {cycle.invoice ? (
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Button variant="link" className="h-auto p-0 text-indigo-600" onClick={() => window.open(`/invoices/${cycle.invoice.id}`, '_blank')}>
                                                                    {cycle.invoice.number || 'Ver Factura'}
                                                                </Button>
                                                                {cycle.invoice.is_late_issued && (
                                                                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                                                                        Emitido tardíamente
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {cycle.status === 'pending' || cycle.status === 'running' ? (
                                                                    <CreateInvoiceSheet
                                                                        clientId={service.client_id}
                                                                        clientName={service.name}
                                                                        initialAmount={cycle.amount}
                                                                        defaultDescription={`${service.name} (${format(new Date(cycle.start_date), "dd/MM")}-${format(new Date(cycle.end_date), "dd/MM")})`}
                                                                        serviceId={service.id}
                                                                        cycleId={cycle.id}
                                                                        emitterId={service.emitter_id}
                                                                        onSuccess={() => fetchCycles(service.id)}
                                                                        trigger={
                                                                            <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                                                                Facturar Ahora
                                                                            </Button>
                                                                        }
                                                                    />
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs italic">
                                                                        {cycle.status === 'pending' ? 'En curso' : '-'}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                <DialogFooter className="bg-gray-50 p-4 border-t border-gray-100 flex-none">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Cerrar Detalle
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
