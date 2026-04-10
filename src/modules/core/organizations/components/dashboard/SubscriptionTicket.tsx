"use client"

import React from "react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
    Receipt,
    Download,
    CheckCircle2,
    Building2,
    CreditCard,
    Hash,
    Calendar,
    Printer,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SubscriptionTicketProps {
    transaction: any
    organization?: any
    onClose?: () => void
}

export function SubscriptionTicket({ transaction, organization, onClose }: SubscriptionTicketProps) {
    if (!transaction) return null

    const amount = (transaction.amount_in_cents / 100).toLocaleString('es-CO', {
        style: 'currency',
        currency: transaction.currency || 'USD'
    })

    const dateFormatted = format(parseISO(transaction.created_at), "eeee, dd 'de' MMMM 'de' yyyy", { locale: es })
    const timeFormatted = format(parseISO(transaction.created_at), 'HH:mm')

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="flex flex-col items-center p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-300">
            {/* Ticket Container */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 relative group">

                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-primary/20 rounded-b-full" />

                {/* Header Section */}
                <div className="p-8 text-center bg-gradient-to-b from-slate-50 to-white dark:from-white/5 dark:to-transparent border-b border-dashed border-slate-200 dark:border-white/10 relative">
                    {/* Corner Punch Holes (Visual only) */}
                    <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-100 dark:bg-slate-950 rounded-full shadow-inner" />
                    <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-100 dark:bg-slate-950 rounded-full shadow-inner" />

                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-4 shadow-sm group-hover:scale-110 transition-transform duration-500">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        Pago Confirmado
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Recibo de Transacción
                    </p>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-6 bg-white dark:bg-slate-900">

                    {/* Amount Highlight */}
                    <div className="text-center py-4 bg-primary/5 rounded-3xl border border-primary/10 mb-8">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] block mb-1">Monto Total</span>
                        <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {amount}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="space-y-5">
                        <div className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Organización</span>
                            </div>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                {organization?.name || 'Pixy Agency'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Concepto</span>
                            </div>
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight text-right max-w-[180px]">
                                {transaction.metadata?.concept || "Servicios de Plataforma"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                    <Hash className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Referencia</span>
                            </div>
                            <span className="text-xs font-black text-slate-500 font-mono tracking-tight">
                                {transaction.reference}
                            </span>
                        </div>

                        <div className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                                    {dateFormatted}
                                </div>
                                <div className="text-[10px] font-bold text-slate-400">
                                    {timeFormatted}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Método</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg uppercase">
                                {transaction.metadata?.gateway?.toUpperCase() || 'WOMPI'} TOKENIZED
                            </span>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-8 border-t border-dashed border-slate-200 dark:border-white/10 text-center">
                        <div className="mb-6 opacity-30 dark:opacity-10 grayscale">
                            <div className="flex justify-center gap-1 h-8">
                                {[...Array(24)].map((_, i) => (
                                    <div key={i} className={cn("w-[2px] bg-slate-900 dark:bg-white", i % 3 === 0 ? "h-full" : "h-2/3")} />
                                ))}
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            Pixy Platform • Innovación Digital
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-8 w-full max-w-md no-print">
                <Button
                    variant="outline"
                    className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 bg-white dark:bg-slate-900 border-slate-200 hover:bg-slate-50"
                    onClick={handlePrint}
                >
                    <Printer className="w-3.5 h-3.5 mr-2" />
                    Imprimir
                </Button>
                <Button
                    className="flex-1 rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-primary/20"
                >
                    <Download className="w-3.5 h-3.5 mr-2" />
                    Descargar PDF
                </Button>
            </div>

            {onClose && (
                <Button
                    variant="ghost"
                    className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 no-print"
                    onClick={onClose}
                >
                    Cerrar Recibo
                </Button>
            )}

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-only { display: block !important; }
                }
            `}</style>
        </div>
    )
}
