'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/modules/infrastructure/utils/utils'
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
    CheckCircle2,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
    ArrowRight
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
import { getTemplates, syncTemplatesFromMeta, MessageTemplate } from '@/modules/features/messaging/messaging-actions'
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface CreateBroadcastSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateBroadcastSheet({ open, onOpenChange, onSuccess }: CreateBroadcastSheetProps) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [recipientCount, setRecipientCount] = useState(0)
    const [countLoading, setCountLoading] = useState(false)
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
    const [templateVarValues, setTemplateVarValues] = useState<Record<string, string>>({})
    const [ttlSeconds, setTtlSeconds] = useState(86400) // Default 24h
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [deliveryConfig, setDeliveryConfig] = useState<{
        mode: 'stealth' | 'growth' | 'turbo',
        humanize: boolean,
        schedule_window: { start: number, end: number }
    }>({
        mode: 'growth',
        humanize: true,
        schedule_window: { start: 9, end: 17 } // 9 AM to 5 PM
    })

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
            toast.error(t("marketing.create_broadcast.error_name"))
            return
        }

        // WhatsApp requires a template
        if (form.channel === 'whatsapp') {
            if (!selectedTemplate) {
                toast.error(t("marketing.create_broadcast.error_template"))
                return
            }
        } else {
            if (!form.message.trim()) {
                toast.error(t("marketing.create_broadcast.error_message"))
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
            ttl_seconds: form.channel === 'whatsapp' ? ttlSeconds : undefined,
            delivery_config: deliveryConfig
        })

        if (result.success) {
            toast.success(t("marketing.create_broadcast.success"))
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(result.error || t("marketing.create_broadcast.error_create"))
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
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                            <Radio className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                {t("marketing.create_broadcast.title")}
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {t("marketing.create_broadcast.desc")}
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="px-8 py-6 space-y-6">
                            {/* Recipients Preview */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-pink/10 rounded-lg">
                                        <Users className="h-5 w-5 text-brand-pink" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("marketing.create_broadcast.recipients")}</p>
                                        <p className="text-xs text-muted-foreground">{t("marketing.create_broadcast.recipients_desc")}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {countLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{recipientCount}</p>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 dark:text-gray-300 font-semibold">{t("marketing.create_broadcast.campaign_name")}</Label>
                                <Input
                                    placeholder={t("marketing.create_broadcast.campaign_placeholder")}
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-11 bg-white dark:bg-zinc-800/50"
                                />
                            </div>

                            {/* Channel */}
                            <div className="space-y-2">
                                <Label>{t("marketing.create_broadcast.channel")}</Label>
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
                                            {t("marketing.create_broadcast.wa_template")}
                                        </Label>
                                        <Select
                                            value={selectedTemplate?.id || ''}
                                            onValueChange={handleTemplateSelect}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder={t("marketing.create_broadcast.select_template")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.length === 0 ? (
                                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                                        {t("marketing.create_broadcast.no_templates")}
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
                                            {t("marketing.create_broadcast.meta_approved")}
                                        </p>
                                    </div>

                                    {/* Variable Inputs */}
                                    {selectedTemplate && templateVars.length > 0 && (
                                        <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                {t("marketing.create_broadcast.var_defaults")}
                                            </Label>
                                            <p className="text-[11px] text-muted-foreground">
                                                {t("marketing.create_broadcast.var_desc")}
                                            </p>
                                            {templateVars.map(varName => (
                                                <div key={varName} className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="text-xs font-mono shrink-0 w-12 justify-center">
                                                        {varName}
                                                    </Badge>
                                                    <Input
                                                        placeholder={t("marketing.create_broadcast.var_placeholder").replace('{var}', varName)}
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

                                    {/* TTL Selector */}
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-blue-600" />
                                            {t("marketing.create_broadcast.ttl")}
                                        </Label>
                                        <Select
                                            value={String(ttlSeconds)}
                                            onValueChange={(v) => setTtlSeconds(Number(v))}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="43200">{t("marketing.create_broadcast.ttl_12h")}</SelectItem>
                                                <SelectItem value="86400">{t("marketing.create_broadcast.ttl_24h")}</SelectItem>
                                                <SelectItem value="604800">{t("marketing.create_broadcast.ttl_7d")}</SelectItem>
                                                <SelectItem value="2592000">{t("marketing.create_broadcast.ttl_30d")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>{t("marketing.create_broadcast.message_label")}</Label>
                                    <Textarea
                                        placeholder={t("marketing.create_broadcast.message_placeholder")}
                                        rows={5}
                                        value={form.message}
                                        onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("marketing.create_broadcast.message_vars")} {'{{nombre}}'}, {'{{empresa}}'}, {'{{telefono}}'}
                                    </p>
                                </div>
                            )}

                            {/* Segmentation */}
                            <div className="space-y-4 p-4 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-brand-pink" />
                                    {t("marketing.create_broadcast.segmentation")}
                                </h3>

                                <div className="space-y-2">
                                    <Label className="text-gray-700 dark:text-gray-300 font-semibold">{t("marketing.create_broadcast.tags")}</Label>
                                    <Select
                                        value={form.filters.status}
                                        onValueChange={(v) => updateFilters({ ...form.filters, status: v === 'all' ? '' : v })}
                                    >
                                        <SelectTrigger className="w-full bg-white dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700">
                                            <SelectValue placeholder={t("marketing.create_broadcast.tags_placeholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("marketing.create_broadcast.all_status")}</SelectItem>
                                            <SelectItem value="open">{t("marketing.create_broadcast.open")}</SelectItem>
                                            <SelectItem value="qualified">{t("marketing.create_broadcast.qualified")}</SelectItem>
                                            <SelectItem value="negotiation">{t("marketing.create_broadcast.negotiation")}</SelectItem>
                                            <SelectItem value="won">{t("marketing.create_broadcast.won")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_phone" className="cursor-pointer">{t("marketing.create_broadcast.has_phone")}</Label>
                                    <Switch
                                        id="has_phone"
                                        checked={form.filters.has_phone}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_phone: v })}
                                    />
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_email" className="cursor-pointer">{t("marketing.create_broadcast.has_email")}</Label>
                                    <Switch
                                        id="has_email"
                                        checked={form.filters.has_email}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_email: v })}
                                    />
                                </div>
                            </div>

                            {/* Advanced Anti-Ban Delivery Options */}
                            <div className="space-y-4 p-4 bg-slate-50/50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-800">
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="w-full flex items-center justify-between font-semibold text-sm text-gray-900 dark:text-gray-100 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="h-4 w-4 text-orange-500" />
                                        {t("marketing.create_broadcast.advanced")}
                                    </div>
                                    {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </button>
                                
                                {showAdvanced && (
                                    <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-6 animate-in slide-in-from-top-2">
                                        {/* Mode */}
                                        <div className="space-y-3">
                                            <Label>{t("marketing.create_broadcast.mode")}</Label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div 
                                                    className={cn("p-3 rounded-xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'stealth' ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-green-200 dark:hover:border-green-800")} 
                                                    onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'stealth' })}
                                                >
                                                    <h4 className="font-bold text-sm mb-1 text-green-800 dark:text-green-400">Stealth Mode</h4>
                                                    <p className="text-[10px] text-green-600/80 dark:text-green-500/80">{t("marketing.create_broadcast.mode_stealth_desc")}</p>
                                                </div>
                                                <div 
                                                    className={cn("p-3 rounded-xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'growth' ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-blue-200 dark:hover:border-blue-800")} 
                                                    onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'growth' })}
                                                >
                                                    <h4 className="font-bold text-sm mb-1 text-blue-800 dark:text-blue-400">Growth</h4>
                                                    <p className="text-[10px] text-blue-600/80 dark:text-blue-500/80">{t("marketing.create_broadcast.mode_growth_desc")}</p>
                                                </div>
                                                <div 
                                                    className={cn("p-3 rounded-xl border-2 cursor-pointer transition-all", deliveryConfig.mode === 'turbo' ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-800")} 
                                                    onClick={() => setDeliveryConfig({ ...deliveryConfig, mode: 'turbo' })}
                                                >
                                                    <h4 className="font-bold text-sm mb-1 text-red-800 dark:text-red-400">Turbo</h4>
                                                    <p className="text-[10px] text-red-600/80 dark:text-red-500/80">{t("marketing.create_broadcast.mode_turbo_desc")}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Humanize Jitter */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label className="cursor-pointer font-semibold dark:text-gray-100">{t("marketing.create_broadcast.humanize")}</Label>
                                                <p className="text-xs text-muted-foreground mt-1">{t("marketing.create_broadcast.humanize_desc")}</p>
                                            </div>
                                            <Switch 
                                                checked={deliveryConfig.humanize} 
                                                onCheckedChange={(v) => setDeliveryConfig({ ...deliveryConfig, humanize: v })} 
                                            />
                                        </div>

                                        {/* Schedule Window */}
                                        <div className="space-y-3">
                                            <Label className="font-semibold dark:text-gray-100">{t("marketing.create_broadcast.schedule")}</Label>
                                            <p className="text-xs text-muted-foreground">{t("marketing.create_broadcast.schedule_desc")}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium dark:text-gray-200">{t("marketing.create_broadcast.from")}</span>
                                                    <Select
                                                        value={String(deliveryConfig.schedule_window.start)}
                                                        onValueChange={(v) => setDeliveryConfig({ ...deliveryConfig, schedule_window: { ...deliveryConfig.schedule_window, start: Number(v) } })}
                                                    >
                                                        <SelectTrigger className="w-[100px] h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[...Array(24)].map((_, i) => (
                                                                <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium dark:text-gray-200">{t("marketing.create_broadcast.to")}</span>
                                                    <Select
                                                        value={String(deliveryConfig.schedule_window.end)}
                                                        onValueChange={(v) => setDeliveryConfig({ ...deliveryConfig, schedule_window: { ...deliveryConfig.schedule_window, end: Number(v) } })}
                                                    >
                                                        <SelectTrigger className="w-[100px] h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {[...Array(24)].map((_, i) => (
                                                                <SelectItem key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Preview */}
                            {(form.channel === 'whatsapp' ? selectedTemplate : form.message) && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">{t("marketing.create_broadcast.preview")}</Label>
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
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <Button variant="ghost" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={() => onOpenChange(false)}>
                            {t("marketing.create_broadcast.cancel")}
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !form.name || (form.channel === 'whatsapp' && !selectedTemplate)}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 px-8"
                        >
                            {loading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("marketing.create_broadcast.creating")}</>
                            ) : (
                                <>{t("marketing.create_broadcast.continue")} <ArrowRight className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
