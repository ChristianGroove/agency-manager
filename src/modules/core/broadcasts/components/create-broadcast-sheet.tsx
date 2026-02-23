'use client'

import { useState, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
    Send,
    Users,
    MessageSquare,
    Mail,
    Phone,
    Loader2,
    Radio,
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { createQuickCampaign } from '../marketing-actions'
import { getRecipientCount } from '../actions'
import { toast } from 'sonner'
import { getTemplates, syncTemplatesFromMeta, MessageTemplate } from '@/modules/core/messaging/template-actions'

interface CreateBroadcastSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateBroadcastSheet({ open, onOpenChange, onSuccess }: CreateBroadcastSheetProps) {
    const [loading, setLoading] = useState(false)
    const [recipientCount, setRecipientCount] = useState(0)
    const [countLoading, setCountLoading] = useState(false)
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
    const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({})
    const [ttlSeconds, setTtlSeconds] = useState(86400) // Default 24h

    const [form, setForm] = useState({
        name: '',
        message: '',
        channel: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
        filters: {
            status: '',
            has_phone: true,
            has_email: false,
            score_min: 0
        }
    })

    // Reset form when sheet opens
    useEffect(() => {
        if (open) {
            setForm({
                name: '',
                message: '',
                channel: 'whatsapp',
                filters: {
                    status: '',
                    has_phone: true,
                    has_email: false,
                    score_min: 0
                }
            })
            setRecipientCount(0)
            setSelectedTemplate(null)
            setTemplateVarValues({})
            setTtlSeconds(86400)
            // Load approved templates
            loadTemplates()
        }
    }, [open])

    const loadTemplates = async () => {
        try {
            // Sync from Meta first to get latest templates
            try { await syncTemplatesFromMeta() } catch { /* ignore sync errors */ }
            const all = await getTemplates()
            // Only show templates that are APPROVED and genuinely exist in Meta
            setTemplates(all.filter(t => t.status === 'APPROVED' && t.meta_id))
        } catch { /* ignore */ }
    }

    // Detect variables in selected template body
    const templateBodyText = selectedTemplate?.components?.find(c => c.type === 'BODY')?.text || ''
    const templateVars = useMemo(() => {
        const regex = /\{\{(\d+)\}\}/g
        const matches: string[] = []
        let match
        while ((match = regex.exec(templateBodyText)) !== null) {
            if (!matches.includes(match[0])) matches.push(match[0])
        }
        return matches.sort()
    }, [templateBodyText])

    const handleTemplateSelect = (templateId: string) => {
        const tmpl = templates.find(t => t.id === templateId) || null
        setSelectedTemplate(tmpl)
        setTemplateVarValues({})
    }

    const filledPreview = useMemo(() => {
        let text = templateBodyText
        Object.entries(templateVarValues).forEach(([key, val]) => {
            text = text.replace(key, val || key)
        })
        return text
    }, [templateBodyText, templateVarValues])

    const updateFilters = async (newFilters: typeof form.filters) => {
        setForm(prev => ({ ...prev, filters: newFilters }))
        setCountLoading(true)
        const result = await getRecipientCount(newFilters)
        if (result.success) {
            setRecipientCount(result.count)
        }
        setCountLoading(false)
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            toast.error('Ingresa un nombre para la campaña')
            return
        }

        // WhatsApp requires a template
        if (form.channel === 'whatsapp') {
            if (!selectedTemplate) {
                toast.error('Selecciona una plantilla aprobada para WhatsApp')
                return
            }
        } else {
            if (!form.message.trim()) {
                toast.error('Ingresa el mensaje a enviar')
                return
            }
        }

        setLoading(true)
        const result = await createQuickCampaign({
            name: form.name,
            message: form.channel === 'whatsapp' ? filledPreview : form.message,
            channel: form.channel,
            filters: form.filters,
            // Template-specific data for WhatsApp HSM
            template_name: selectedTemplate?.name,
            template_language: selectedTemplate?.language,
            template_params: templateVarValues,
            ttl_seconds: form.channel === 'whatsapp' ? ttlSeconds : undefined
        })

        if (result.success) {
            toast.success('Campaña creada exitosamente')
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(result.error || 'Error al crear campaña')
        }
        setLoading(false)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                            <Radio className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-semibold text-gray-900">
                                Nueva Campaña
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Envía un mensaje a múltiples contactos
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="px-8 py-6 space-y-6">
                            {/* Recipients Preview */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-pink/10 rounded-lg">
                                        <Users className="h-5 w-5 text-brand-pink" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Destinatarios</p>
                                        <p className="text-xs text-muted-foreground">Según los filtros actuales</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {countLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <p className="text-2xl font-bold text-gray-900">{recipientCount}</p>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label>Nombre de la Campaña *</Label>
                                <Input
                                    placeholder="Ej: Promoción Enero 2026"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-11"
                                />
                            </div>

                            {/* Channel */}
                            <div className="space-y-2">
                                <Label>Canal de Envío</Label>
                                <Select
                                    value={form.channel}
                                    onValueChange={(v) => setForm(prev => ({ ...prev, channel: v as any }))}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="whatsapp">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-green-600" />
                                                WhatsApp
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="sms">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-blue-600" />
                                                SMS
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="email">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-purple-600" />
                                                Email
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Message: Template for WA, Free text for others */}
                            {form.channel === 'whatsapp' ? (
                                <div className="space-y-4">
                                    {/* Template Selector */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-green-600" />
                                            Plantilla WhatsApp *
                                        </Label>
                                        <Select
                                            value={selectedTemplate?.id || ''}
                                            onValueChange={handleTemplateSelect}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Selecciona una plantilla aprobada" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.length === 0 ? (
                                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                                        No hay plantillas aprobadas
                                                    </div>
                                                ) : (
                                                    templates.map(t => (
                                                        <SelectItem key={t.id} value={t.id}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs">{t.name}</span>
                                                                <Badge variant="outline" className="text-[9px] border-0 bg-green-100 text-green-700">
                                                                    {t.category}
                                                                </Badge>
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Solo plantillas aprobadas por Meta
                                        </p>
                                    </div>

                                    {/* Variable Inputs */}
                                    {selectedTemplate && templateVars.length > 0 && (
                                        <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                Valores predeterminados para variables
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                Mapea variables a datos del lead: nombre, empresa, etc.
                                            </p>
                                            {templateVars.map(varName => (
                                                <div key={varName} className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-xs font-mono shrink-0 w-12 justify-center">
                                                        {varName}
                                                    </Badge>
                                                    <Input
                                                        placeholder={`Valor para ${varName} (ej: lead.nombre)`}
                                                        value={templateVarValues[varName] || ''}
                                                        onChange={(e) => setTemplateVarValues(prev => ({
                                                            ...prev,
                                                            [varName]: e.target.value
                                                        }))}
                                                        className="h-9"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedTemplate && templateVars.length === 0 && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs text-green-700 dark:text-green-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Esta plantilla no requiere variables
                                        </div>
                                    )}

                                    {/* TTL Selector */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                            Tiempo de Vida (TTL)
                                        </Label>
                                        <Select
                                            value={String(ttlSeconds)}
                                            onValueChange={(v) => setTtlSeconds(Number(v))}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="43200">Flash Sale — 12 horas</SelectItem>
                                                <SelectItem value="86400">Diario — 24 horas</SelectItem>
                                                <SelectItem value="604800">Semanal — 7 días</SelectItem>
                                                <SelectItem value="2592000">Mensual — 30 días</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Mensaje *</Label>
                                    <Textarea
                                        placeholder="Escribe tu mensaje aquí... Usa {{nombre}} para personalizar"
                                        rows={5}
                                        value={form.message}
                                        onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Variables: {'{{nombre}}'}, {'{{empresa}}'}, {'{{telefono}}'}
                                    </p>
                                </div>
                            )}

                            {/* Segmentation */}
                            <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-brand-pink" />
                                    Segmentación
                                </h3>

                                <div className="space-y-2">
                                    <Label>Estado del Lead</Label>
                                    <Select
                                        value={form.filters.status || 'all'}
                                        onValueChange={(v) => updateFilters({ ...form.filters, status: v === 'all' ? '' : v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los estados</SelectItem>
                                            <SelectItem value="open">Abierto</SelectItem>
                                            <SelectItem value="qualified">Calificado</SelectItem>
                                            <SelectItem value="negotiation">Negociación</SelectItem>
                                            <SelectItem value="won">Ganado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_phone" className="cursor-pointer">Solo con teléfono</Label>
                                    <Switch
                                        id="has_phone"
                                        checked={form.filters.has_phone}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_phone: v })}
                                    />
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_email" className="cursor-pointer">Solo con email</Label>
                                    <Switch
                                        id="has_email"
                                        checked={form.filters.has_email}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_email: v })}
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {(form.channel === 'whatsapp' ? selectedTemplate : form.message) && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Vista Previa</Label>
                                    <div className="bg-[#e5ddd5] dark:bg-zinc-800 rounded-2xl p-4">
                                        <div className="max-w-[85%] ml-auto">
                                            <div className="bg-[#dcf8c6] dark:bg-green-900/60 rounded-xl rounded-tr-sm p-3 shadow-sm">
                                                <p className="text-[13px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                    {form.channel === 'whatsapp' ? filledPreview : form.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 text-right mt-1">Marketing ✓</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center justify-between">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-brand-pink hover:bg-brand-pink/90 text-white px-6"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Crear Campaña
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
