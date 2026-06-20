"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
    getPlatformInvoicesAction as getPlatformInvoices, 
    sendPlatformInvoiceEmailAction as sendPlatformInvoiceEmail,
    suspendOrganizationSubscriptionAction as suspendOrganizationSubscription,
    deletePlatformInvoiceAction as deletePlatformInvoice
} from "@/modules/features/billing/billing-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
    RefreshCcw, 
    ExternalLink, 
    Mail, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Copy,
    Search,
    Filter,
    ShieldAlert,
    Trash2
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ManualBillingModal } from "./manual-billing-modal"

export function PlatformInvoicesManager() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [renewalData, setRenewalData] = useState<any>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const fetchInvoices = async () => {
        setIsRefreshing(true)
        try {
            const { invoices: data } = await getPlatformInvoices()
            setInvoices(data)
        } catch (error) {
            toast.error("Error al cargar facturas")
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [])

    const handleResendEmail = async (invoice: any) => {
        const billingProfile = invoice.organization?.billing_profile
        const billingEmail = Array.isArray(billingProfile) ? billingProfile[0]?.email : billingProfile?.email
        const email = invoice.recipient_email || billingEmail
        if (!email) {
            toast.error("No hay un correo configurado para esta factura")
            return
        }

        try {
            const result = await sendPlatformInvoiceEmail(invoice.id, email)
            if (result.success) {
                toast.success("Correo enviado correctamente")
            } else {
                toast.error("Error al enviar el correo")
            }
        } catch (error) {
            toast.error("Error inesperado en el servidor")
        }
    }

    const handleSuspend = async (invoice: any) => {
        if (!confirm(`¿Estás seguro de suspender el servicio de ${invoice.organization?.name}?`)) return
        
        try {
            await suspendOrganizationSubscription(invoice.organization_id)
            toast.success("Suscripción suspendida manualmente")
            fetchInvoices()
        } catch (error) {
            toast.error("Error al suspender")
        }
    }

    const handleRenew = (invoice: any) => {
        setRenewalData(invoice)
        setIsModalOpen(true)
    }
    const handleDelete = async (invoice: any) => {
        if (!confirm(`¿Estás seguro de ELIMINAR permanentemente la factura ${invoice.invoice_number}? Esta acción no se puede deshacer.`)) return
        
        try {
            await deletePlatformInvoice(invoice.id)
            toast.success("Factura eliminada correctamente")
            fetchInvoices()
        } catch (error) {
            toast.error("Error al eliminar la factura")
        }
    }

    const filteredInvoices = invoices.filter(inv => 
        inv.invoice_number.toLowerCase().includes(filter.toLowerCase()) ||
        inv.organization?.name?.toLowerCase().includes(filter.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PAID':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1"><CheckCircle2 className="h-3 w-3" /> PAGADA</Badge>
            case 'PENDING':
                return <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 gap-1"><Clock className="h-3 w-3" /> PENDIENTE</Badge>
            case 'CANCELLED':
                return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> ANULADA</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const getDaysInArrears = (invoice: any) => {
        if (invoice.status !== 'PENDING') return 0
        const createdAt = new Date(invoice.created_at)
        const now = new Date()
        const diff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        return diff > 0 ? diff : 0
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            Monitoreo de Cobros SaaS
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Seguimiento de cuotas de licenciamiento y transferencias de plataforma.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por factura u org..."
                                className="pl-9"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={fetchInvoices} 
                            disabled={isRefreshing}
                            className={isRefreshing ? "animate-spin" : ""}
                        >
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-xl border bg-white dark:bg-black/20 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Factura</TableHead>
                                <TableHead>Organización</TableHead>
                                <TableHead>Periodo</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Mora</TableHead>
                                <TableHead>Transacción</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7} className="h-12 animate-pulse bg-muted/20" />
                                    </TableRow>
                                ))
                            ) : filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No se encontraron facturas de plataforma.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-mono text-xs font-bold">
                                            {invoice.invoice_number}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{invoice.organization?.name}</span>
                                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">ID: {invoice.organization_id.split('-')[0]}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-[11px]">
                                                {format(new Date(invoice.billing_period_start), 'dd MMM', { locale: es })} - 
                                                {format(new Date(invoice.billing_period_end), 'dd MMM yyyy', { locale: es })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            <div className="flex flex-col">
                                                <span>{formatCurrency(invoice.amount_total, invoice.currency)}</span>
                                                {invoice.include_tax && (
                                                    <span className="text-[10px] text-muted-foreground font-normal">
                                                        Sub: {formatCurrency(invoice.amount_subtotal, invoice.currency)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(invoice.status)}
                                        </TableCell>
                                        <TableCell>
                                            {getDaysInArrears(invoice) > 0 ? (
                                                <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-100 font-mono text-[10px]">
                                                    {getDaysInArrears(invoice)} días
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {invoice.payment_transaction ? (
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="secondary" className="text-[9px] h-4 font-mono">
                                                        {invoice.payment_transaction.reference}
                                                    </Badge>
                                                    <span className="text-[9px] text-muted-foreground italic">
                                                        {invoice.payment_transaction.status} via Wompi
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">Manual / Sin registro</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => handleResendEmail(invoice)}
                                                    title="Reenviar Cobro"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-green-600 hover:bg-green-50"
                                                    onClick={() => handleRenew(invoice)}
                                                    title="Renovar Cobro (Duplicar con nuevo periodo)"
                                                >
                                                    <RefreshCcw className="h-4 w-4" />
                                                </Button>
                                                {invoice.status === 'PENDING' && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                                                        onClick={() => handleSuspend(invoice)}
                                                        title="Suspender por Mora"
                                                    >
                                                        <ShieldAlert className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Ver Detalles"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDelete(invoice)}
                                                    title="Eliminar Factura"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {renewalData && (
                <ManualBillingModal
                    isOpen={isModalOpen}
                    onOpenChange={(open) => {
                        setIsModalOpen(open)
                        if (!open) {
                            setRenewalData(null)
                            fetchInvoices()
                        }
                    }}
                    organizationId={renewalData.organization_id}
                    organizationName={renewalData.organization?.name || "Sin nombre"}
                    initialData={renewalData}
                />
            )}
        </Card>
    )
}

