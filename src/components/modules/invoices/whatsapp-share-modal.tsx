"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share2, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSettings } from "@/lib/actions/settings"
import { generateMessage, getWhatsAppLink } from "@/lib/communication-utils"

interface WhatsAppShareModalProps {
    invoice: {
        number: string
        client: {
            name: string
            phone: string
        }
        total: number
        due_date: string
    }
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Removed hardcoded TEMPLATES

export function WhatsAppShareModal({ invoice, open, onOpenChange }: WhatsAppShareModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState("new_invoice")
    const [message, setMessage] = useState("")
    const [copied, setCopied] = useState(false)

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
    }

    // Helper to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString()
    }

    // Replace variables in template
    const processTemplate = (templateContent: string) => {
        return templateContent
            .replace(/{cliente}/g, invoice.client.name)
            .replace(/{factura}/g, invoice.number)
            .replace(/{valor}/g, formatCurrency(invoice.total))
            .replace(/{vencimiento}/g, formatDate(invoice.due_date))
    }

    const [settings, setSettings] = useState<any>(null)

    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    // Update message when settings load or template changes
    useEffect(() => {
        if (!settings) return

        const templateKey = selectedTemplate === 'new_invoice' ? 'invoice_sent' :
            selectedTemplate === 'reminder' ? 'payment_reminder' : 'invoice_sent' // Default fallback

        const msg = generateMessage(templateKey, {
            cliente: invoice.client.name,
            factura: invoice.number,
            monto: formatCurrency(invoice.total),
            link: `${window.location.origin}/portal/${invoice.client?.portal_token || ''}`
        }, settings)

        setMessage(msg)
    }, [selectedTemplate, invoice, settings])

    const handleSend = () => {
        const phone = invoice.client.phone || ''
        const url = getWhatsAppLink(phone, message, settings)
        window.open(url, '_blank')
        onOpenChange(false)
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(message)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-green-600" />
                        Compartir por WhatsApp
                    </DialogTitle>
                    <DialogDescription>
                        Personaliza el mensaje antes de enviarlo al cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Plantilla</Label>
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new_invoice">Nueva Factura</SelectItem>
                                <SelectItem value="reminder">Recordatorio de Pago</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>Mensaje</Label>
                            <span className="text-xs text-muted-foreground">
                                {message.length} caracteres
                            </span>
                        </div>
                        <Textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="h-[150px] resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Variables disponibles: {"{cliente}, {factura}, {valor}, {vencimiento}"}
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleCopy} className="w-full sm:w-auto">
                        {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        {copied ? "Copiado" : "Copiar Texto"}
                    </Button>
                    <Button onClick={handleSend} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                        <Share2 className="h-4 w-4 mr-2" />
                        Enviar WhatsApp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
