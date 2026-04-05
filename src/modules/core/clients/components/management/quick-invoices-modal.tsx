"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, FileText } from "lucide-react"
import { toast } from "sonner"

export function QuickInvoicesModal({
    isOpen,
    onOpenChange,
    client,
    onSuccess
}: {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    client: any
    onSuccess: () => void
}) {
    const [isMarking, setIsMarking] = useState<string | null>(null)

    // local optimistic state for invoices
    const [localInvoices, setLocalInvoices] = useState<any[]>(client?.invoices || [])

    // Update local state when client changes
    React.useEffect(() => {
        setLocalInvoices(client?.invoices || [])
    }, [client])

    const handleMarkAsPaid = async (invoiceId: string) => {
        setIsMarking(invoiceId)
        try {
            const { registerPaymentAction } = await import("@/modules/features/billing/billing-actions")
            const invoice = localInvoices.find(inv => inv.id === invoiceId)
            const result = await registerPaymentAction(invoiceId, invoice?.total || 0, "Pago manual registrado desde detalles del cliente")
            
            if (!result.success) throw new Error(result.error)

            // Optimistic update
            setLocalInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv))
            toast.success("Factura marcada como pagada")
            onSuccess()
        } catch (error: any) {
            console.error("Error marking invoice as paid:", error)
            toast.error("Error al actualizar la factura: " + error.message)
        } finally {
            setIsMarking(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Documentos Rápidos</DialogTitle>
                    <DialogDescription>
                        Gestiona los documentos de {client?.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-modern">
                    {localInvoices && localInvoices.length > 0 ? (
                        localInvoices
                            .filter(inv => !inv.deleted_at && (inv.status === 'pending' || inv.status === 'overdue'))
                            .sort((a, b) => new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime())
                            .map(invoice => (
                                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">${invoice.total.toLocaleString()}</span>
                                            <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                                                {invoice.status === 'paid' ? 'Pagada' : invoice.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Vence: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Sin fecha'}
                                            {invoice.billing_cycles && (
                                                <span className="block text-[10px] text-primary mt-0.5 font-bold">
                                                    Periodo: {new Date(invoice.billing_cycles.start_date).toLocaleDateString()} - {new Date(invoice.billing_cycles.end_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {invoice.status !== 'paid' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 text-xs border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-800 transition-colors"
                                            onClick={() => handleMarkAsPaid(invoice.id)}
                                            disabled={isMarking === invoice.id}
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                            {isMarking === invoice.id ? 'Marcando...' : 'Marcar Pagada'}
                                        </Button>
                                    )}
                                </div>
                            ))
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                            <p>No hay facturas registradas</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
