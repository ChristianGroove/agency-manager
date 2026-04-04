"use client"

import { useEffect, useState } from "react"
import { getPayrollSettlements, registerPayment } from "../../actions/payroll-actions"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Eye } from "lucide-react"
import { toast } from "sonner"
import { RegisterPaymentModal } from "./register-payment-modal"

export function SettlementsList({ periodId }: { periodId: string }) {
    const [settlements, setSettlements] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedSettlement, setSelectedSettlement] = useState<any>(null)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

    useEffect(() => {
        if (periodId) {
            loadSettlements()
        }
    }, [periodId])

    const loadSettlements = async () => {
        setIsLoading(true)
        try {
            const data = await getPayrollSettlements(periodId)
            setSettlements(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar liquidaciones")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRegisterPayment = (settlement: any) => {
        setSelectedSettlement(settlement)
        setIsPaymentModalOpen(true)
    }

    const handlePaymentSuccess = () => {
        loadSettlements()
        setIsPaymentModalOpen(false)
        setSelectedSettlement(null)
    }

    const getStatusBadge = (status: string) => {
        const config: any = {
            pending: { variant: "secondary", label: "Pendiente", className: "bg-yellow-50 text-yellow-700" },
            partial: { variant: "outline", label: "Parcial", className: "bg-orange-50 text-orange-700" },
            paid: { variant: "outline", label: "Pagado", className: "bg-green-50 text-green-700" }
        }
        const c = config[status] || config.pending
        return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>
    }

    if (isLoading) {
        return <div className="text-center py-8 text-muted-foreground">Cargando liquidaciones...</div>
    }

    if (settlements.length === 0) {
        return (
            <Card className="p-8 text-center">
                <p className="text-muted-foreground">No hay liquidaciones para este período</p>
            </Card>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {settlements.map((settlement) => (
                    <Card key={settlement.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-semibold text-lg">
                                        {settlement.staff?.first_name} {settlement.staff?.last_name}
                                    </h4>
                                    {getStatusBadge(settlement.payment_status)}
                                </div>
                                <p className="text-sm text-muted-foreground">{settlement.staff?.email}</p>
                            </div>

                            <div className="flex items-center gap-8">
                                {/* Hours */}
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Horas</div>
                                    <div className="text-xl font-bold">{settlement.total_hours.toFixed(1)}h</div>
                                </div>

                                {/* Amount */}
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Total</div>
                                    <div className="text-xl font-bold text-blue-600">
                                        ${settlement.final_amount.toLocaleString()}
                                    </div>
                                </div>

                                {/* Paid */}
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Pagado</div>
                                    <div className="text-xl font-bold text-green-600">
                                        ${settlement.amount_paid.toLocaleString()}
                                    </div>
                                </div>

                                {/* Owed */}
                                {settlement.amount_owed > 0 && (
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">Adeuda</div>
                                        <div className="text-xl font-bold text-orange-600">
                                            ${settlement.amount_owed.toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                {settlement.amount_owed > 0 && (
                                    <Button
                                        onClick={() => handleRegisterPayment(settlement)}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        Registrar Pago
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        {(settlement.bonuses > 0 || settlement.deductions > 0) && (
                            <div className="mt-4 pt-4 border-t flex gap-6 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Base: </span>
                                    <span className="font-medium">${settlement.base_amount.toLocaleString()}</span>
                                </div>
                                {settlement.bonuses > 0 && (
                                    <div>
                                        <span className="text-muted-foreground">Bonos: </span>
                                        <span className="font-medium text-green-600">+${settlement.bonuses.toLocaleString()}</span>
                                    </div>
                                )}
                                {settlement.deductions > 0 && (
                                    <div>
                                        <span className="text-muted-foreground">Deducciones: </span>
                                        <span className="font-medium text-red-600">-${settlement.deductions.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {selectedSettlement && (
                <RegisterPaymentModal
                    open={isPaymentModalOpen}
                    onOpenChange={setIsPaymentModalOpen}
                    settlement={selectedSettlement}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </>
    )
}
