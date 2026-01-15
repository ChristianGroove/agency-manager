"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, Globe, FileText, FileBarChart2, ArrowRight, Check, Copy } from "lucide-react"
import { Client, Invoice, Quote } from "@/types"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, getPortalUrl } from "@/lib/utils"

interface WhatsAppActionsModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    client: Client | null
    settings: any
}

type ActionType = 'chat' | 'portal' | 'invoice' | 'quote'

export function WhatsAppActionsModal({ isOpen, onOpenChange, client, settings }: WhatsAppActionsModalProps) {
    const [action, setAction] = useState<ActionType>('chat')
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>("")

    if (!client) return null

    const handleSend = () => {
        let message = ""
        let phone = client.phone

        if (!phone) {
            alert("El cliente no tiene teléfono registrado")
            return
        }

        switch (action) {
            case 'chat':
                message = `Hola ${client.name}, ¿cómo estás? Te escribo de ${settings?.agency_name || "nuestra empresa"}.`
                break
            case 'portal':
                const link = getPortalUrl(`/portal/${client.portal_short_token || client.portal_token}`)
                message = `Hola ${client.name}, aquí te comparto el enlace a tu portal de cliente para que revises tus servicios y facturas: ${link}`
                break
            case 'invoice':
                const invoice = client.invoices?.find(i => i.id === selectedInvoiceId)
                if (invoice) {
                    const portalLink = getPortalUrl(`/portal/${client.portal_short_token || client.portal_token}`)
                    message = `Hola ${client.name} hemos generado una factura por $${invoice.total.toLocaleString()}, para ver los detalles ingresa a tu portal de cliente: ${portalLink}`
                }
                break
            case 'quote':
                const quote = client.quotes?.find((q: any) => q.id === selectedQuoteId)
                if (quote) {
                    const portalLink = getPortalUrl(`/portal/${client.portal_short_token || client.portal_token}`)
                    message = `Hola ${client.name} hemos generado una cotización por $${quote.total.toLocaleString()}, para ver los detalles ingresa a tu portal de cliente: ${portalLink}`
                }
                break
        }

        const url = getWhatsAppLink(phone, message, settings)
        window.open(url, '_blank')
        onOpenChange(false)
    }

    // Filter content
    const pendingInvoices = client.invoices?.filter(i => ['pending', 'overdue'].includes(i.status)) || []
    // @ts-ignore
    const quotes = client.quotes || []

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
                            Elige cómo quieres contactar a <span className="font-semibold text-gray-900">{client.name}</span>
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
                                onClick={() => setAction(opt.id as ActionType)}
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
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[120px] flex flex-col justify-center border border-gray-100">
                        {action === 'chat' && (
                            <p className="text-sm text-gray-600 text-center">
                                Se abrirá un chat directo con un saludo profesional.
                            </p>
                        )}
                        {action === 'portal' && (
                            <div className="text-center space-y-2">
                                <p className="text-sm text-gray-600">Se enviará el enlace directo al portal del cliente.</p>
                                <div className="text-xs bg-white p-2 rounded border border-gray-200 text-gray-400 truncate font-mono">
                                    {getPortalUrl(`/portal/${client.portal_short_token || '...'}`)}
                                </div>
                            </div>
                        )}
                        {action === 'invoice' && (
                            <div className="space-y-3 w-full">
                                {pendingInvoices.length > 0 && <label className="text-xs font-medium text-gray-500 ml-1">Selecciona Factura Pending/Vencida</label>}
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
                                    <p className="text-sm text-gray-400 italic text-center">No hay facturas pendientes.</p>
                                )}
                            </div>
                        )}
                        {action === 'quote' && (
                            <div className="space-y-3 w-full">
                                {quotes.length > 0 && <label className="text-xs font-medium text-gray-500 ml-1">Selecciona Cotización</label>}
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
                                    <p className="text-sm text-gray-400 italic text-center">No hay cotizaciones disponibles.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 rounded-xl shadow-md transition-all active:scale-[0.98]"
                        onClick={handleSend}
                        disabled={
                            (action === 'invoice' && !selectedInvoiceId) ||
                            (action === 'quote' && !selectedQuoteId)
                        }
                    >
                        <span>Ir a WhatsApp</span>
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
