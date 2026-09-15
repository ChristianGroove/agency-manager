"use client"

import { useState } from "react"
import { Copy, Check, CreditCard, Banknote, X, ChevronRight, ShieldCheck, Zap, ExternalLink, Loader2, Info, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

interface PaymentOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    amount: number
    invoiceIds: string[]
    paymentMethods: any[]
    onWompiPay: () => void
    settings: any
    isProcessing?: boolean
}

export function PaymentOptionsModal({
    isOpen,
    onClose,
    amount,
    paymentMethods,
    onWompiPay,
    settings,
    isProcessing = false
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

    const hasOnlinePayment = !!(settings?.wompi_public_key || paymentMethods?.some(m => m.type === 'GATEWAY'))
    const hasManualMethods = paymentMethods?.some(m => m.type === 'MANUAL')

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 shadow-2xl rounded-2xl">
                {/* Header with Amount Hero Banner */}
                <div className="p-6 pb-5 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/10 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-5 top-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-xl bg-brand-pink/10 dark:bg-brand-pink/20 flex items-center justify-center text-brand-pink">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white">
                                Selecciona un Método de Pago
                            </DialogTitle>
                            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                                Transacción protegida con cifrado SSL bancario
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Amount Banner */}
                    <div className="mt-4 p-3.5 px-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Total a liquidar
                        </span>
                        <span className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                            {formatCurrency(amount)}
                        </span>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 max-h-[62vh] overflow-y-auto bg-zinc-50/40 dark:bg-zinc-950">
                    {/* 1. ONLINE PAYMENT SECTION */}
                    {hasOnlinePayment && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                                    Pago en Línea Inmediato
                                </h4>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/40">
                                    Acreditación Automática
                                </span>
                            </div>

                            {/* Wompi Option */}
                            {settings?.wompi_public_key && (
                                <button
                                    onClick={onWompiPay}
                                    disabled={isProcessing}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 rounded-2xl",
                                        "hover:border-brand-pink dark:hover:border-brand-pink/60 hover:shadow-lg hover:shadow-brand-pink/5 transition-all group text-left",
                                        isProcessing && "opacity-70 pointer-events-none"
                                    )}
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-50 to-pink-50 dark:from-indigo-950/40 dark:to-pink-950/40 border border-indigo-100 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <CreditCard className="h-6 w-6 text-brand-pink" />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm text-zinc-900 dark:text-white">
                                                    Wompi (Bancolombia)
                                                </p>
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                                                    Recomendado
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                PSE, Tarjetas de Crédito/Débito, Nequi y Botón Bancolombia
                                            </p>
                                            <div className="flex items-center gap-1.5 pt-0.5">
                                                {['PSE', 'Nequi', 'Visa', 'Mastercard'].map(tag => (
                                                    <span key={tag} className="text-[9px] font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shrink-0 pl-2">
                                        {isProcessing ? (
                                            <div className="flex items-center gap-1.5 text-brand-pink text-xs font-semibold">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="hidden sm:inline">Conectando...</span>
                                            </div>
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-400 group-hover:text-brand-pink group-hover:bg-brand-pink/10 transition-colors">
                                                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )}

                            {/* Manual Gateway Links */}
                            {paymentMethods?.filter(m => m.type === 'GATEWAY').map(method => (
                                <a
                                    key={method.id}
                                    href={method.details?.payment_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 rounded-2xl hover:border-blue-500/60 dark:hover:border-blue-500/40 hover:shadow-lg transition-all group text-left block"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center shrink-0">
                                            <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                                                {method.title}
                                                <ExternalLink className="h-3 w-3 text-zinc-400" />
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                Pasarela externa segura
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                </a>
                            ))}
                        </div>
                    )}

                    {/* 2. MANUAL TRANSFERS SECTION */}
                    {hasManualMethods && (
                        <div className="space-y-3 pt-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Banknote className="h-3.5 w-3.5 text-emerald-500" />
                                Transferencia Bancaria Directa
                            </h4>

                            {paymentMethods?.filter(m => m.type === 'MANUAL').map(method => {
                                const isNequi = method.title?.toLowerCase().includes('nequi')
                                const isDaviplata = method.title?.toLowerCase().includes('daviplata')
                                const isBancolombia = method.title?.toLowerCase().includes('bancolombia')

                                return (
                                    <div
                                        key={method.id}
                                        className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 rounded-2xl space-y-3.5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                                    isNequi
                                                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40 text-purple-600 dark:text-purple-400"
                                                        : isDaviplata
                                                            ? "bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400"
                                                            : isBancolombia
                                                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-600 dark:text-amber-400"
                                                                : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400"
                                                )}>
                                                    <Banknote className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                                                        {method.title}
                                                    </p>
                                                    {method.details?.account_type && (
                                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize">
                                                            Cuenta de {method.details.account_type}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {method.details?.bank_name && (
                                                <Badge variant="outline" className="text-[10px] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800">
                                                    {method.details.bank_name}
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Account Number Box with Click-to-Copy */}
                                        {method.details?.account_number && (
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-white/5">
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                                        Número de Cuenta
                                                    </p>
                                                    <p className="font-mono text-base font-extrabold text-zinc-900 dark:text-white tracking-wider">
                                                        {method.details.account_number}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleCopy(method.details.account_number, method.id)}
                                                    className={cn(
                                                        "h-8 px-3 rounded-lg font-medium text-xs transition-all",
                                                        copiedId === method.id
                                                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                                                            : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-700"
                                                    )}
                                                >
                                                    {copiedId === method.id ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <Check className="h-3.5 w-3.5" />
                                                            Copiado
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5">
                                                            <Copy className="h-3.5 w-3.5" />
                                                            Copiar
                                                        </span>
                                                    )}
                                                </Button>
                                            </div>
                                        )}

                                        {/* Additional account metadata (Holder, Document) */}
                                        {(method.details?.account_holder || method.details?.document_number) && (
                                            <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                                                {method.details?.account_holder && (
                                                    <div>
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Titular:</span>
                                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                                                            {method.details.account_holder}
                                                        </span>
                                                    </div>
                                                )}
                                                {method.details?.document_number && (
                                                    <div className="text-right">
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">Identificación:</span>
                                                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                                                            {method.details.document_number}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Instructions */}
                                        {method.instructions && (
                                            <div className="text-xs text-amber-900 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/30 flex items-start gap-2 leading-relaxed">
                                                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                                <span>{method.instructions}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 px-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-zinc-400" />
                        Pagos procesados de forma segura
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                    >
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
