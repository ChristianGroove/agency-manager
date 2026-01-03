"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { Loader2, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { registerPayment } from "@/modules/core/billing/invoices-actions"
import { Invoice } from "@/types"

interface RegisterPaymentSheetProps {
    invoice: Invoice
    trigger?: React.ReactNode
    onSuccess?: () => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function RegisterPaymentSheet({
    invoice,
    trigger,
    onSuccess,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: RegisterPaymentSheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [amount, setAmount] = useState(invoice.total.toString())
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            await registerPayment(invoice.id, parseFloat(amount), notes)
            toast.success("Pago registrado exitosamente")
            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error(error)
            toast.error("Error al registrar el pago")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger}
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Registrar Pago</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-sm text-gray-500">Factura</p>
                        <p className="font-bold text-lg">{invoice.number}</p>
                        <div className="flex justify-between mt-2">
                            <span className="text-gray-500">Total:</span>
                            <span className="font-medium">${invoice.total.toLocaleString()}</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Monto Recibido</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notas (Opcional)</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ref. transferencia, cheque..."
                            />
                        </div>

                        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar Pago
                        </Button>
                    </form>
                </div>
            </SheetContent>
        </Sheet>
    )
}
