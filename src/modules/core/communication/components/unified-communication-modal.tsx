"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, Mail, Send, FileText, CheckCircle2, Loader2, Sparkles, Globe, Briefcase, FileSignature, Wallet, ArrowRight, Phone } from "lucide-react"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { sendTemplateEmail } from "@/modules/core/notifications/actions/send-template-email"
import { toast } from "sonner"
import { cn, getPortalShortUrl } from "@/lib/utils"

interface UnifiedCommunicationModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    client: {
        id: string
        name: string
        phone?: string
        email?: string
        company_name?: string
        invoices?: any[]
        quotes?: any[]
        portal_token?: string
        portal_short_token?: string
    }
    context?: {
        type: 'invoice' | 'quote' | 'general'
        data?: any
    }
    settings?: any
}

type CommunicationIntent = 'chat' | 'invoice' | 'quote' | 'portal' | 'brief'

export function UnifiedCommunicationModal({ isOpen, onOpenChange, client, context, settings }: UnifiedCommunicationModalProps) {
    const [activeTab, setActiveTab] = useState("whatsapp")
    const [intent, setIntent] = useState<CommunicationIntent>('chat')
    const [loading, setLoading] = useState(false)

    // Selection State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("all")
    const [selectedQuoteId, setSelectedQuoteId] = useState<string>("")
    const [shareAllInvoices, setShareAllInvoices] = useState(false)

    // WA State
    const [waMessage, setWaMessage] = useState("")

    // Email State
    const [emailSubject, setEmailSubject] = useState("")
    const [emailSent, setEmailSent] = useState(false)

    // Derived Data
    const pendingInvoices = useMemo(() =>
        client.invoices?.filter((i: any) => ['pending', 'overdue'].includes(i.status)) || [],
        [client.invoices])

    const quotes = useMemo(() =>
        client.quotes?.filter((q: any) => q.status !== 'draft') || [],
        [client.quotes])

    const portalLink = useMemo(() =>
        getPortalShortUrl(client.portal_short_token || client.portal_token || ''),
        [client])

    // --- INITIALIZATION ---

    useEffect(() => {
        if (isOpen) {
            // Reset State
            setEmailSent(false)
            setShareAllInvoices(false)

            // Set Intent based on Context
            if (context?.type === 'invoice') {
                setIntent('invoice')
                setSelectedInvoiceId(context.data?.id || "")
            } else if (context?.type === 'quote') {
                setIntent('quote')
                setSelectedQuoteId(context.data?.id || "")
            } else {
                setIntent('chat')
            }
        }
    }, [isOpen, context])

    // --- SYNC MESSAGES ---

    useEffect(() => {
        if (!isOpen) return

        let waText = ""
        let mailSub = ""

        const agencyName = settings?.agency_name || "Nuestra Agencia"
        const clientName = client.name.split(' ')[0]

        switch (intent) {
            case 'chat':
                waText = `Hola ${clientName}, ¿cómo estás? Te escribo de ${agencyName}.`
                mailSub = `Hola ${clientName} - ${agencyName}`
                break

            case 'portal':
                waText = `Hola ${clientName}, aquí tienes acceso a tu portal de cliente: ${portalLink}`
                mailSub = `Acceso a tu Portal - ${agencyName}`
                break

            case 'brief':
                waText = `Hola ${clientName}, necesitamos tu ayuda con este briefing para avanzar.`
                mailSub = `Briefing Pendiente - ${agencyName}`
                break

            case 'invoice':
                if (shareAllInvoices) {
                    const total = pendingInvoices.reduce((sum, i) => sum + i.total, 0)
                    waText = `Hola ${clientName}, te comparto el resumen de facturas pendientes por un total de $${total.toLocaleString()}.\n\nPuedes verlas y pagar aquí: ${portalLink}`
                    mailSub = `Estado de Cuenta (${pendingInvoices.length} facturas) - ${agencyName}`
                } else {
                    const invoice = client.invoices?.find(i => i.id === selectedInvoiceId)
                    if (invoice) {
                        waText = `Hola ${clientName}, adjunto tu factura #${invoice.number} por valor de $${invoice.total.toLocaleString()}.\n\nPuedes verla aquí: ${portalLink}`
                        mailSub = `Factura #${invoice.number} - ${agencyName}`
                    } else {
                        waText = `Selecciona una factura...`
                        mailSub = `Factura - ${agencyName}`
                    }
                }
                break

            case 'quote':
                const quote = client.quotes?.find(q => q.id === selectedQuoteId)
                if (quote) {
                    const titleText = quote.title ? ` "${quote.title}"` : ''
                    waText = `Hola ${clientName}, aquí tienes la cotización${titleText} (#${quote.number}).\n\nRevisala aquí: ${portalLink}`

                    const subjectTitle = quote.title ? `: ${quote.title}` : ''
                    mailSub = `Cotización${subjectTitle} (#${quote.number}) - ${agencyName}`
                } else {
                    waText = `Selecciona una cotización...`
                    mailSub = `Cotización - ${agencyName}`
                }
                break
        }

        setWaMessage(waText)
        setEmailSubject(mailSub)

    }, [intent, selectedInvoiceId, selectedQuoteId, shareAllInvoices, client, settings, portalLink, isOpen])


    // --- HANDLERS ---

    const handleSendWhatsApp = () => {
        if (!client.phone) {
            toast.error("El cliente no tiene teléfono registrado")
            return
        }
        const link = getWhatsAppLink(client.phone, waMessage, settings)
        window.open(link, '_blank')
        onOpenChange(false)
    }

    const handleSendEmail = async () => {
        if (!client.email) {
            toast.error("El cliente no tiene email registrado")
            return
        }

        setLoading(true)
        try {
            // Determine Context ID
            let contextId = undefined
            let templateKey = 'custom'

            if (intent === 'invoice') {
                templateKey = 'invoice_new'
                // If sharing all, maybe we send a special summary email?
                // For now, if sharing single invoice, send ID.
                if (!shareAllInvoices) contextId = selectedInvoiceId
            } else if (intent === 'quote') {
                templateKey = 'quote_new'
                contextId = selectedQuoteId
            }

            const result = await sendTemplateEmail({
                clientId: client.id,
                templateKey: templateKey,
                contextId: contextId,
                customSubject: emailSubject
            })

            if (result.success) {
                toast.success("Email enviado correctamente")
                setEmailSent(true)
                setTimeout(() => onOpenChange(false), 2000)
            } else {
                const errorMessage = typeof result.error === 'object' && result.error !== null
                    ? (result.error as any).message || JSON.stringify(result.error)
                    : result.error || "Error al enviar email"
                toast.error(errorMessage)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[650px] p-0 gap-0 bg-white dark:bg-slate-950 border-0 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300">

                {/* Header with Tabs wrapped in */}
                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <div className="p-6 pb-4">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {/* Dynamic Icon based on Intent */}
                            <div className={cn("p-2 rounded-lg transition-colors duration-300",
                                intent === 'chat' ? "bg-green-100 text-green-600" :
                                    intent === 'invoice' ? "bg-blue-100 text-blue-600" :
                                        intent === 'quote' ? "bg-purple-100 text-purple-600" :
                                            intent === 'portal' ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
                            )}>
                                {intent === 'chat' && <MessageSquare className="h-5 w-5" />}
                                {intent === 'invoice' && <FileText className="h-5 w-5" />}
                                {intent === 'quote' && <Sparkles className="h-5 w-5" />}
                                {intent === 'portal' && <Globe className="h-5 w-5" />}
                                {intent === 'brief' && <Briefcase className="h-5 w-5" />}
                            </div>
                            <span>
                                {intent === 'chat' ? 'Iniciar Conversación' :
                                    intent === 'invoice' ? 'Compartir Facturación' :
                                        intent === 'quote' ? 'Enviar Cotización' :
                                            intent === 'portal' ? 'Compartir Acceso' : 'Solicitar Briefing'}
                            </span>
                        </DialogTitle>
                        <DialogDescription className="mt-1 flex items-center gap-2">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{client.name}</span>
                            {client.company_name && <span className="text-slate-400">• {client.company_name}</span>}
                        </DialogDescription>
                    </div>

                    {/* INTENT SELECTOR PILLS */}
                    <div className="px-6 pb-0 flex gap-1 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'chat', label: 'Chat', icon: MessageSquare },
                            { id: 'invoice', label: 'Facturas', icon: FileText },
                            { id: 'quote', label: 'Cotizaciones', icon: FileSignature },
                            { id: 'portal', label: 'Portal', icon: Globe },
                            { id: 'brief', label: 'Briefing', icon: Briefcase },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setIntent(item.id as CommunicationIntent)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 outline-none hover:bg-slate-100/50 dark:hover:bg-slate-800 rounded-t-lg",
                                    intent === item.id
                                        ? "border-slate-900 text-slate-900 dark:border-white dark:text-white"
                                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row h-[500px]">
                    {/* LEFT: Configuration & Context */}
                    <div className="flex-1 p-6 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-y-auto">

                        {/* DYNAMIC CONTENT SELECTORS */}
                        <div className="space-y-6">

                            {/* INVOICE SELECTOR */}
                            {intent === 'invoice' && (
                                <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                                    <div
                                        onClick={() => setShareAllInvoices(!shareAllInvoices)}
                                        className={cn("p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 group",
                                            shareAllInvoices ? "border-blue-500 bg-blue-50/50" : "border-slate-100 hover:border-blue-200"
                                        )}
                                    >
                                        <div className={cn("h-5 w-5 rounded-full border flex items-center justify-center transition-colors", shareAllInvoices ? "bg-blue-500 border-blue-500" : "border-slate-300 bg-white")}>
                                            {shareAllInvoices && <CheckCircle2 className="h-3 w-3 text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-slate-900">Resumen de Cuenta</p>
                                            <p className="text-xs text-slate-500">Enviar total pendiente (${pendingInvoices.reduce((a, b) => a + b.total, 0).toLocaleString()})</p>
                                        </div>
                                        <Wallet className={cn("h-5 w-5", shareAllInvoices ? "text-blue-500" : "text-slate-300")} />
                                    </div>

                                    {!shareAllInvoices && (
                                        <div className="space-y-2">
                                            <Label>Seleccionar Factura</Label>
                                            {pendingInvoices.length > 0 ? (
                                                <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                                    <SelectTrigger className="w-full h-11">
                                                        <SelectValue placeholder="Elige una factura..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {pendingInvoices.map((inv: any) => (
                                                            <SelectItem key={inv.id} value={inv.id}>
                                                                #{inv.number} - ${inv.total.toLocaleString()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                                                    No hay facturas pendientes.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* QUOTE SELECTOR */}
                            {intent === 'quote' && (
                                <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
                                    <div className="space-y-2">
                                        <Label>Seleccionar Cotización</Label>
                                        {quotes.length > 0 ? (
                                            <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder="Elige una cotización..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {quotes.map((q: any) => (
                                                        <SelectItem key={q.id} value={q.id}>
                                                            #{q.number} {q.title ? `- ${q.title}` : ''} (${q.total.toLocaleString()})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="text-sm text-slate-500 italic p-2 border rounded-lg bg-slate-50">
                                                No hay cotizaciones activas.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PORTAL INFO */}
                            {intent === 'portal' && (
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 text-orange-800 text-sm animate-in slide-in-from-left-2 duration-300">
                                    <p className="font-semibold mb-1">Enlace Seguro</p>
                                    <p className="opacity-80 break-all text-xs">{portalLink}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Canal de Envío</h4>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <TabsTrigger value="whatsapp" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <MessageSquare className="h-4 w-4 mr-2" /> WhatsApp
                                    </TabsTrigger>
                                    <TabsTrigger value="email" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                        <Mail className="h-4 w-4 mr-2" /> Email
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    {/* RIGHT: Preview & Action */}
                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-6 relative">
                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            {activeTab === 'whatsapp' ? <MessageSquare className="h-48 w-48" /> : <Mail className="h-48 w-48" />}
                        </div>

                        <div className="flex-1 flex flex-col z-10">
                            <Label className="mb-3 text-xs uppercase tracking-wider text-slate-400 font-bold">Vista Previa</Label>

                            {activeTab === 'whatsapp' ? (
                                <div className="flex-1 flex flex-col animate-in fade-in-50 duration-300">
                                    <div className="flex-1 bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm relative group mb-4">
                                        <Textarea
                                            value={waMessage}
                                            onChange={(e) => setWaMessage(e.target.value)}
                                            className="w-full h-full min-h-[150px] border-none focus-visible:ring-0 p-0 text-sm resize-none bg-transparent"
                                            placeholder="Escribe tu mensaje..."
                                        />
                                        <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity">
                                            {waMessage.length} caracteres
                                        </div>
                                    </div>
                                    <Button
                                        size="lg" // Larger button
                                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold h-12 rounded-xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
                                        onClick={handleSendWhatsApp}
                                    >
                                        <Send className="h-5 w-5 mr-2" /> Abrir WhatsApp
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-400 mt-2">Se abrirá WhatsApp {client.phone ? '' : '(Sin teléfono)'} en una pestaña nueva.</p>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col animate-in fade-in-50 duration-300">
                                    {/* Email Preview Card */}
                                    {emailSent ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                                <CheckCircle2 className="h-8 w-8" />
                                            </div>
                                            <h3 className="font-bold text-slate-900">¡Enviado!</h3>
                                            <p className="text-sm text-slate-500">Revisa la bandeja de salida.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-white dark:bg-slate-800 border rounded-xl p-4 shadow-sm mb-4 space-y-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase text-slate-400">Asunto</Label>
                                                    <Input
                                                        value={emailSubject}
                                                        onChange={e => setEmailSubject(e.target.value)}
                                                        className="h-9 font-medium text-sm border-0 bg-slate-50 dark:bg-slate-700/50 focus-visible:ring-0 px-2"
                                                    />
                                                </div>
                                                <div className="h-px bg-slate-100 dark:bg-slate-700" />
                                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-dashed border-slate-200 dark:border-slate-700 h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
                                                    <Mail className="h-6 w-6 opacity-20" />
                                                    <span className="text-xs">Plantilla HTML: {intent === 'chat' ? 'Layout General' : intent === 'invoice' ? 'Factura Corporativa' : 'Cotización Premium'}</span>
                                                </div>
                                            </div>

                                            <Button
                                                size="lg"
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                                                onClick={handleSendEmail}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mail className="h-5 w-5 mr-2" />}
                                                {loading ? "Enviando..." : "Enviar Email"}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
