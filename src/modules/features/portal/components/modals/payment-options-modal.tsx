"use client"

import { useState } from "react"
import { Copy, Check, CreditCard, Banknote, X, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface PaymentOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    amount: number
    invoiceIds: string[]
    paymentMethods: any[]
    onWompiPay: () => void
    settings: any
}

export function PaymentOptionsModal({
    isOpen,
    onClose,
    amount,
    paymentMethods,
    onWompiPay,
    settings
}: PaymentOptionsModalProps) {
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success("Copiado al portapapeles")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(val)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-gray-50">
                <div className="p-6 bg-white border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Selecciona un Método de Pago</DialogTitle>
                        <DialogDescription>
                            Elige cómo deseas pagar el total de <span className="font-bold text-gray-900">{formatCurrency(amount)}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* 1. WOMPI OPTION (Always available if key exists, or if a manual gateway is set) */}
                    {(settings?.wompi_public_key || paymentMethods.some(m => m.type === 'GATEWAY')) && (
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pago en Línea</h4>

                            {/* Native Wompi Integration */}
                            {settings?.wompi_public_key && (
                                <button
                                    onClick={onWompiPay}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                            <CreditCard className="h-6 w-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Tarjeta / PSE / Nequi</p>
                                            <p className="text-sm text-gray-500">Pagos seguros vía Wompi</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500" />
                                </button>
                            )}

                            {/* Manual Gateway Links */}
                            {paymentMethods.filter(m => m.type === 'GATEWAY').map(method => (
                                <a
                                    key={method.id}
                                    href={method.details.payment_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group text-left block"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <CreditCard className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{method.title}</p>
                                            <p className="text-sm text-gray-500">Enlace de pago externo</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* 2. MANUAL METHODS */}
                    {paymentMethods.some(m => m.type === 'MANUAL') && (
                        <div className="space-y-3 pt-2">
                            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Transferencia Manual</h4>

                            {paymentMethods.filter(m => m.type === 'MANUAL').map(method => (
                                <div key={method.id} className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                                            <Banknote className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <p className="font-bold text-gray-900">{method.title}</p>
                                    </div>

                                    {method.details.account_number && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="space-y-1">
                                                <p className="text-xs text-gray-500 uppercase font-medium">Número de Cuenta</p>
                                                <p className="font-mono text-lg font-bold text-gray-800 tracking-wide">
                                                    {method.details.account_number}
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleCopy(method.details.account_number, method.id)}
                                                className={cn(
                                                    "h-8 px-2 transition-all",
                                                    copiedId === method.id ? "text-green-600 bg-green-50" : "text-gray-500 hover:text-black"
                                                )}
                                            >
                                                {copiedId === method.id ? (
                                                    <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Copiado</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><Copy className="h-4 w-4" /> Copiar</span>
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                    {method.instructions && (
                                        <div className="text-sm text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                            <p className="font-medium text-amber-800 mb-1">Instrucciones:</p>
                                            {method.instructions}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 border-t text-center text-xs text-gray-500">
                    Recuerda enviar tu comprobante de pago si usas transferencia manual.
                </div>
            </DialogContent>
        </Dialog>
    )
}
