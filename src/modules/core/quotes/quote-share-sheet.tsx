"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { getSettings } from "@/modules/core/settings/actions"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { sendQuoteViaWhatsApp, getQuote } from "./actions"
import { Quote } from "@/types"
import { toast } from "sonner"
import { Loader2, Share2, MessageSquare, ExternalLink, CheckCircle2, ChevronRight, Copy, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuoteShareSheetProps {
    quote?: Quote | null
    quoteId?: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function QuoteShareSheet({ quote: initialQuote, quoteId, open, onOpenChange }: QuoteShareSheetProps) {
    const router = useRouter()
    const [quote, setQuote] = useState<Quote | null>(initialQuote || null)
    const [loadingQuote, setLoadingQuote] = useState(false)
    const [settings, setSettings] = useState<any>(null)
    const [message, setMessage] = useState("")
    const [sending, setSending] = useState(false)
    const [sentSuccess, setSentSuccess] = useState<string | null>(null) // Stores conversationId

    // Fetch Settings
    useEffect(() => {
        getSettings().then(setSettings)
    }, [])

    // Fetch Quote if only ID provided
    useEffect(() => {
        if (open && !quote && quoteId) {
            setLoadingQuote(true)
            getQuote(quoteId).then(res => {
                if (res.success && res.data) {
                    setQuote(res.data)
                } else {
                    toast.error("Error al cargar la cotización")
                    onOpenChange(false)
                }
            }).finally(() => setLoadingQuote(false))
        } else if (initialQuote) {
            setQuote(initialQuote)
        }
    }, [open, quoteId, initialQuote])

    // Reset state on close/open
    useEffect(() => {
        if (open) {
            setSentSuccess(null)
            setSending(false)
        }
    }, [open])

    // Template Logic
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
    }

    useEffect(() => {
        if (!settings || !quote) return

        // Default template
        const templateContent = "Hola {cliente}, te comparto la Cotización N° {numero} por valor de {valor}. Quedo atento a tus comentarios. ¡Gracias!"

        const clientName = quote.client?.name || quote.lead?.name || "Cliente"
        const finalMessage = templateContent
            .replace(/{cliente}/g, clientName)
            .replace(/{numero}/g, quote.number)
            .replace(/{valor}/g, formatCurrency(quote.total))

        // Only set if empty to allow user editing
        if (!message) setMessage(finalMessage)
    }, [settings, quote])

    const handleSendViaBot = async () => {
        if (!quote) return
        setSending(true)
        try {
            const phone = quote.client?.phone || quote.lead?.phone
            if (!phone) {
                toast.error("El cliente no tiene teléfono registrado")
                setSending(false)
                return
            }

            const result = await sendQuoteViaWhatsApp(quote.id, phone)

            if (result.success) {
                toast.success("Mensaje enviado correctamente")
                setSentSuccess(result.conversationId || "done")
            } else {
                toast.error(result.error || "Error al enviar mensaje")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setSending(false)
        }
    }

    const handleOpenWhatsAppWeb = () => {
        if (!quote) return
        const phone = quote.client?.phone || quote.lead?.phone || ''
        const url = getWhatsAppLink(phone, message, settings)
        window.open(url, '_blank')
    }

    const handleGoToInbox = () => {
        if (sentSuccess && sentSuccess !== 'done') {
            router.push(`/inbox?conversationId=${sentSuccess}`)
        } else {
            router.push('/inbox')
        }
        onOpenChange(false)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white dark:bg-gray-900 flex flex-col
                "
            >
                {/* Header */}
                <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-6 flex-none">
                    <SheetHeader>
                        <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                            <Share2 className="h-6 w-6 text-indigo-600" />
                            Compartir Cotización
                        </SheetTitle>
                        <SheetDescription className="text-base">
                            Envía la cotización directamente al cliente por WhatsApp.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-950/50">
                    {loadingQuote ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                        </div>
                    ) : quote ? (
                        sentSuccess ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">¡Mensaje Enviado!</h3>
                                <p className="text-gray-500 max-w-sm">
                                    La cotización ha sido enviada correctamente. Se ha creado/actualizado la conversación en el Inbox.
                                </p>
                                <div className="flex flex-col w-full max-w-xs gap-3 pt-4">
                                    <Button onClick={handleGoToInbox} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg">
                                        <MessageSquare className="mr-2 h-5 w-5" />
                                        Ir al Inbox
                                    </Button>
                                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Quote Summary Card */}
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground font-medium">Cotización</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">#{quote.number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground font-medium">Total</p>
                                        <p className="text-lg font-bold text-indigo-600">{formatCurrency(quote.total)}</p>
                                    </div>
                                </div>

                                {/* Message Editor */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Mensaje Personalizado</Label>
                                        <span className="text-xs text-muted-foreground">{message.length} caracteres</span>
                                    </div>
                                    <Textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        className="min-h-[200px] p-4 text-base leading-relaxed resize-none rounded-xl border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-gray-800 shadow-sm"
                                        placeholder="Escribe tu mensaje aquí..."
                                    />
                                    <p className="text-xs text-muted-foreground pl-1">
                                        El enlace a la cotización se añadirá automáticamente al final del mensaje.
                                    </p>
                                </div>

                                {/* Quick Preview of Link */}
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                                    <ExternalLink className="h-4 w-4 mt-0.5 shrink-0" />
                                    <p>
                                        El cliente recibirá un enlace único para ver la cotización online: <br />
                                        <span className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">/quote/{quote.id}</span>
                                    </p>
                                </div>
                            </>
                        )
                    ) : null}
                </div>

                {/* Footer Buttons */}
                {!sentSuccess && !loadingQuote && (
                    <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-3 flex-none">
                        <Button
                            onClick={handleSendViaBot}
                            disabled={sending || !quote}
                            className="w-full h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {sending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Share2 className="h-5 w-5 mr-2" />}
                            Enviar ahora (Bot)
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleOpenWhatsAppWeb}
                            className="w-full text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 dark:border-green-800/50 dark:hover:bg-green-900/20"
                        >
                            Abrir en WhatsApp Web
                        </Button>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
