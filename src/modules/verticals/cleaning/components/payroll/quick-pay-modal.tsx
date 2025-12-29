"use client"

import { useState } from "react"
import { quickPayStaff } from "../../actions/payroll-summary-actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface QuickPayModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    staffId: string
    staffName: string
    amountOwed: number
    onSuccess: () => void
}

export function QuickPayModal({
    open,
    onOpenChange,
    staffId,
    staffName,
    amountOwed,
    onSuccess
}: QuickPayModalProps) {
    const [amount, setAmount] = useState(amountOwed.toString())
    const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset amount when modal opens
    useState(() => {
        if (open) {
            setAmount(amountOwed.toString())
        }
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const amountNumber = parseFloat(amount)
        if (isNaN(amountNumber) || amountNumber <= 0) {
            toast.error("Ingrese un monto válido")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await quickPayStaff({
                staffId,
                amount: amountNumber,
                paymentMethod,
                paymentDate,
                notes
            })

            if (result.success) {
                toast.success("Pago registrado exitosamente")
                onSuccess()
            } else {
                toast.error(result.error || "Error al registrar pago")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>💰 Liquidar Deuda</DialogTitle>
                        <DialogDescription>
                            {staffName}
                            <br />
                            <span className="font-medium text-red-600">
                                Deuda total: ${amountOwed.toLocaleString()}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Monto a Pagar *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={amountOwed}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                            {parseFloat(amount) < amountOwed && (
                                <p className="text-xs text-orange-600">
                                    ⚠️ Pago parcial. Restante: ${(amountOwed - parseFloat(amount || "0")).toFixed(2)}
                                </p>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label htmlFor="method">Método de Pago *</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                                    <SelectItem value="cash">Efectivo</SelectItem>
                                    <SelectItem value="check">Cheque</SelectItem>
                                    <SelectItem value="mobile_payment">Pago Móvil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Información adicional..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                            ) : (
                                "Confirmar Pago"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
