"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Share2, FileCheck, Edit, Download, Printer, UserPlus } from "lucide-react"
import { Quote } from "@/types"
import { QuoteTemplate } from "./quote-template"
import { getSettings } from "@/modules/core/settings/actions" // Server Action
import { convertQuote } from "@/modules/core/quotes/conversion-actions"
import { convertLeadToClient } from "@/modules/core/crm/leads-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { QuoteShareSheet } from "./quote-share-sheet"
import { CreateQuoteSheet } from "./create-quote-sheet" // For editing
import { cn } from "@/lib/utils"

interface QuoteDetailDialogProps {
    quote: Quote
    open: boolean
    onOpenChange: (open: boolean) => void
    onQuoteUpdated?: () => void // Callback to refresh list
    emitters?: any[] // Needed for Edit Sheet
}

export function QuoteDetailDialog({ quote: initialQuote, open, onOpenChange, onQuoteUpdated, emitters }: QuoteDetailDialogProps) {
    const [quote, setQuote] = useState<Quote>(initialQuote)
    const [settings, setSettings] = useState<any>(null)
    const [loadingSettings, setLoadingSettings] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [isShareOpen, setIsShareOpen] = useState(false)
    const router = useRouter()

    // Update local state when prop changes
    useEffect(() => {
        setQuote(initialQuote)
    }, [initialQuote])

    // Load Settings on Open
    useEffect(() => {
        if (open && !settings) {
            getSettings().then(data => {
                setSettings(data)
                setLoadingSettings(false)
            })
        }
    }, [open, settings])

    const handleConvertLead = async () => {
        if (!quote.lead_id) return
        if (!confirm("¿Estás seguro de convertir este prospecto en cliente?")) return

        setActionLoading(true)
        try {
            const res = await convertLeadToClient(quote.lead_id)
            if (!res.success || !res.data) throw new Error(res.error)

            toast.success(`Prospecto convertido: ${res.data.name}`)
            onQuoteUpdated?.()
            onOpenChange(false) // Close modal or refresh data?
            // Maybe refresh quote to show it's now a client?
            // For now, simpler to close.
        } catch (error: any) {
            console.error("Error converting lead:", error)
            toast.error(error.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleConvertToInvoice = async () => {
        if (!confirm("¿Convertir esta cotización en servicios y facturas?")) return
        setActionLoading(true)
        try {
            const result = await convertQuote(quote.id)
            if (result.success) {
                const { servicesCreated, invoicesCreated } = result.results || {}
                toast.success(`Conversión exitosa. ${servicesCreated || 0} Servicios, ${invoicesCreated ? 'Factura Generada' : ''}`)

                onQuoteUpdated?.()
                onOpenChange(false)

                if (result.results?.unifiedInvoiceId) {
                    router.push(`/invoices/${result.results.unifiedInvoiceId}`)
                }
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            toast.error(error.message || "Error al convertir")
        } finally {
            setActionLoading(false)
        }
    }

    const handlePrint = () => {
        // Simple print for now, or use the PDF logic from Share Sheet
        window.print()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 bg-gray-50/50 dark:bg-zinc-900 border-none overflow-hidden aria-describedby-description">
                <DialogTitle className="sr-only">Detalle de Cotización {quote.number}</DialogTitle>

                {/* Header Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                Cotización {quote.number}
                                {quote.status === 'draft' && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Borrador</span>}
                                {quote.status === 'sent' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Enviada</span>}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {new Date(quote.date).toLocaleDateString()} • {quote.client?.name || quote.lead?.name}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Actions */}

                        {quote.lead_id && (
                            <Button size="sm" variant="outline" onClick={handleConvertLead} disabled={actionLoading} className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Convertir Cliente
                            </Button>
                        )}

                        {quote.client_id && quote.status === 'accepted' && (
                            <Button size="sm" onClick={handleConvertToInvoice} disabled={actionLoading} className="bg-purple-600 hover:bg-purple-700 text-white">
                                <FileCheck className="h-4 w-4 mr-2" />
                                Facturar
                            </Button>
                        )}

                        {quote.status === 'draft' && (
                            <CreateQuoteSheet mode="edit" existingQuote={quote} emitters={emitters} onSuccess={() => { onQuoteUpdated?.(); onOpenChange(false); }}>
                                <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                            </CreateQuoteSheet>
                        )}

                        <Button size="sm" variant="outline" onClick={() => setIsShareOpen(true)}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartir
                        </Button>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <Button size="icon" variant="ghost" onClick={handlePrint} title="Imprimir" className="print:hidden">
                            <Printer className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto bg-gray-100/50 p-6 flex justify-center">
                    {loadingSettings ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="w-full max-w-[800px] shadow-2xl rounded-xl overflow-hidden print-content">
                            <QuoteTemplate
                                quote={quote}
                                settings={settings}
                                className="print:shadow-none print:border-none"
                            />
                        </div>
                    )}
                </div>

            </DialogContent>

            <QuoteShareSheet
                quote={quote}
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
            />
        </Dialog>
    )
}
