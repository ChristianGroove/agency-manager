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
import { MessageSquare, Mail, Send, FileText, CheckCircle2, Loader2, Sparkles, Globe, Briefcase, FileSignature, Wallet, Archive } from "lucide-react"
import { getWhatsAppLink } from "@/lib/communication-utils"
import { sendTemplateEmail } from "@/modules/core/notifications/actions/send-template-email"
import { toast } from "sonner"
import { cn, getPortalShortUrl } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    const [intent, setIntent] = useState<CommunicationIntent>('chat')
    const [loading, setLoading] = useState(false)

    // Selection State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined)
    const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(undefined)
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
                setSelectedInvoiceId(context.data?.id)
            } else if (context?.type === 'quote') {
                setIntent('quote')
                setSelectedQuoteId(context.data?.id)
            } else {
                setIntent('chat')
            }
        }
    }, [isOpen, context])

    // Auto-select first item if list available and nothing selected
    useEffect(() => {
        if (isOpen && intent === 'invoice' && !selectedInvoiceId && !shareAllInvoices && pendingInvoices.length > 0) {
            setSelectedInvoiceId(pendingInvoices[0].id)
        }
        if (isOpen && intent === 'quote' && !selectedQuoteId && quotes.length > 0) {
            setSelectedQuoteId(quotes[0].id)
        }
    }, [isOpen, intent, pendingInvoices, quotes, selectedInvoiceId, selectedQuoteId, shareAllInvoices])


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

    }, [intent, selectedInvoiceId, selectedQuoteId, shareAllInvoices, client, settings, portalLink, isOpen, pendingInvoices])


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
            let contextId: string | undefined = undefined
            let templateKey = 'custom'

            if (intent === 'invoice') {
                if (shareAllInvoices) {
                    templateKey = 'invoice_summary'
                    // Pass client ID as context for summary
                    contextId = client.id
                } else {
                    templateKey = 'invoice_new'
                    contextId = selectedInvoiceId
                }
            } else if (intent === 'quote') {
                templateKey = 'quote_new'
                contextId = selectedQuoteId
            } else if (intent === 'portal') {
                templateKey = 'portal_invite'
                // client.id is passed implicitly as clientId in payload
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Centro de Comunicaciones</DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                        Gestionando para <span className="font-medium text-foreground">{client.name}</span>
                        {client.company_name && <span className="opacity-70">• {client.company_name}</span>}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col min-h-0">
                    <Tabs value={intent} onValueChange={(val) => setIntent(val as CommunicationIntent)} className="flex-1 flex flex-col min-h-0">

                        <div className="px-6 py-3 bg-muted/30 border-b shrink-0">
                            <TabsList className="grid grid-cols-5 w-full max-w-2xl bg-muted/50">
                                <TabsTrigger value="chat" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
                                <TabsTrigger value="invoice" className="gap-2"><FileText className="w-4 h-4" /> Facturación</TabsTrigger>
                                <TabsTrigger value="quote" className="gap-2"><Sparkles className="w-4 h-4" /> Cotización</TabsTrigger>
                                <TabsTrigger value="portal" className="gap-2"><Globe className="w-4 h-4" /> Portal</TabsTrigger>
                                <TabsTrigger value="brief" className="gap-2"><Briefcase className="w-4 h-4" /> Briefs</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 p-0 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="max-w-5xl mx-auto h-full p-6">

                                {/* CHAT TAB */}
                                <TabsContent value="chat" className="h-full mt-0">
                                    <div className="flex flex-col h-full gap-4">
                                        <div className="flex-1 border rounded-xl bg-background p-4 shadow-sm flex flex-col">
                                            <Label className="mb-2">Mensaje de WhatsApp</Label>
                                            <Textarea
                                                value={waMessage}
                                                onChange={(e) => setWaMessage(e.target.value)}
                                                className="flex-1 min-h-[150px] resize-none border-0 focus-visible:ring-0 p-0 text-base"
                                                placeholder="Escribe tu mensaje aquí..."
                                            />
                                            <div className="mt-4 flex justify-between items-center pt-4 border-t">
                                                <span className="text-xs text-muted-foreground">{waMessage.length} caracteres</span>
                                                <Button onClick={handleSendWhatsApp} className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white">
                                                    <Send className="w-4 h-4" /> Enviar WhatsApp
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* INVOICE TAB */}
                                <TabsContent value="invoice" className="h-full mt-0">
                                    <div className="grid md:grid-cols-2 gap-6 h-full">
                                        <div className="flex flex-col gap-4 min-h-0">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-base font-medium">Facturas Pendientes</Label>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id="share-all"
                                                        checked={shareAllInvoices}
                                                        onCheckedChange={(checked) => {
                                                            setShareAllInvoices(checked as boolean)
                                                            if (checked) setSelectedInvoiceId(undefined)
                                                        }}
                                                    />
                                                    <Label htmlFor="share-all" className="font-normal cursor-pointer text-sm">
                                                        Compartir Todo
                                                    </Label>
                                                </div>
                                            </div>

                                            {!shareAllInvoices ? (
                                                <ScrollArea className="flex-1 border rounded-xl bg-background p-2">
                                                    {pendingInvoices.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {pendingInvoices.map((inv: any) => (
                                                                <div
                                                                    key={inv.id}
                                                                    onClick={() => setSelectedInvoiceId(inv.id)}
                                                                    className={cn("p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 flex justify-between items-center group",
                                                                        selectedInvoiceId === inv.id ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 ring-1 ring-blue-200" : ""
                                                                    )}
                                                                >
                                                                    <div>
                                                                        <div className="font-medium">#{inv.number}</div>
                                                                        <div className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-mono font-medium">${inv.total.toLocaleString()}</div>
                                                                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Pendiente</Badge>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                                            <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                                                            <p>No hay facturas pendientes</p>
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            ) : (
                                                <div className="flex-1 border rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 flex flex-col items-center justify-center text-center p-6">
                                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                                                        <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <h3 className="font-medium text-lg text-blue-900 dark:text-blue-300">Resumen de Cuenta</h3>
                                                    <p className="text-sm text-blue-700 dark:text-blue-400 max-w-[200px] mb-2">
                                                        Se enviará un resumen con {pendingInvoices.length} facturas pendientes.
                                                    </p>
                                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                        ${pendingInvoices.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4 border rounded-xl bg-background p-4 shadow-sm">
                                            <h3 className="font-medium flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> Vista Previa Correo
                                            </h3>
                                            <div className="space-y-3 flex-1">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Asunto</Label>
                                                    <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                                                </div>
                                                <div className="flex-1 bg-muted/10 rounded border border-dashed flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
                                                    El contenido se generará usando la plantilla: <br />
                                                    <strong className="text-foreground mt-1 block font-mono bg-muted px-2 py-1 rounded inline-block">
                                                        {shareAllInvoices ? 'Estado de Cuenta (Neo)' : 'Factura (Suma)'}
                                                    </strong>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-4 border-t">
                                                <Button variant="outline" className="flex-1 gap-2" onClick={handleSendWhatsApp}>
                                                    <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp
                                                </Button>
                                                <Button className="flex-1 gap-2" onClick={handleSendEmail} disabled={loading || (!shareAllInvoices && !selectedInvoiceId)}>
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Enviar Email
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* QUOTE TAB */}
                                <TabsContent value="quote" className="h-full mt-0">
                                    <div className="grid md:grid-cols-2 gap-6 h-full">
                                        <div className="flex flex-col gap-4 min-h-0">
                                            <Label className="text-base font-medium">Cotizaciones Activas</Label>
                                            <ScrollArea className="flex-1 border rounded-xl bg-background p-2">
                                                {quotes.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {quotes.map((q: any) => (
                                                            <div
                                                                key={q.id}
                                                                onClick={() => setSelectedQuoteId(q.id)}
                                                                className={cn("p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 flex justify-between items-center group",
                                                                    selectedQuoteId === q.id ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200" : ""
                                                                )}
                                                            >
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <div className="font-medium truncate">{q.title || "Cotización sin título"}</div>
                                                                    <div className="text-xs text-muted-foreground flex gap-2">
                                                                        <span>#{q.number}</span>
                                                                        <span>•</span>
                                                                        <span>{new Date(q.created_at || Date.now()).toLocaleDateString()}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-mono font-medium">${(q.price || 0).toLocaleString()}</div>
                                                                    <Badge variant="outline" className={cn("text-[10px]", q.status === 'accepted' ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700")}>
                                                                        {q.status === 'accepted' ? 'Aceptada' : 'Borrador'}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                                        <Archive className="w-8 h-8 opacity-20 mb-2" />
                                                        <p>No hay cotizaciones disponibles</p>
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>

                                        <div className="flex flex-col gap-4 border rounded-xl bg-background p-4 shadow-sm">
                                            <h3 className="font-medium flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> Enviar Propuesta
                                            </h3>
                                            <div className="space-y-3 flex-1">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Asunto</Label>
                                                    <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                                                </div>
                                                <div className="flex-1 bg-muted/10 rounded border border-dashed flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
                                                    El contenido se generará usando la plantilla: <br />
                                                    <strong className="text-foreground mt-1 block font-mono bg-muted px-2 py-1 rounded inline-block">
                                                        Cotización (Neo/Swiss)
                                                    </strong>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-4 border-t">
                                                <Button variant="outline" className="flex-1 gap-2" onClick={handleSendWhatsApp}>
                                                    <MessageSquare className="w-4 h-4 text-green-600" /> WhatsApp
                                                </Button>
                                                <Button className="flex-1 gap-2" onClick={handleSendEmail} disabled={loading || !selectedQuoteId}>
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Enviar Email
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* PORTAL TAB */}
                                <TabsContent value="portal" className="h-full mt-0">
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 bg-background border rounded-xl shadow-sm">

                                        <div className="max-w-md space-y-2">
                                            <h3 className="text-2xl font-bold text-foreground">Acceso al Portal</h3>
                                            <p className="text-muted-foreground">
                                                Envía un enlace de acceso directo (Magic Link) para que <strong>{client.name}</strong> pueda gestionar sus facturas y proyectos sin contraseñas.
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                                            <Button size="lg" variant="outline" className="flex-1 gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all font-semibold" onClick={handleSendWhatsApp}>
                                                <MessageSquare className="w-5 h-5 text-green-600" /> WhatsApp
                                            </Button>
                                            <Button size="lg" className="flex-1 gap-2 font-semibold shadow-lg shadow-primary/20" onClick={handleSendEmail} disabled={loading}>
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                                                Enviar Email
                                            </Button>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* BRIEF TAB */}
                                <TabsContent value="brief" className="h-full mt-0">
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-6 bg-background border rounded-xl shadow-sm opacity-60">
                                        <Briefcase className="w-16 h-16 opacity-20" />
                                        <div className="max-w-md space-y-2">
                                            <h3 className="text-lg font-medium">Gestión de Briefings</h3>
                                            <p className="text-muted-foreground text-sm">Próximamente podrás enviar recordatorios de briefs desde este panel.</p>
                                        </div>
                                    </div>
                                </TabsContent>

                            </div>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}
