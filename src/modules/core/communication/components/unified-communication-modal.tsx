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
import { Checkbox } from "@/components/ui/checkbox"
import { MessageSquare, Mail, Send, FileText, CheckCircle2, Loader2, Sparkles, Globe, Briefcase, FileSignature, Wallet, Archive, RefreshCw, User, Phone, AtSign } from "lucide-react"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { sendTemplateEmail } from "@/modules/core/notifications/actions/send-template-email"
import { toast } from "sonner"
import { cn, getPortalShortUrl } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase" // Client-side instance

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

type CommunicationChannel = 'email' | 'whatsapp'
type DocumentType = 'none' | 'invoice' | 'quote' | 'brief' | 'portal'

export function UnifiedCommunicationModal({ isOpen, onOpenChange, client: initialClient, context, settings }: UnifiedCommunicationModalProps) {
    const [channel, setChannel] = useState<CommunicationChannel>('email')
    const [docType, setDocType] = useState<DocumentType>('none')
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Data State (Fetch fresh data)
    const [clientData, setClientData] = useState(initialClient)

    // Selection State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('all') // 'all' or specific ID
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(undefined)

    // Message State
    const [waMessage, setWaMessage] = useState("")
    const [emailSubject, setEmailSubject] = useState("")

    // Derived Data
    const pendingInvoices = useMemo(() =>
        clientData.invoices?.filter((i: any) => ['pending', 'overdue'].includes(i.status)) || [],
        [clientData.invoices])

    const quotes = useMemo(() =>
        clientData.quotes?.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [],
        [clientData.quotes])

    const portalLink = useMemo(() =>
        getPortalShortUrl(clientData.portal_short_token || clientData.portal_token || ''),
        [clientData])

    // --- SYNC INITIAL DATA ---
    // Critical: When opening for a different client, reset the local state immediately
    useEffect(() => {
        setClientData(initialClient)
    }, [initialClient.id, initialClient.portal_token])

    // --- FRESH DATA FETCH ---
    const refreshClientData = async () => {
        if (!isOpen) return
        setRefreshing(true)
        try {
            // Fetch fresh invoices
            const { data: invoices } = await supabase.from('invoices').select('*').eq('client_id', initialClient.id).order('created_at', { ascending: false })

            // Fetch fresh quotes
            const { data: quotesData } = await supabase.from('quotes')
                .select('*')
                .eq('client_id', initialClient.id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            setClientData(prev => ({
                ...prev,
                // Ensure name/email are synced if we ever fetch them fresh, but for now just update docs
                // Force sync with initialClient in case of race conditions, but strictly update lists
                id: initialClient.id,
                name: initialClient.name,
                email: initialClient.email,
                phone: initialClient.phone,
                portal_token: initialClient.portal_token,
                portal_short_token: initialClient.portal_short_token,
                invoices: invoices || prev.invoices,
                quotes: quotesData || prev.quotes
            }))
        } catch (e) {
            console.error("Error refreshing data", e)
        } finally {
            setRefreshing(false)
        }
    }

    // Initialize & Sync
    useEffect(() => {
        if (isOpen) {
            refreshClientData()

            // Set Context Defaults
            if (context?.type === 'invoice') {
                setDocType('invoice')
                setSelectedInvoiceId(context.data?.id || 'all')
            } else if (context?.type === 'quote') {
                setDocType('quote')
                setSelectedQuoteId(context.data?.id)
            } else {
                setDocType('portal') // Default to Portal Invite instead of 'none' for better UX
            }
        }
    }, [isOpen, context, initialClient.id])



    // Auto-select quote if only one, or update selection if list changes
    useEffect(() => {
        if (isOpen && docType === 'quote' && !selectedQuoteId && quotes.length > 0) {
            setSelectedQuoteId(quotes[0].id)
        }
    }, [isOpen, docType, quotes, selectedQuoteId])


    // --- COMPOSE MESSAGES ---
    useEffect(() => {
        if (!isOpen) return

        const agencyName = settings?.agency_name || "Nuestra Agencia"
        const clientFirstName = clientData.name.split(' ')[0]

        let subject = ""
        let waText = ""

        if (docType === 'portal') {
            subject = `Acceso a tu Portal - ${agencyName}`
            waText = `Hola ${clientFirstName}, aquí tienes el enlace de acceso a tu portal de cliente: ${portalLink}`
        }
        else if (docType === 'invoice') {
            if (selectedInvoiceId === 'all') {
                const total = pendingInvoices.reduce((sum, i) => sum + i.total, 0)
                const count = pendingInvoices.length
                subject = `Estado de Cuenta (${count} facturas) - ${agencyName}`
                waText = `Hola ${clientFirstName}, te comparto tu estado de cuenta con ${count} facturas pendientes por $${total.toLocaleString()}.\n\nPuedes ver el detalle y pagar aquí: ${portalLink}`
            } else {
                const inv = pendingInvoices.find(i => i.id === selectedInvoiceId)
                if (inv) {
                    subject = `Factura #${inv.number} - ${agencyName}`
                    waText = `Hola ${clientFirstName}, adjunto tu factura #${inv.number} por valor de $${inv.total.toLocaleString()}.\n\nPuedes verla aquí: ${portalLink}`
                }
            }
        }
        else if (docType === 'quote') {
            const q = quotes.find(qt => qt.id === selectedQuoteId)
            if (q) {
                subject = `Cotización #${q.number}: ${q.title || 'Propuesta'} - ${agencyName}`
                waText = `Hola ${clientFirstName}, aquí tienes la cotización #${q.number} "${q.title || ''}".\n\nRevisala aquí: ${portalLink}`
            } else {
                subject = `Nueva Cotización - ${agencyName}`
                waText = `Hola ${clientFirstName}, te envío una nueva cotización.`
            }
        }
        else if (docType === 'brief') {
            subject = `Briefing Pendiente - ${agencyName}`
            waText = `Hola ${clientFirstName}, necesitamos tu apoyo respondiendo este briefing en el portal.`
        }

        setEmailSubject(subject)
        setWaMessage(waText)

    }, [docType, selectedInvoiceId, selectedQuoteId, clientData, pendingInvoices, quotes, settings, portalLink, isOpen])


    // --- ACTIONS ---

    const handleSend = async () => {
        if (channel === 'whatsapp') {
            if (!clientData.phone) {
                toast.error("El cliente no tiene teléfono registrado")
                return
            }
            const link = getWhatsAppLink(clientData.phone, waMessage, settings)
            window.open(link, '_blank')
            onOpenChange(false)
            return
        }

        if (channel === 'email') {
            if (!clientData.email) {
                toast.error("El cliente no tiene email registrado")
                return
            }

            setLoading(true)
            try {
                let contextId: string | undefined = undefined
                let templateKey = 'custom'

                if (docType === 'invoice') {
                    if (selectedInvoiceId === 'all') {
                        templateKey = 'invoice_summary'
                        contextId = clientData.id // Context is Client ID for summary
                    } else {
                        templateKey = 'invoice_new'
                        contextId = selectedInvoiceId
                    }
                } else if (docType === 'quote') {
                    templateKey = 'quote_new'
                    contextId = selectedQuoteId
                } else if (docType === 'portal') {
                    templateKey = 'portal_invite'
                }

                // Call Server Action
                const result = await sendTemplateEmail({
                    clientId: clientData.id,
                    templateKey: templateKey,
                    contextId: contextId,
                    customSubject: emailSubject
                })

                if (result.success) {
                    toast.success("Email enviado correctamente")
                    setTimeout(() => onOpenChange(false), 1500)
                } else {
                    const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
                    toast.error("Error al enviar: " + errorMsg)
                }
            } catch (err) {
                console.error(err)
                toast.error("Error inesperado en el envío")
            } finally {
                setLoading(false)
            }
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl flex flex-col p-0 gap-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-2xl sm:rounded-xl h-[600px]">

                {/* HEADER */}
                <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b flex items-center justify-between shrink-0">
                    <div>
                        <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                            Centro de Comunicaciones
                            {refreshing && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </DialogTitle>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {clientData.name}</span>
                            {clientData.email && <span className="flex items-center gap-1"><AtSign className="w-3 h-3" /> {clientData.email}</span>}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={refreshClientData} title="Refrescar Datos">
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto grid md:grid-cols-[1.2fr,1.8fr] divide-x">

                    {/* LEFT: CONFIGURATION */}
                    <div className="p-6 flex flex-col gap-6 bg-zinc-50/50 dark:bg-zinc-900/10">

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Configuración del Envío</Label>
                                {refreshing && <span className="text-xs text-muted-foreground animate-pulse">Actualizando...</span>}
                            </div>

                            {/* COMPACT ROW: TYPE + SELECTOR */}
                            <div className="flex gap-3">
                                {/* Type Selector */}
                                <div className="w-[180px]">
                                    <Select value={docType} onValueChange={(v) => {
                                        setDocType(v as DocumentType)
                                        // Reset sub-selections
                                        if (v === 'invoice') setSelectedInvoiceId('all')
                                        if (v === 'quote' && quotes.length > 0) setSelectedQuoteId(quotes[0].id)
                                    }}>
                                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 h-10">
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="portal">📨 Invitación</SelectItem>
                                            <SelectItem value="invoice">💰 Factura</SelectItem>
                                            <SelectItem value="quote">🚀 Cotización</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Dynamic Document Selector */}
                                <div className="flex-1">
                                    {docType === 'invoice' && (
                                        <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                            <SelectTrigger className="bg-white dark:bg-zinc-900 h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="font-medium">
                                                    📊 Resumen Global (${pendingInvoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()})
                                                </SelectItem>
                                                {pendingInvoices.map((inv: any) => (
                                                    <SelectItem key={inv.id} value={inv.id}>
                                                        #{inv.number} - ${inv.total.toLocaleString()}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {docType === 'quote' && (
                                        <>
                                            {quotes.length > 0 ? (
                                                <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                                                    <SelectTrigger className="bg-white dark:bg-zinc-900 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {quotes.map((q: any) => (
                                                            <SelectItem key={q.id} value={q.id}>
                                                                #{q.number} - {q.title || 'Sin título'} (${(q.total || 0).toLocaleString()})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex items-center px-3 text-xs text-amber-600 bg-amber-50 rounded border border-amber-100 h-10">
                                                    Sin cotizaciones
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {docType === 'portal' && (
                                        <div className="flex items-center px-3 text-xs text-muted-foreground bg-zinc-100 rounded border border-zinc-200 h-10">
                                            Enlace automático al portal
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>



                        <div className="space-y-3 mt-auto pt-6 border-t">
                            <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Canal de Envío</Label>
                            <Tabs value={channel} onValueChange={(v) => setChannel(v as CommunicationChannel)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-10">
                                    <TabsTrigger value="email" className="gap-2"><Mail className="w-4 h-4" /> Email</TabsTrigger>
                                    <TabsTrigger value="whatsapp" className="gap-2"><MessageSquare className="w-4 h-4" /> WhatsApp</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    {/* RIGHT: PREVIEW & ACTION */}
                    <div className="p-6 flex flex-col bg-white dark:bg-zinc-900">
                        <div className="mb-4">
                            <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">3. Destinatario & Mensaje</Label>
                        </div>

                        <div className="flex-1 flex flex-col gap-4">


                            {/* MESSAGE PREVIEW */}
                            {channel === 'email' ? (
                                <div className="space-y-3 flex-1">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Asunto del Correo</Label>
                                        <Input
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            className="font-medium"
                                        />
                                    </div>
                                    <div className="flex-1 rounded-md border border-dashed bg-zinc-50 p-4 flex flex-col items-center justify-center text-center gap-2">

                                        <p className="text-xs text-muted-foreground max-w-[250px]">
                                            El correo usará la plantilla <strong>{docType === 'invoice' && selectedInvoiceId === 'all' ? 'Resumen de Cuenta' : 'Estándar'}</strong> con tu branding.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1 flex-1 flex flex-col">
                                    <Label className="text-xs text-muted-foreground">Mensaje de WhatsApp</Label>
                                    <Textarea
                                        value={waMessage}
                                        onChange={(e) => setWaMessage(e.target.value)}
                                        className="flex-1 resize-none bg-zinc-50 dark:bg-zinc-900 border-zinc-200"
                                    />
                                </div>
                            )}

                            {/* ACTION BUTTON */}
                            <Button
                                size="lg"
                                className={cn("w-full gap-2 mt-4 font-semibold text-white shadow-lg",
                                    channel === 'whatsapp' ? "bg-[#25D366] hover:bg-[#128C7E]" : "bg-indigo-600 hover:bg-indigo-700"
                                )}
                                onClick={handleSend}
                                disabled={loading || (docType === 'quote' && !selectedQuoteId)}
                            >
                                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                {!loading && (channel === 'whatsapp' ? <Send className="w-5 h-5" /> : <Mail className="w-5 h-5" />)}
                                {channel === 'whatsapp' ? "Enviar WhatsApp" : "Enviar Correo"}
                            </Button>
                        </div>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    )
}
