"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    MessageSquare,
    Mail,
    Send,
    SendHorizontal,
    FileText,
    CheckCircle2,
    Loader2,
    Sparkles,
    Globe,
    Briefcase,
    FileSignature,
    Wallet,
    Archive,
    RefreshCw,
    User,
    Phone,
    AtSign,
    Copy,
    Check,
    ExternalLink,
    Clock,
    CheckCheck
} from "lucide-react"
import { getWhatsAppLink } from "@/modules/features/messaging/communication-utils"
import { sendTemplateEmail } from "@/modules/features/notifications/actions/send-template-email"
import { toast } from "sonner"
import { cn, getPortalShortUrl } from "@/modules/infrastructure/utils/utils"
import { supabase } from "@/modules/core/database/supabase"

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
        briefings?: any[]
        portal_token?: string
        portal_short_token?: string
    } | null
    context?: {
        type: 'invoice' | 'quote' | 'brief' | 'general'
        data?: any
    }
    settings?: any
}

type CommunicationChannel = 'email' | 'whatsapp'
type DocumentType = 'portal' | 'invoice' | 'quote' | 'brief'

export function UnifiedCommunicationModal({
    isOpen,
    onOpenChange,
    client: initialClient,
    context,
    settings
}: UnifiedCommunicationModalProps) {
    const [channel, setChannel] = useState<CommunicationChannel>('whatsapp')
    const [docType, setDocType] = useState<DocumentType>('portal')
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    // Data State
    const [clientData, setClientData] = useState(initialClient)
    const [briefings, setBriefings] = useState<any[]>([])

    // Selection State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('all')
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(undefined)
    const [selectedBriefingId, setSelectedBriefingId] = useState<string | undefined>(undefined)

    // Message & Subject State
    const [waMessage, setWaMessage] = useState("")
    const [emailSubject, setEmailSubject] = useState("")

    // Derived Lists
    const pendingInvoices = useMemo(() =>
        clientData?.invoices?.filter((i: any) => ['pending', 'overdue'].includes(i.status)) || [],
        [clientData?.invoices])

    const quotes = useMemo(() =>
        clientData?.quotes?.slice().sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [],
        [clientData?.quotes])

    // Refresh client documents including briefings
    const refreshClientData = async () => {
        if (!isOpen || !initialClient?.id) return
        setRefreshing(true)
        try {
            const [invRes, quotesRes, briefRes] = await Promise.all([
                supabase
                    .from('invoices')
                    .select('*')
                    .eq('client_id', initialClient.id)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('quotes')
                    .select('*')
                    .eq('client_id', initialClient.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('briefings')
                    .select('id, token, status, created_at, template:briefing_templates(id, name)')
                    .eq('client_id', initialClient.id)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false })
            ])

            setClientData(prev => ({
                ...prev,
                id: initialClient.id,
                name: initialClient.name,
                email: initialClient.email,
                phone: initialClient.phone,
                company_name: initialClient.company_name,
                portal_token: initialClient.portal_token,
                portal_short_token: initialClient.portal_short_token,
                invoices: invRes.data || prev?.invoices || [],
                quotes: quotesRes.data || prev?.quotes || [],
                briefings: briefRes.data || []
            }))

            setBriefings(briefRes.data || [])
        } catch (e) {
            console.error("[UnifiedCommunicationModal] Error refreshing data:", e)
        } finally {
            setRefreshing(false)
        }
    }

    // Sync when initialClient changes
    useEffect(() => {
        if (initialClient) {
            setClientData(initialClient)
            if (initialClient.briefings) {
                setBriefings(initialClient.briefings)
            }
        }
    }, [initialClient?.id, initialClient?.portal_token])

    // Initialize context defaults
    useEffect(() => {
        if (isOpen && initialClient) {
            refreshClientData()

            if (context?.type === 'invoice') {
                setDocType('invoice')
                setSelectedInvoiceId(context.data?.id || 'all')
            } else if (context?.type === 'quote') {
                setDocType('quote')
                setSelectedQuoteId(context.data?.id)
            } else if (context?.type === 'brief') {
                setDocType('brief')
                setSelectedBriefingId(context.data?.id)
            } else {
                setDocType('portal')
            }
        }
    }, [isOpen, initialClient?.id, context?.type])

    // Auto-select quote or briefing if only one exists
    useEffect(() => {
        if (docType === 'quote' && !selectedQuoteId && quotes.length > 0) {
            setSelectedQuoteId(quotes[0].id)
        }
        if (docType === 'brief' && !selectedBriefingId && briefings.length > 0) {
            setSelectedBriefingId(briefings[0].id)
        }
    }, [docType, quotes, briefings, selectedQuoteId, selectedBriefingId])

    // Resolve Active Direct URL
    const activeDirectUrl = useMemo(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pixy.com.co'
        const portalToken = clientData?.portal_short_token || clientData?.portal_token || ''
        const portalBase = portalToken ? getPortalShortUrl(portalToken) : `${origin}/portal`

        if (docType === 'portal') {
            return portalBase
        }

        if (docType === 'invoice') {
            if (selectedInvoiceId === 'all') {
                return `${portalBase}?tab=billing`
            }
            return `${portalBase}?tab=billing&inv=${selectedInvoiceId}`
        }

        if (docType === 'quote') {
            const currentQuote = quotes.find(q => q.id === selectedQuoteId)
            if (currentQuote) {
                return `${origin}/quote/${currentQuote.id}`
            }
            return `${portalBase}?tab=quotes`
        }

        if (docType === 'brief') {
            const currentBrief = briefings.find(b => b.id === selectedBriefingId)
            if (currentBrief?.token) {
                return `${origin}/briefing/${currentBrief.token}`
            }
            return `${portalBase}?tab=services`
        }

        return portalBase
    }, [docType, selectedInvoiceId, selectedQuoteId, selectedBriefingId, clientData, quotes, briefings])

    // Auto-generate Subject & WhatsApp message on resource change
    useEffect(() => {
        if (!isOpen || !clientData) return

        const agencyName = settings?.agency_name || "Nuestra Agencia"
        const clientFirstName = clientData.name?.split(' ')[0] || "Cliente"

        let subject = ""
        let waText = ""

        if (docType === 'portal') {
            subject = `Acceso a tu Portal de Cliente - ${agencyName}`
            waText = `Hola ${clientFirstName}, te comparto el acceso exclusivo a tu portal de cliente donde podrás consultar tus proyectos, facturación y servicios:\n\n🔗 ${activeDirectUrl}`
        } else if (docType === 'invoice') {
            if (selectedInvoiceId === 'all') {
                const total = pendingInvoices.reduce((sum, i) => sum + (i.total || 0), 0)
                const count = pendingInvoices.length
                subject = `Estado de Cuenta (${count} facturas pendientes) - ${agencyName}`
                waText = `Hola ${clientFirstName}, te comparto tu estado de cuenta con ${count} factura(s) pendiente(s) por un total de $${total.toLocaleString()}.\n\nPuedes consultar el detalle y pagar en línea aquí:\n🔗 ${activeDirectUrl}`
            } else {
                const inv = pendingInvoices.find(i => i.id === selectedInvoiceId) || clientData.invoices?.find((i: any) => i.id === selectedInvoiceId)
                if (inv) {
                    subject = `Factura #${inv.number} - ${agencyName}`
                    waText = `Hola ${clientFirstName}, adjunto tu factura #${inv.number} por valor de $${(inv.total || 0).toLocaleString()}.\n\nPuedes verla y pagarla directamente aquí:\n🔗 ${activeDirectUrl}`
                } else {
                    subject = `Factura - ${agencyName}`
                    waText = `Hola ${clientFirstName}, te comparto tu factura. Puedes revisarla aquí:\n🔗 ${activeDirectUrl}`
                }
            }
        } else if (docType === 'quote') {
            const q = quotes.find(qt => qt.id === selectedQuoteId)
            if (q) {
                subject = `Cotización #${q.number}: ${q.title || 'Propuesta Comercial'} - ${agencyName}`
                waText = `Hola ${clientFirstName}, te comparto la propuesta comercial #${q.number} "${q.title || 'Servicios'}" por un valor de $${(q.total || 0).toLocaleString()}.\n\nRevisa todos los detalles aquí:\n🔗 ${activeDirectUrl}`
            } else {
                subject = `Propuesta Comercial - ${agencyName}`
                waText = `Hola ${clientFirstName}, te comparto la cotización de tu proyecto:\n🔗 ${activeDirectUrl}`
            }
        } else if (docType === 'brief') {
            const b = briefings.find(br => br.id === selectedBriefingId)
            const briefName = b?.template?.name || "Briefing de Proyecto"
            subject = `Briefing Pendiente: ${briefName} - ${agencyName}`
            waText = `Hola ${clientFirstName}, para avanzar con el desarrollo de tu proyecto requerimos que completes este breve formulario:\n\n📋 *${briefName}*\n🔗 ${activeDirectUrl}\n\n¡Cualquier duda quedamos muy atentos!`
        }

        setEmailSubject(subject)
        setWaMessage(waText)
    }, [docType, selectedInvoiceId, selectedQuoteId, selectedBriefingId, clientData, pendingInvoices, quotes, briefings, settings, activeDirectUrl, isOpen])

    // Copy direct link action
    const handleCopyDirectLink = async () => {
        try {
            await navigator.clipboard.writeText(activeDirectUrl)
            setCopiedLink(true)
            toast.success("Enlace copiado al portapapeles")
            setTimeout(() => setCopiedLink(false), 2500)
        } catch (e) {
            toast.error("No se pudo copiar el enlace")
        }
    }

    // Handle Send Action
    const handleSend = async () => {
        if (!clientData) return

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
                let templateKey = 'portal_invite'

                if (docType === 'invoice') {
                    if (selectedInvoiceId === 'all') {
                        templateKey = 'invoice_summary'
                        contextId = clientData.id
                    } else {
                        templateKey = 'invoice_new'
                        contextId = selectedInvoiceId
                    }
                } else if (docType === 'quote') {
                    templateKey = 'quote_new'
                    contextId = selectedQuoteId
                } else if (docType === 'brief') {
                    templateKey = 'briefing_invite'
                    contextId = selectedBriefingId
                } else if (docType === 'portal') {
                    templateKey = 'portal_invite'
                }

                const result = await sendTemplateEmail({
                    clientId: clientData.id,
                    templateKey: templateKey,
                    contextId: contextId,
                    customSubject: emailSubject
                })

                if (result.success) {
                    toast.success("Correo enviado exitosamente")
                    setTimeout(() => onOpenChange(false), 1200)
                } else {
                    const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error)
                    toast.error("Error al enviar correo: " + errorMsg)
                }
            } catch (err) {
                console.error("[UnifiedCommunicationModal] Send error:", err)
                toast.error("Error inesperado en el envío")
            } finally {
                setLoading(false)
            }
        }
    }

    const getBriefingStatusBadge = (status?: string) => {
        switch (status) {
            case 'submitted':
            case 'locked':
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Completado</Badge>
            case 'in_progress':
                return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px]">En Progreso</Badge>
            case 'sent':
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">Enviado</Badge>
            default:
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">Borrador</Badge>
        }
    }

    if (!clientData) return null

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl rounded-2xl gap-0 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/80 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                            <SendHorizontal className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                Centro de Envíos & Notificaciones
                                {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                            </DialogTitle>
                            <div className="flex items-center gap-2.5 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                    <User className="w-3 h-3 text-zinc-400" />
                                    {clientData.name}
                                </span>
                                {clientData.email && (
                                    <span className="flex items-center gap-1 border-l border-zinc-200 dark:border-white/10 pl-2">
                                        <AtSign className="w-3 h-3 text-zinc-400" />
                                        {clientData.email}
                                    </span>
                                )}
                                {clientData.phone && (
                                    <span className="flex items-center gap-1 border-l border-zinc-200 dark:border-white/10 pl-2">
                                        <Phone className="w-3 h-3 text-zinc-400" />
                                        {clientData.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshClientData}
                        title="Refrescar Datos"
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    </Button>
                </div>

                {/* Body 2-Columns */}
                <div className="flex-1 overflow-y-auto grid md:grid-cols-[1.1fr,1.4fr] divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-white/5">
                    
                    {/* LEFT COLUMN: Controls & Document Selection */}
                    <div className="p-6 flex flex-col gap-5 bg-zinc-50/40 dark:bg-zinc-900/20">
                        {/* Section 1: Resource Category */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                1. Recurso a Compartir
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDocType('portal')}
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold",
                                        docType === 'portal'
                                            ? "bg-white dark:bg-zinc-800 border-brand-pink/50 text-brand-pink shadow-sm ring-1 ring-brand-pink/20"
                                            : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/10"
                                    )}
                                >
                                    <Globe className="h-4 w-4 shrink-0 text-blue-500" />
                                    <span>Portal Cliente</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDocType('invoice')}
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold",
                                        docType === 'invoice'
                                            ? "bg-white dark:bg-zinc-800 border-brand-pink/50 text-brand-pink shadow-sm ring-1 ring-brand-pink/20"
                                            : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/10"
                                    )}
                                >
                                    <Wallet className="h-4 w-4 shrink-0 text-emerald-500" />
                                    <span>Facturación</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDocType('quote')}
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold",
                                        docType === 'quote'
                                            ? "bg-white dark:bg-zinc-800 border-brand-pink/50 text-brand-pink shadow-sm ring-1 ring-brand-pink/20"
                                            : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/10"
                                    )}
                                >
                                    <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
                                    <span>Cotizaciones</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setDocType('brief')}
                                    className={cn(
                                        "flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all text-xs font-semibold",
                                        docType === 'brief'
                                            ? "bg-white dark:bg-zinc-800 border-brand-pink/50 text-brand-pink shadow-sm ring-1 ring-brand-pink/20"
                                            : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/10"
                                    )}
                                >
                                    <FileSignature className="h-4 w-4 shrink-0 text-purple-500" />
                                    <span>Briefings</span>
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Specific Item Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                Elemento Seleccionado
                            </Label>

                            {docType === 'portal' && (
                                <div className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Invitación al Portal</span>
                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            Activo
                                        </Badge>
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Enlace directo con token de acceso seguro para el cliente.
                                    </p>
                                </div>
                            )}

                            {docType === 'invoice' && (
                                <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                    <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-xs rounded-xl h-10 font-medium">
                                        <SelectValue placeholder="Selecciona factura" />
                                    </SelectTrigger>
                                    <SelectContent className="dark:bg-zinc-900 dark:border-white/10">
                                        <SelectItem value="all" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            📊 Resumen Global ({pendingInvoices.length} facturas pendientes - ${pendingInvoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()})
                                        </SelectItem>
                                        {pendingInvoices.map((inv: any) => (
                                            <SelectItem key={inv.id} value={inv.id} className="text-xs">
                                                Factura #{inv.number} — ${Number(inv.total || 0).toLocaleString()} ({inv.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {docType === 'quote' && (
                                <>
                                    {quotes.length > 0 ? (
                                        <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-xs rounded-xl h-10 font-medium">
                                                <SelectValue placeholder="Selecciona cotización" />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-zinc-900 dark:border-white/10">
                                                {quotes.map((q: any) => (
                                                    <SelectItem key={q.id} value={q.id} className="text-xs">
                                                        #{q.number} — {q.title || 'Propuesta'} (${Number(q.total || 0).toLocaleString()})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                            No hay cotizaciones registradas para este cliente.
                                        </div>
                                    )}
                                </>
                            )}

                            {docType === 'brief' && (
                                <>
                                    {briefings.length > 0 ? (
                                        <Select value={selectedBriefingId} onValueChange={setSelectedBriefingId}>
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 text-xs rounded-xl h-10 font-medium">
                                                <SelectValue placeholder="Selecciona briefing" />
                                            </SelectTrigger>
                                            <SelectContent className="dark:bg-zinc-900 dark:border-white/10">
                                                {briefings.map((b: any) => (
                                                    <SelectItem key={b.id} value={b.id} className="text-xs">
                                                        📋 {b.template?.name || 'Briefing'} ({b.status || 'draft'})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                                            No hay briefings creados para este cliente aún.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Section 3: Communication Channel */}
                        <div className="space-y-2 pt-2 border-t border-zinc-200/70 dark:border-white/5">
                            <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                2. Canal de Despacho
                            </Label>
                            <Tabs value={channel} onValueChange={(v) => setChannel(v as CommunicationChannel)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-zinc-200/60 dark:bg-white/5 rounded-xl">
                                    <TabsTrigger
                                        value="whatsapp"
                                        className="text-xs font-semibold gap-1.5 data-[state=active]:bg-[#25D366] data-[state=active]:text-white rounded-lg transition-all"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        WhatsApp
                                    </TabsTrigger>
                                    <TabsTrigger
                                        value="email"
                                        className="text-xs font-semibold gap-1.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg transition-all"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        Email
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Section 4: 1-Click Copy Direct Link */}
                        <div className="mt-auto pt-4 border-t border-zinc-200/70 dark:border-white/5 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Enlace Directo
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyDirectLink}
                                    className="h-7 px-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 rounded-lg transition-all"
                                >
                                    {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copiedLink ? "¡Copiado!" : "Copiar Enlace"}
                                </Button>
                            </div>
                            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate select-all">
                                {activeDirectUrl}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Interactive Live Preview & Actions */}
                    <div className="p-6 flex flex-col justify-between bg-white dark:bg-zinc-950 gap-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Previsualización en Vivo ({channel === 'whatsapp' ? 'WhatsApp' : 'Correo'})
                                </Label>
                            </div>

                            {/* PREVIEW: WHATSAPP */}
                            {channel === 'whatsapp' && (
                                <div className="space-y-3">
                                    {/* Editable Text */}
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                            Mensaje editable (se enviará a {clientData.phone || 'número no configurado'})
                                        </Label>
                                        <Textarea
                                            value={waMessage}
                                            onChange={(e) => setWaMessage(e.target.value)}
                                            className="min-h-[90px] text-xs bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 rounded-xl resize-none leading-relaxed"
                                        />
                                    </div>

                                    {/* Real WhatsApp Chat Bubble Mockup */}
                                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm">
                                        {/* WhatsApp App Bar */}
                                        <div className="px-4 py-2.5 bg-[#075E54] text-white flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
                                                    {clientData.name?.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold leading-tight">{clientData.name}</p>
                                                    <p className="text-[9px] text-emerald-200">en línea</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-emerald-100">WhatsApp</span>
                                        </div>

                                        {/* WhatsApp Chat Canvas */}
                                        <div className="p-4 bg-[#efeae2] dark:bg-[#0b141a] min-h-[140px] flex flex-col justify-end">
                                            {/* Outgoing Bubble */}
                                            <div className="self-end max-w-[88%] bg-[#d9fdd3] dark:bg-[#005c4b] text-zinc-800 dark:text-zinc-100 rounded-2xl rounded-tr-sm p-3 text-xs shadow-sm space-y-1 leading-relaxed border border-emerald-500/10">
                                                <p className="whitespace-pre-wrap">{waMessage}</p>
                                                <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-300 mt-1">
                                                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PREVIEW: EMAIL */}
                            {channel === 'email' && (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                            Asunto del Correo
                                        </Label>
                                        <Input
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            className="h-9 text-xs font-medium bg-zinc-50/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 rounded-xl"
                                        />
                                    </div>

                                    {/* Branded Email Mockup Card */}
                                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 shadow-sm bg-zinc-50 dark:bg-zinc-900/80">
                                        {/* Email Client Header */}
                                        <div className="px-4 py-2 border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Para:</span>
                                                <span className="font-mono text-zinc-600 dark:text-zinc-400">{clientData.email || "cliente@ejemplo.com"}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-400">Plantilla Oficial</span>
                                        </div>

                                        {/* Email Body Card */}
                                        <div className="p-5 text-xs text-zinc-700 dark:text-zinc-300 space-y-3">
                                            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                {settings?.agency_name || "Nuestra Agencia"}
                                            </div>

                                            <p className="leading-relaxed">
                                                Hola <strong>{clientData.name}</strong>,
                                            </p>

                                            <div className="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-white/10 space-y-1">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                    {docType === 'portal' && "Invitación al Portal"}
                                                    {docType === 'invoice' && "Notificación de Facturación"}
                                                    {docType === 'quote' && "Propuesta Comercial"}
                                                    {docType === 'brief' && "Formulario / Briefing Requerido"}
                                                </span>
                                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                                    {emailSubject}
                                                </p>
                                            </div>

                                            <div className="pt-2 text-center">
                                                <span className="inline-block px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm">
                                                    {docType === 'portal' && "Ingresar al Portal"}
                                                    {docType === 'invoice' && "Ver y Pagar Facturas"}
                                                    {docType === 'quote' && "Ver Cotización"}
                                                    {docType === 'brief' && "Completar Briefing"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SEND ACTION BUTTON */}
                        <div className="pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-11 px-4 text-xs font-semibold rounded-xl border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="lg"
                                onClick={handleSend}
                                disabled={loading || (docType === 'quote' && quotes.length === 0 && !selectedQuoteId) || (docType === 'brief' && briefings.length === 0 && !selectedBriefingId)}
                                className={cn(
                                    "flex-1 h-11 text-xs font-bold text-white rounded-xl shadow-lg border-0 transition-all active:scale-[0.98] gap-2",
                                    channel === 'whatsapp'
                                        ? "bg-[#25D366] hover:bg-[#1ebd59] shadow-emerald-500/20"
                                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
                                )}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : channel === 'whatsapp' ? (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar por WhatsApp
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Enviar por Correo
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
