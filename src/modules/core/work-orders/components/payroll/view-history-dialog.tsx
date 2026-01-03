"use client"

import { useEffect, useState } from "react"
import { getStaffWorkLogs, getStaffPayments } from "../../actions/payroll-actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Loader2, Clock, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ViewHistoryDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    staffId: string
    staffName: string
}

export function ViewHistoryDialog({
    open,
    onOpenChange,
    staffId,
    staffName
}: ViewHistoryDialogProps) {
    const [workLogs, setWorkLogs] = useState<any[]>([])
    const [payments, setPayments] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (open && staffId) {
            loadHistory()
        }
    }, [open, staffId])

    const loadHistory = async () => {
        setIsLoading(true)
        try {
            const [logs, pays] = await Promise.all([
                getStaffWorkLogs(staffId),
                getStaffPayments(staffId, 20)
            ])
            setWorkLogs(logs)
            setPayments(pays)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const totalEarned = workLogs.reduce((sum, log) => sum + parseFloat(log.calculated_amount || 0), 0)
    const totalPaid = payments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0)
    const totalOwed = totalEarned - totalPaid

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>📋 Historial - {staffName}</DialogTitle>
                    <DialogDescription>
                        Registro completo de horas y pagos
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <div className="text-sm text-muted-foreground">Total Ganado</div>
                                <div className="text-lg font-bold">${totalEarned.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Total Pagado</div>
                                <div className="text-lg font-bold text-green-600">${totalPaid.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Adeuda</div>
                                <div className="text-lg font-bold text-red-600">${totalOwed.toFixed(2)}</div>
                            </div>
                        </div>

                        {/* Work Logs */}
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Horas Trabajadas ({workLogs.length})
                            </h4>
                            {workLogs.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay registros de horas
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {workLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-center justify-between p-3 bg-white border rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {format(new Date(log.start_time), "d MMM yyyy", { locale: es })}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {format(new Date(log.start_time), "HH:mm", { locale: es })} - {format(new Date(log.end_time), "HH:mm", { locale: es })}
                                                    {log.notes && ` • ${log.notes}`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">{parseFloat(log.total_hours).toFixed(1)}h</div>
                                                <div className="text-sm text-green-600">${parseFloat(log.calculated_amount).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payments */}
                        <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Pagos Realizados ({payments.length})
                            </h4>
                            {payments.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay pagos registrados
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {format(new Date(payment.payment_date), "d MMM yyyy", { locale: es })}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {payment.payment_method === 'bank_transfer' && 'Transferencia'}
                                                    {payment.payment_method === 'cash' && 'Efectivo'}
                                                    {payment.payment_method === 'check' && 'Cheque'}
                                                    {payment.payment_method === 'mobile_payment' && 'Pago Móvil'}
                                                    {payment.reference_number && ` • ${payment.reference_number}`}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-600">${parseFloat(payment.amount).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
