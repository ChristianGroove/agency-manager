"use client"

import { useState } from "react"
import { registerPayment } from "../../actions/payroll-actions"
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

interface RegisterPaymentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    settlement: any
    onSuccess: () => void
}

export function RegisterPaymentModal({
    open,
    onOpenChange,
    settlement,
    onSuccess
}: RegisterPaymentModalProps) {
    const [amount, setAmount] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
    const [referenceNumber, setReferenceNumber] = useState("")
    const [bankName, setBankName] = useState("")
    const [accountLast4, setAccountLast4] = useState("")
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const maxAmount = parseFloat(settlement?.amount_owed || 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const amountNumber = parseFloat(amount)
        if (isNaN(amountNumber) || amountNumber <= 0) {
            toast.error("Ingrese un monto válido")
            return
        }

        if (amountNumber > maxAmount) {
            toast.error(`El monto no puede exceder $${maxAmount.toLocaleString()}`)
            return
        }

        setIsSubmitting(true)
        try {
            const result = await registerPayment(settlement.id, {
                amount: amountNumber,
                paymentMethod,
                paymentDate,
                referenceNumber,
                bankName,
                accountLast4,
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
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Registrar Pago</DialogTitle>
                        <DialogDescription>
                            {settlement?.staff?.first_name} {settlement?.staff?.last_name}
                            <br />
                            <span className="font-medium text-foreground">
                                Saldo pendiente: ${maxAmount.toLocaleString()}
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
                                max={maxAmount}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Máximo: ${maxAmount.toLocaleString()}
                            </p>
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
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Payment Date */}
                        <div className="space-y-2">
                            <Label htmlFor="date">Fecha de Pago *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                required
                            />
                        </div>

                        {/* Reference Number */}
                        {paymentMethod !== 'cash' && (
                            <div className="space-y-2">
                                <Label htmlFor="reference">Número de Referencia</Label>
                                <Input
                                    id="reference"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="Ref. #123456"
                                />
                            </div>
                        )}

                        {/* Bank Details */}
                        {paymentMethod === 'bank_transfer' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank">Banco</Label>
                                    <Input
                                        id="bank"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="Nombre del banco"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="account">Últimos 4 Dígitos</Label>
                                    <Input
                                        id="account"
                                        value={accountLast4}
                                        onChange={(e) => setAccountLast4(e.target.value)}
                                        placeholder="1234"
                                        maxLength={4}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas (opcional)</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observaciones adicionales..."
                                rows={3}
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
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registrando...</>
                            ) : (
                                "Registrar Pago"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
