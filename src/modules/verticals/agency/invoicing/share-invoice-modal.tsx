"use strict";

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, Mail, Download, ArrowRight, Share2, Copy, Check, Loader2 } from "lucide-react"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { cn } from "@/lib/utils"

interface ShareInvoiceModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    invoice: any // Using any to avoid strict type issues with joined tables
    client: any // Using any to avoid strict type issues with local vs imported types
    settings: any
    onSendEmail?: () => Promise<void>
}

type ChannelType = 'whatsapp' | 'email' | 'download'

export function ShareInvoiceModal({ isOpen, onOpenChange, invoice, client, settings, onSendEmail }: ShareInvoiceModalProps) {
    const [channel, setChannel] = useState<ChannelType>('whatsapp')
    const [copied, setCopied] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)

    if (!invoice || !client) return null

    // Generate the Public Invoice URL
    const invoiceUrl = `${window.location.origin}/invoice/${invoice.id}`

    const handleAction = async () => {
        setIsGenerating(true)
        try {
            switch (channel) {
                case 'whatsapp':
                    const waMessage = `Hola ${client.name}, te comparto tu factura #${invoice.number} por valor de $${invoice.total.toLocaleString()}.\n\nPuedes verla aquí: ${invoiceUrl}`
                    const waLink = getWhatsAppLink(client.phone || "", waMessage, settings)
                    window.open(waLink, '_blank')
                    break

                case 'email':
                    if (onSendEmail) {
                        // Use system email sending
                        await onSendEmail()
                        onOpenChange(false)
                    } else {
                        // Fallback to Mailto
                        const subject = `Factura #${invoice.number} - ${settings?.agency_name || "Empresa"}`
                        const body = `Hola ${client.name},\n\nAdjunto encontrarás la factura #${invoice.number} por un valor de $${invoice.total.toLocaleString()}.\n\nPuedes verla y descargarla en el siguiente enlace:\n${invoiceUrl}\n\nGracias por tu confianza.\n\nAtentamente,\n${settings?.agency_name || "El equipo"}`
                        const mailtoLink = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                        window.open(mailtoLink, '_blank')
                        onOpenChange(false)
                    }
                    break

                case 'download':
                    // Open public invoice page for Native PDF (Print)
                    window.open(invoiceUrl, '_blank')
                    onOpenChange(false)
                    break
            }
        } catch (error) {
            console.error("Error in action:", error)
        } finally {
            setIsGenerating(false)
        }
    }

    const copyLink = () => {
        navigator.clipboard.writeText(invoiceUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                <div className="bg-gray-50 p-6 border-b border-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="bg-blue-100 p-2 rounded-full">
                                <Share2 className="h-5 w-5 text-blue-600" />
                            </div>
                            Compartir Factura #{invoice.number}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Elige el medio por el cual deseas compartir este documento.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Channel Selector Pills */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', activeBg: 'bg-green-50', activeBorder: 'border-green-600' },
                            { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-600', activeBg: 'bg-blue-50', activeBorder: 'border-blue-600' },
                            { id: 'download', label: 'Descargar', icon: Download, color: 'text-gray-600', activeBg: 'bg-gray-100', activeBorder: 'border-gray-400' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setChannel(opt.id as ChannelType)}
                                className={cn(
                                    "flex-1 min-w-[90px] flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                                    channel === opt.id
                                        ? cn(opt.activeBorder, opt.activeBg, opt.color, "shadow-sm")
                                        : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                <opt.icon className={cn("h-6 w-6", channel === opt.id ? opt.color : "text-gray-400")} />
                                <span className={cn("text-xs font-semibold", channel === opt.id ? "text-gray-900" : "text-gray-400")}>{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="bg-gray-50 rounded-xl p-4 min-h-[100px] flex flex-col justify-center border border-gray-100">
                        {channel === 'whatsapp' && (
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-gray-900">Enviar por WhatsApp</p>
                                <p className="text-xs text-gray-500">Se abrirá el chat con {client.name} con un mensaje pre-redactado y el enlace.</p>
                            </div>
                        )}
                        {channel === 'email' && (
                            <div className="text-center space-y-1">
                                {onSendEmail ? (
                                    <>
                                        <p className="text-sm font-medium text-gray-900">Enviar por Sistema</p>
                                        <p className="text-xs text-gray-500">Enviaremos un correo oficial con el PDF adjunto y la marca de tu empresa.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-900">Enviar por Correo</p>
                                        <p className="text-xs text-gray-500">Se abrirá tu cliente de correo predeterminado con el asunto y enlace listos.</p>
                                    </>
                                )}
                            </div>
                        )}
                        {channel === 'download' && (
                            <div className="space-y-3">
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-medium text-gray-900">Descargar PDF</p>
                                    <p className="text-xs text-gray-500">Genera un PDF ultraliviano de la factura. No ocupa espacio en el servidor.</p>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2 max-w-sm mx-auto">
                                    <p className="text-[10px] text-gray-400 truncate flex-1 font-mono">{invoiceUrl}</p>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyLink}>
                                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Button
                        className={cn(
                            "w-full font-bold h-12 rounded-xl shadow-md transition-all active:scale-[0.98] text-white",
                            channel === 'whatsapp' ? "bg-[#25D366] hover:bg-[#128C7E]" :
                                channel === 'email' ? "bg-blue-600 hover:bg-blue-700" :
                                    "bg-gray-800 hover:bg-gray-900"
                        )}
                        onClick={handleAction}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {channel === 'email' ? 'Enviando...' : 'Procesando...'}
                            </>
                        ) : (
                            <>
                                <span>
                                    {channel === 'whatsapp' ? 'Abrir WhatsApp' :
                                        channel === 'email' ? 'Enviar Ahora' : 'Descargar PDF'}
                                </span>
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
