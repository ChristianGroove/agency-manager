"use client"

import { useState, useEffect, useMemo } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Search, Send, FileText, ArrowLeft, CheckCircle2, Loader2,
    MessageSquare, Zap, Clock, AlertCircle, RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { MessageTemplate, getTemplatesForConversation, syncTemplatesForConversation } from "../actions/templates"
import { sendTemplateMessage } from "@/modules/features/messaging/send-template-action"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TemplatePickerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    conversationId: string
    onSent?: () => void
}

/**
 * Detects {{n}} variables in a template body text
 * Returns array of variable placeholders like ["{{1}}", "{{2}}"]
 */
function detectVariables(text: string): string[] {
    const regex = /\{\{(\d+)\}\}/g
    const matches: string[] = []
    let match
    while ((match = regex.exec(text)) !== null) {
        if (!matches.includes(match[0])) {
            matches.push(match[0])
        }
    }
    return matches.sort((a, b) => {
        const numA = parseInt(a.replace(/[{}]/g, ''))
        const numB = parseInt(b.replace(/[{}]/g, ''))
        return numA - numB
    })
}

/** Replaces {{n}} in text with provided values */
function fillVariables(text: string, values: Record<string, string>): string {
    let result = text
    Object.entries(values).forEach(([key, val]) => {
        result = result.replace(key, val || key)
    })
    return result
}

export function TemplatePickerSheet({ open, onOpenChange, conversationId, onSent }: TemplatePickerSheetProps) {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [filter, setFilter] = useState("")

    // Selection state
    const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null)
    const [variableValues, setVariableValues] = useState<Record<string, string>>({})

    useEffect(() => {
        if (open) {
            loadTemplates()
            setSelectedTemplate(null)
            setVariableValues({})
            setFilter("")
        }
    }, [open])

    const [syncError, setSyncError] = useState<string | null>(null)

    const loadTemplates = async () => {
        setLoading(true)
        setSyncError(null)
        try {
            // Auto-sync from Meta to ensure we have the latest templates
            try {
                const result = await syncTemplatesForConversation(conversationId)
                console.log(`[TemplatePicker] Synced ${result.synced} templates from Meta`)
                if (result.errors.length > 0) {
                    console.warn('[TemplatePicker] Sync errors:', result.errors)
                }
            } catch (e: any) {
                const msg = e?.message || 'Sync failed'
                console.error('[TemplatePicker] Meta sync failed:', msg)
                setSyncError(msg)
            }

            const all = await getTemplatesForConversation(conversationId)
            // Only show APPROVED templates that genuinely exist in Meta (have meta_id)
            setTemplates(all.filter(t => t.status === 'APPROVED' && t.meta_id))
        } catch {
            toast.error("Error loading templates")
        } finally {
            setLoading(false)
        }
    }

    const filtered = useMemo(() =>
        templates.filter(t =>
            t.name.toLowerCase().includes(filter.toLowerCase()) ||
            t.category.toLowerCase().includes(filter.toLowerCase())
        ), [templates, filter]
    )

    // Extract body text and variables from selected template
    const bodyComponent = selectedTemplate?.components?.find(c => c.type === 'BODY')
    const headerComponent = selectedTemplate?.components?.find(c => c.type === 'HEADER')
    const footerComponent = selectedTemplate?.components?.find(c => c.type === 'FOOTER')
    const bodyText = bodyComponent?.text || ""
    const headerText = headerComponent?.text || ""
    const bodyVars = useMemo(() => detectVariables(bodyText), [bodyText])
    const headerVars = useMemo(() => detectVariables(headerText), [headerText])
    const allVars = useMemo(() => [...headerVars, ...bodyVars], [headerVars, bodyVars])

    const filledBody = fillVariables(bodyText, variableValues)
    const filledHeader = fillVariables(headerText, variableValues)

    const hasMediaHeader = ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent?.format || '')
    const [mediaUrl, setMediaUrl] = useState("")

    // Set media url from template if available, otherwise reset
    useEffect(() => {
        if (!selectedTemplate) {
            setMediaUrl("")
            return
        }
        const header = selectedTemplate.components?.find(c => c.type === 'HEADER')
        if (header && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format || '')) {
            const savedUrl = header.pixy_media_url || header.example?.header_url?.[0] || ""
            setMediaUrl(savedUrl)
        } else {
            setMediaUrl("")
        }
    }, [selectedTemplate])

    const allFilled = (allVars.length === 0 || allVars.every(v => variableValues[v]?.trim())) && 
                     (!hasMediaHeader || mediaUrl.trim().length > 0)

    const handleSend = async () => {
        if (!selectedTemplate || !allFilled) return

        setSending(true)
        try {
            // Extract ordered parameter values
            const bodyParams = bodyVars.map(v => variableValues[v] || '')
            const headerParams = headerVars.length > 0 ? headerVars.map(v => variableValues[v] || '') : undefined

            const res = await sendTemplateMessage({
                conversationId,
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                bodyParameters: bodyParams,
                headerParameters: headerParams,
                mediaHeaderUrl: hasMediaHeader ? mediaUrl.trim() : undefined,
                mediaHeaderType: hasMediaHeader ? headerComponent?.format?.toLowerCase() : undefined
            })

            if (res && res.error) {
                toast.error(res.error)
                setSending(false)
                return
            }

            toast.success("Plantilla enviada con éxito")
            onOpenChange(false)
            onSent?.()
        } catch (error: any) {
            toast.error("Error al enviar plantilla", {
                description: error.message || "Intenta de nuevo"
            })
        } finally {
            setSending(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[520px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 shrink-0 px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                            {selectedTemplate && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => { setSelectedTemplate(null); setVariableValues({}) }}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <FileText className="h-4 w-4 text-green-700 dark:text-green-400" />
                                </div>
                                <div>
                                    <SheetTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                        {selectedTemplate ? selectedTemplate.name : "Plantillas WhatsApp"}
                                    </SheetTitle>
                                    <SheetDescription className="text-xs text-muted-foreground mt-0">
                                        {selectedTemplate ? "Completa las variables y envía" : "Selecciona una plantilla aprobada"}
                                    </SheetDescription>
                                </div>
                            </div>
                        </div>

                        {/* Search (only in list view) */}
                        {!selectedTemplate && (
                            <div className="relative mt-3">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar plantilla..."
                                    className="pl-9 h-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        {!selectedTemplate ? (
                            /* Template List */
                            <div className="p-4 space-y-2">
                                {loading ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground px-4">
                                        <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No hay plantillas disponibles</p>
                                        {syncError ? (
                                            <div className="text-center mt-2 space-y-2">
                                                <p className="text-xs text-red-500">{syncError}</p>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={loadTemplates}
                                                    className="text-xs gap-1"
                                                >
                                                    <RefreshCw className="h-3 w-3" /> Reintentar sincronización
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-xs mt-1 text-center max-w-[260px]">
                                                Sincroniza desde Meta en Settings â†’ Plantillas, o crea una nueva y envíala a aprobación.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    filtered.map(template => {
                                        const body = template.components?.find(c => c.type === 'BODY')?.text || "Sin contenido"
                                        const vars = detectVariables(body)
                                        return (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedTemplate(template)}
                                                className="w-full text-left p-4 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all duration-200 group"
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-medium text-gray-800 dark:text-gray-200">
                                                            {template.name}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[9px] font-medium border-0",
                                                                template.category === 'MARKETING'
                                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                                    : template.category === 'UTILITY'
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                            )}
                                                        >
                                                            {template.category}
                                                        </Badge>
                                                    </div>
                                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)] shrink-0 mt-1" />
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {body}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="secondary" className="text-[9px] bg-gray-100 dark:bg-zinc-800">
                                                        {template.language}
                                                    </Badge>
                                                    {vars.length > 0 && (
                                                        <Badge variant="secondary" className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                            {vars.length} variable{vars.length > 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                    {template.components?.some(c => c.type === 'BUTTONS') && (
                                                        <Zap className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        ) : (
                            /* Template Detail + Variable Form */
                            <div className="p-6 space-y-5">
                                {/* Template Info */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] font-medium border-0",
                                            selectedTemplate.category === 'MARKETING'
                                                ? 'bg-purple-100 text-purple-700'
                                                : selectedTemplate.category === 'UTILITY'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-orange-100 text-orange-700'
                                        )}
                                    >
                                        {selectedTemplate.category}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {selectedTemplate.language}
                                    </Badge>
                                    <Badge className="text-[10px] bg-green-100 text-green-700 border-0">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        APPROVED
                                    </Badge>
                                </div>

                                {/* WhatsApp Preview */}
                                <div className="bg-[#e5ddd5] dark:bg-zinc-800 rounded-2xl p-4 space-y-1.5">
                                    <div className="max-w-[85%] ml-auto">
                                        <div className="bg-[#dcf8c6] dark:bg-green-900/60 rounded-xl rounded-tr-sm p-3 shadow-sm">
                                            {filledHeader && (
                                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                                                    {filledHeader}
                                                </p>
                                            )}
                                            <p className="text-[13px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                {filledBody || "Sin contenido de texto"}
                                            </p>
                                            {footerComponent?.text && (
                                                <p className="text-[11px] text-gray-500 mt-2">
                                                    {footerComponent.text}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-gray-400 text-right mt-1">
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} âœ“âœ“
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Variable Inputs */}
                                {(allVars.length > 0 || hasMediaHeader) && (
                                    <>
                                        <Separator />
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                                <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    Completa los campos requeridos
                                                </Label>
                                            </div>

                                            {/* Media Header Input */}
                                            {hasMediaHeader && (
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">
                                                        URL de {headerComponent?.format === 'IMAGE' ? 'Imagen' : headerComponent?.format === 'VIDEO' ? 'Video' : 'Documento'} (Requerido)
                                                    </Label>
                                                    <Input
                                                        placeholder={`Ingresa el enlace público del archivo`}
                                                        value={mediaUrl}
                                                        onChange={(e) => setMediaUrl(e.target.value)}
                                                        className="h-10 bg-gray-50 dark:bg-zinc-800"
                                                        autoFocus
                                                    />
                                                </div>
                                            )}

                                            {allVars.map((varName, i) => {
                                                const isHeader = headerVars.includes(varName)
                                                return (
                                                    <div key={varName} className="space-y-1">
                                                        <Label className="text-xs text-muted-foreground">
                                                            {isHeader ? `Encabezado` : `Variable`} {varName}
                                                        </Label>
                                                        <Input
                                                            placeholder={`Valor para ${varName}`}
                                                            value={variableValues[varName] || ''}
                                                            onChange={(e) => setVariableValues(prev => ({
                                                                ...prev,
                                                                [varName]: e.target.value
                                                            }))}
                                                            className="h-10 bg-gray-50 dark:bg-zinc-800"
                                                            autoFocus={i === 0}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}

                                {!hasMediaHeader && allVars.length === 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span className="text-sm font-medium">Esta plantilla no requiere variables</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Footer: Send */}
                    {selectedTemplate && (
                        <div className="sticky bottom-0 px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-gray-100 dark:border-zinc-800">
                            <Button
                                onClick={handleSend}
                                disabled={sending || !allFilled}
                                className="w-full h-11 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold rounded-xl shadow-lg shadow-green-500/20 transition-all"
                            >
                                {sending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {sending ? "Enviando..." : "Enviar Plantilla"}
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
