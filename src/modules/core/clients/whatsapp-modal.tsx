"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, Globe, FileText, FileBarChart2, ArrowRight, Wallet } from "lucide-react"
import { Client } from "@/types"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, getPortalShortUrl } from "@/lib/utils"

interface WhatsAppActionsModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    client: Client | null
    settings: any
    templates?: any[]
}

type ActionType = 'chat' | 'portal' | 'invoice' | 'quote'

export function WhatsAppActionsModal({ isOpen, onOpenChange, client, settings, templates = [] }: WhatsAppActionsModalProps) {
    const [action, setAction] = useState<ActionType>('chat')
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>("")
    const [shareAllInvoices, setShareAllInvoices] = useState(false)

    // 1. Helper to find template (Case insensitive, lenient)
    const findTemplate = (name: string) => {
        return templates.find(t => t.name.toLowerCase().includes(name.toLowerCase()) && t.status === 'APPROVED')
    }

    const portalLink = getPortalShortUrl(client?.portal_short_token || client?.portal_token || '')

    // 2. Logic to generate message body
    const getMessage = () => {
        if (!client) return ""
        let template = null
        let message = ""

        switch (action) {
            case 'chat':
                // Default greeting
                message = `Hola ${client.name}, ¿cómo estás? Te escribo de ${settings?.agency_name || "nuestra empresa"}.`
                break

            case 'portal':
                // Try find template
                template = findTemplate('Portal')
                if (template) {
                    message = template.content
                } else {
                    message = `Hola {{cliente}}, aquí tienes acceso a tu portal de cliente: {{link}}`
                }
                break

            case 'invoice':
                if (shareAllInvoices) {
                    // SPECIAL CASE: Billing Summary
                    const pending = client.invoices?.filter(i => ['pending', 'overdue'].includes(i.status)) || []
                    const total = pending.reduce((sum, i) => sum + i.total, 0)

                    // Try to find a summary template, otherwise Hardcoded Professional Format
                    template = findTemplate('Billing Summary')

                    if (template) {
                        message = template.content
                            .replace('{{total}}', `$${total.toLocaleString()}`)
                            .replace('{{count}}', pending.length.toString())
                    } else {
                        // Fallback Standard Message
                        const invoiceList = pending.map(i => `- Factura #${i.number}: $${i.total.toLocaleString()}`).join('\n')
                        message = `Hola {{cliente}}, hemos generado tu facturación pendiente por un total de $${total.toLocaleString()}.\n\nDetalle:\n${invoiceList}\n\nPuedes verlas y pagar aquí: {{link}}`
                    }
                } else {
                    // Single Invoice
                    const invoice = client.invoices?.find(i => i.id === selectedInvoiceId)
                    if (!invoice) return ""

                    template = findTemplate('Invoice Sent')
                    if (template) {
                        message = template.content
                            .replace('{{factura}}', invoice.number)
                            .replace('{{monto}}', `$${invoice.total.toLocaleString()}`)
                    } else {
                        message = `Hola {{cliente}}, te enviamos tu factura #{{factura}} por valor de {{monto}}. Puedes verla y pagarla aquí: {{link}}`
                            .replace('{{factura}}', invoice.number)
                            .replace('{{monto}}', `$${invoice.total.toLocaleString()}`)
                    }
                }
                break

            case 'quote':
                const quote = client.quotes?.find((q: any) => q.id === selectedQuoteId)
                if (!quote) return ""

                template = findTemplate('Quote') || findTemplate('Cotización')
                if (template) {
                    message = template.content
                        // Assume template might use {{id}} or {{number}}
                        .replace('{{cotizacion}}', quote.number)
                        .replace('{{monto}}', `$${quote.total.toLocaleString()}`)
                } else {
                    message = `Hola {{cliente}}, hemos preparado la cotización #{{cotizacion}} por {{monto}}. Puedes revisarla aquí: {{link}}`
                        .replace('{{cotizacion}}', quote.number)
                        .replace('{{monto}}', `$${quote.total.toLocaleString()}`)
                }
                break
        }

        // Global Replacements
        return message
            .replace('{{cliente}}', client.name.split(' ')[0]) // First name
            .replace('{{client}}', client.name.split(' ')[0])
            .replace('{{link}}', portalLink)
            .replace('{{empresa}}', settings?.agency_name || '')
            .replace('{{company}}', settings?.agency_name || '')
    }

    const handleSend = () => {
        if (!client) return
        const phone = client.phone
        if (!phone) {
            alert("El cliente no tiene teléfono registrado")
            return
        }

        const message = getMessage()
        const url = getWhatsAppLink(phone, message, settings)
        window.open(url, '_blank')
        onOpenChange(false)
    }

    const pendingInvoices = client?.invoices?.filter(i => ['pending', 'overdue'].includes(i.status)) || []
    // @ts-ignore
    const quotes = client?.quotes || []

    // Preview for UI (Real-time update)
    const previewMessage = useMemo(() => {
        if (!client) return ""
        try {
            return getMessage()
        } catch (e) {
            return "Selecciona una opción..."
        }
    }, [action, selectedInvoiceId, selectedQuoteId, shareAllInvoices, client, templates])

    if (!client) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                <div className="bg-gray-50 p-6 border-b border-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="bg-green-100 p-2 rounded-full">
                                <MessageCircle className="h-5 w-5 text-green-600" />
                            </div>
                            Contactar Cliente
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Personaliza el mensaje para <span className="font-semibold text-gray-900">{client.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Action Selector Pills */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'chat', label: 'Chat', icon: MessageCircle },
                            { id: 'portal', label: 'Portal', icon: Globe },
                            { id: 'invoice', label: 'Factura', icon: FileText },
                            { id: 'quote', label: 'Cotización', icon: FileBarChart2 },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => {
                                    setAction(opt.id as ActionType)
                                    // Reset submenu states
                                    setShareAllInvoices(false)
                                }}
                                className={cn(
                                    "flex-1 min-w-[90px] flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                                    action === opt.id
                                        ? "border-green-600 bg-green-50 text-green-700 shadow-sm"
                                        : "border-gray-100 bg-white text-gray-400 hover:border-green-200 hover:bg-green-50/50"
                                )}
                            >
                                <opt.icon className={cn("h-6 w-6", action === opt.id ? "text-green-600" : "text-gray-400")} />
                                <span className="text-xs font-semibold">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="space-y-4">
                        {action === 'invoice' && pendingInvoices.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-colors"
                                onClick={() => setShareAllInvoices(!shareAllInvoices)}
                            >
                                <div className={cn("w-5 h-5 rounded border flex items-center justify-center bg-white", shareAllInvoices ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300")}>
                                    {shareAllInvoices && <ArrowRight className="h-3 w-3" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-900">Resumen de Cuenta ({pendingInvoices.length})</p>
                                    <p className="text-xs text-blue-700">Enviar todas las facturas pendientes juntas</p>
                                </div>
                                <Wallet className="h-5 w-5 text-blue-500" />
                            </div>
                        )}

                        {!shareAllInvoices && action === 'invoice' && (
                            <div className="space-y-3 w-full">
                                {pendingInvoices.length > 0 ? (
                                    <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder="Seleccionar factura..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pendingInvoices.map(inv => (
                                                <SelectItem key={inv.id} value={inv.id}>
                                                    #{inv.number} - ${inv.total.toLocaleString()} ({inv.status === 'overdue' ? 'Vencida' : 'Pendiente'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-gray-400 italic text-center py-2">No hay facturas pendientes individuales.</p>
                                )}
                            </div>
                        )}

                        {action === 'quote' && (
                            <div className="space-y-3 w-full">
                                {quotes.length > 0 ? (
                                    <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                                        <SelectTrigger className="w-full bg-white">
                                            <SelectValue placeholder="Seleccionar cotización..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {quotes.map((q: any) => (
                                                <SelectItem key={q.id} value={q.id}>
                                                    #{q.number} - ${q.total.toLocaleString()} ({q.status})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <p className="text-sm text-gray-400 italic text-center py-2">No hay cotizaciones disponibles.</p>
                                )}
                            </div>
                        )}

                        {/* Live Preview Box */}
                        <div className="bg-gray-100/50 rounded-xl p-4 border border-gray-200 relative group">
                            <label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">Vista Previa</label>
                            <div className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed min-h-[60px]">
                                {previewMessage || <span className="text-gray-400 italic">Configura el mensaje...</span>}
                            </div>
                            {templates.length > 0 && action !== 'chat' && (
                                <div className="absolute bottom-2 right-2 opacity-50 text-[10px] text-gray-400 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Plantilla: {
                                        shareAllInvoices ? (findTemplate('Billing Summary') ? 'Billing Summary' : 'Default') :
                                            action === 'invoice' ? (findTemplate('Invoice Sent') ? 'Invoice Sent' : 'Default') :
                                                action === 'quote' ? (findTemplate('Quote') ? 'Quote' : 'Default') :
                                                    action === 'portal' ? (findTemplate('Portal') ? 'Portal' : 'Default') : 'N/A'
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    <Button
                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 rounded-xl shadow-md transition-all active:scale-[0.98]"
                        onClick={handleSend}
                        disabled={
                            (action === 'invoice' && !shareAllInvoices && !selectedInvoiceId) ||
                            (action === 'quote' && !selectedQuoteId)
                        }
                    >
                        <span>Ir a WhatsApp Web</span>
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
