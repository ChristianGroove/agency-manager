"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Loader2, MoreHorizontal, CreditCard, Mail, ExternalLink, ShieldAlert, CheckCircle2, Clock, AlertCircle, RefreshCcw } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { adminUpdateSubscription, adminCreateSubscription } from "@/modules/billing/saas/admin-actions"
import { getOrganizationInvoicesAction, sendPlatformInvoiceEmailAction, suspendOrganizationSubscriptionAction } from "@/modules/features/billing/billing-actions"
import { ManualBillingModal } from "@/app/(dashboard)/platform/admin/_components/manual-billing-modal"

interface TenantBillingSettingsProps {
    orgData: any;
    onRefresh: () => void;
}

export function TenantBillingSettings({ orgData, onRefresh }: TenantBillingSettingsProps) {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loadingInvoices, setLoadingInvoices] = useState(true)
    const [renewalData, setRenewalData] = useState<any>(null)
    const [isManualBillingOpen, setIsManualBillingOpen] = useState(false)

    const sub = orgData?.saas_subscriptions

    useEffect(() => {
        if (orgData?.id) {
            loadInvoices(orgData.id)
        }
    }, [orgData?.id])

    const loadInvoices = async (orgId: string) => {
        setLoadingInvoices(true)
        try {
            const data = await getOrganizationInvoicesAction(orgId)
            setInvoices(data || [])
        } catch (error) {
            toast.error("Error al cargar el historial de facturas")
        } finally {
            setLoadingInvoices(false)
        }
    }

    const handleAdminUpdate = async (updates: any) => {
        if (!sub?.id) return;
        try {
            await adminUpdateSubscription(sub.id, updates)
            toast.success("Suscripción actualizada correctamente")
            onRefresh()
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar suscripción")
        }
    }

    const handleCreateSubscription = async () => {
        if (!orgData?.id) return;
        try {
            await adminCreateSubscription(orgData.id, orgData.active_app_id || 'app_saas_platform')
            toast.success("Suscripción creada y plan asignado")
            onRefresh()
        } catch (error: any) {
            toast.error(error.message || "Error al crear suscripción")
        }
    }

    const handleResendEmail = async (invoice: any) => {
        const billingEmail = orgData?.billing_email || invoice.recipient_email
        if (!billingEmail) {
            toast.error("No hay un correo configurado para esta factura")
            return
        }
        try {
            const result = await sendPlatformInvoiceEmailAction(invoice.id, billingEmail)
            if (result.success) {
                toast.success("Correo enviado correctamente")
            } else {
                toast.error("Error al enviar el correo")
            }
        } catch (error) {
            toast.error("Error inesperado en el servidor")
        }
    }

    const handleSuspendViaInvoice = async () => {
        if (!confirm(`¿Estás seguro de suspender el servicio de ${orgData?.name}?`)) return
        try {
            await suspendOrganizationSubscriptionAction(orgData.id)
            toast.success("Suscripción suspendida manualmente")
            onRefresh()
        } catch (error) {
            toast.error("Error al suspender")
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
            case 'legacy_manual': return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
            case 'past_due': return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
            case 'canceled': case 'suspended': return 'bg-red-500/10 text-red-700 border-red-500/20'
            default: return 'bg-gray-500/10 text-gray-700'
        }
    }

    const getInvoiceStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case 'pending': return <Clock className="h-4 w-4 text-amber-500" />
            case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />
            default: return <AlertCircle className="h-4 w-4 text-gray-400" />
        }
    }

    return (
        <div className="space-y-6">
            {/* Subscription Card */}
            <Card className="border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-indigo-500" />
                        Control de Acceso y Suscripción
                    </CardTitle>
                    <CardDescription>
                        Gestiona el plan de {orgData?.name}, su estado y el ciclo de facturación.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sub ? (
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Plan Actual</p>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{sub.saas_apps?.name || 'SaaS Básico'}</span>
                                    <Badge variant="outline" className={getStatusColor(sub.status)}>
                                        {sub.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Próximo Corte: {sub.current_period_end ? format(new Date(sub.current_period_end), 'dd MMM yyyy', { locale: es }) : '-'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => handleAdminUpdate({ status: 'active' })}>
                                    Activar Acceso
                                </Button>
                                <Button variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20" onClick={() => handleAdminUpdate({ status: 'past_due' })}>
                                    Marcar Mora
                                </Button>
                                <Button variant="destructive" onClick={() => handleAdminUpdate({ status: 'canceled' })}>
                                    Suspender
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-200 dark:border-amber-900/30">
                            <div>
                                <p className="font-medium text-amber-800 dark:text-amber-400">Sin Suscripción Vinculada</p>
                                <p className="text-sm text-amber-700 dark:text-amber-500">
                                    {orgData?.trial_ends_at && new Date(orgData.trial_ends_at) > new Date() 
                                        ? `En Trial (Expira: ${format(new Date(orgData.trial_ends_at), 'dd MMM', { locale: es })})`
                                        : "Trial vencido. Requiere asignar plan para evitar bloqueo de los Sábados."}
                                </p>
                            </div>
                            <Button onClick={handleCreateSubscription}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Asignar Plan Inicial
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invoices Card */}
            <Card className="border shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-indigo-500" />
                        Historial de Facturación
                    </CardTitle>
                    <CardDescription>
                        Visualiza y reenvía las facturas o cobros de esta organización.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingInvoices ? (
                        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : invoices.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed">
                            No hay facturas generadas para esta organización.
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                    <TableRow>
                                        <TableHead>Factura</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Monto</TableHead>
                                        <TableHead>Vencimiento</TableHead>
                                        <TableHead className="w-[100px] text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv) => (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{inv.invoice_number}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(inv.created_at), 'MMM dd, yyyy', { locale: es })}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {getInvoiceStatusIcon(inv.status)}
                                                    <span className="capitalize text-sm font-medium">{inv.status}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">${inv.amount_due}</span>
                                                    <span className="text-xs text-muted-foreground uppercase">{inv.currency || 'USD'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy', { locale: es }) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Acciones de Factura</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => window.open(inv.hosted_invoice_url, '_blank')} disabled={!inv.hosted_invoice_url}>
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            Ver Factura (Stripe)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setRenewalData(inv)}>
                                                            <RefreshCcw className="h-4 w-4 mr-2" />
                                                            Renovar / Duplicar Cobro
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleResendEmail(inv)}>
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            Reenviar Correo
                                                        </DropdownMenuItem>
                                                        {inv.status === 'overdue' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={handleSuspendViaInvoice} className="text-red-600">
                                                                    <ShieldAlert className="h-4 w-4 mr-2" />
                                                                    Suspender Servicio (Mora)
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

            <ManualBillingModal
                isOpen={!!renewalData || isManualBillingOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setRenewalData(null)
                        setIsManualBillingOpen(false)
                        loadInvoices(orgData.id)
                    } else {
                        setIsManualBillingOpen(open)
                    }
                }}
                organizationId={orgData.id}
                organizationName={orgData.name}
                initialData={renewalData}
            />
        </div>
    )
}
