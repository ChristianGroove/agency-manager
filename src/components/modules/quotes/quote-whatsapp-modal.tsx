"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share2, Copy, Check } from "lucide-react"
import { Quote } from "@/types"
import { getSettings } from "@/lib/actions/settings"
import { getWhatsAppLink } from "@/lib/communication-utils"

interface QuoteWhatsAppModalProps {
    quote: Quote
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Removed hardcoded TEMPLATES


export function QuoteWhatsAppModal({ quote, open, onOpenChange }: QuoteWhatsAppModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState("new_quote")
    const [message, setMessage] = useState("")
    const [copied, setCopied] = useState(false)

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
    }

    // Replace variables in template
    const processTemplate = (templateContent: string) => {
        const clientName = quote.client?.name || quote.lead?.name || "Cliente"
        return templateContent
            .replace(/{cliente}/g, clientName)
            .replace(/{numero}/g, quote.number)
            .replace(/{valor}/g, formatCurrency(quote.total))
    }

    const [settings, setSettings] = useState<any>(null)

    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    // Update message when settings load
    useEffect(() => {
        if (!settings) return

        // Default message if no template
        let templateContent = "Hola {cliente}, te comparto la Cotización N° {numero} por valor de {valor}. Quedo atento a tus comentarios. ¡Gracias!"

        // If we had a quote template in settings we would use it here.
        // Since we don't have a specific quote template in the requirement list, we'll stick to a default or generic one.
        // However, to be consistent with the "Communication Settings" feature, I should probably allow a custom message or just use the default logic but via the utility if possible.
        // For now, I will keep the logic simple and just use the utility for the link.

        setMessage(processTemplate(templateContent))
    }, [settings, quote])

    const handleSend = () => {
        const phone = quote.client?.phone || quote.lead?.phone || ''
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
                        Compartir Cotización por WhatsApp
                    </DialogTitle>
                    <DialogDescription>
                        Personaliza el mensaje antes de enviarlo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Template selection removed as we don't have multiple quote templates in settings yet */}

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
                            Variables: {"{cliente}, {numero}, {valor}"}
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
