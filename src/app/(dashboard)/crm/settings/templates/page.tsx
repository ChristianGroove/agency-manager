"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, Zap, MessageSquare, Clock, AlertCircle, CheckCircle2, RefreshCw, Trash2, Upload } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getTemplates, deleteTemplateFromMeta, syncTemplatesFromMeta, submitTemplateToMeta, MessageTemplate } from "@/modules/features/messaging/messaging-actions"
import { TemplateBuilderSheet } from "@/modules/features/messaging/components/template-builder-sheet"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/modules/infrastructure/utils/utils"
import { SectionHeader } from "@/components/layout/section-header"
import { useI18n } from "@/modules/core/i18n/context"
import { getChannels } from "@/modules/features/channels/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Channel } from "@/modules/features/channels/types"

export default function TemplatesPage() {
    const { dict } = useI18n()
    const t = dict.crm.crm_settings.templates

    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [filter, setFilter] = useState("")
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    // Multi-WABA support
    const [channels, setChannels] = useState<Channel[]>([])
    const [selectedChannelId, setSelectedChannelId] = useState<string>("")

    useEffect(() => {
        const fetchChannels = async () => {
            const data = await getChannels()
            // Filter only Meta/Cloud WhatsApp
            const wabaChannels = data.filter(c =>
                c.provider_key === 'meta_whatsapp' || c.provider_key === 'whatsapp_cloud'
            )
            setChannels(wabaChannels)
            if (wabaChannels.length > 0) {
                // Try to find the primary one, otherwise first one
                const primary = wabaChannels.find(c => c.is_primary)
                setSelectedChannelId(primary?.id || wabaChannels[0].id)
            } else {
                setIsLoading(false)
            }
        }
        fetchChannels()
    }, [])

    useEffect(() => {
        if (selectedChannelId) {
            loadTemplates()
        }
    }, [selectedChannelId])

    const loadTemplates = async () => {
        setIsLoading(true)
        try {
            const data = await getTemplates(selectedChannelId)
            setTemplates(data)
        } catch (error) {
            toast.error(dict.common.connection_error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm(t.delete_confirm)) return
        try {
            await deleteTemplateFromMeta(id, selectedChannelId)
            setTemplates(templates.filter(t => t.id !== id))
            toast.success(t.delete_success)
        } catch (error: any) {
            toast.error(error.message || dict.common.error)
        }
    }

    const handleSubmitToMeta = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("¿Enviar esta plantilla a revisión de Meta? Una vez enviada, no se podrá editar localmente hasta que sea aprobada o rechazada.")) return
        try {
            const res = await submitTemplateToMeta(id, selectedChannelId)
            if (res.success) {
                toast.success("Plantilla enviada a revisión correctamente.")
                await loadTemplates()
            } else {
                toast.error(res.error || "Error al enviar a Meta")
            }
        } catch (error: any) {
            toast.error(error.message || "Error al enviar a Meta")
        }
    }


    const handleSync = async () => {
        if (!selectedChannelId) return
        setIsSyncing(true)
        try {
            const result = await syncTemplatesFromMeta(selectedChannelId)
            toast.success(t.sync_success.replace('{count}', String(result.synced)))
            if (result.errors.length > 0) {
                toast.warning(t.sync_errors.replace('{count}', String(result.errors.length)))
            }
            await loadTemplates()
        } catch (error: any) {
            toast.error(error.message || dict.common.error)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleEdit = (t: MessageTemplate) => {
        setEditingTemplate(t)
        setIsCreateOpen(true)
    }

    const handleNew = () => {
        setEditingTemplate(null)
        setIsCreateOpen(true)
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(filter.toLowerCase()) ||
        t.category.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="w-full">
                    <SectionHeader
                        title={t.title}
                        subtitle={t.subtitle}
                        titleClassName="text-2xl"
                        action={
                            <div className="flex gap-2">
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t.search}
                                        className="pl-9"
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                    />
                                </div>
                                {channels.length > 1 && (
                                    <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                        <SelectTrigger className="w-48 h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {channels.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.connection_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={handleSync}
                                    disabled={isSyncing || !selectedChannelId}
                                    className="gap-2"
                                >
                                    <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                                    {t.sync}
                                </Button>
                                <Button
                                    onClick={handleNew}
                                    disabled={!selectedChannelId}
                                    className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    {t.new_template}
                                </Button>
                            </div>
                        }
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center flex-1 min-h-[400px] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-green-600" />
                    </div>
                    {channels.length === 0 ? (
                        <>
                            <h3 className="text-lg font-medium">{dict.crm.crm_settings.channels.empty}</h3>
                            <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                                {t.no_waba}
                            </p>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-medium">{t.empty}</h3>
                            <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                                {t.empty_desc}
                            </p>
                            <Button onClick={handleNew}>{t.create_first}</Button>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-10">
                    {filteredTemplates.map(template => (
                        <Card
                            key={template.id}
                            onClick={() => handleEdit(template)}
                            className="glass-card group cursor-pointer hover:-translate-y-1 transition-all duration-300"
                        >
                            <CardHeader className="pb-3 border-b border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="font-mono text-sm text-slate-700 truncate w-48" title={template.name}>
                                            {template.name}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="text-[10px] font-normal lowercase bg-white border">
                                                {template.language}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-medium border-0",
                                                    template.category === 'MARKETING' ? 'bg-purple-100 text-purple-700' :
                                                        template.category === 'UTILITY' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-orange-100 text-orange-700'
                                                )}
                                            >
                                                {template.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        template.meta_id && template.status === 'APPROVED' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                            template.status === 'REJECTED' ? "bg-red-500" :
                                                template.meta_id ? "bg-yellow-400 animate-pulse" :
                                                    "bg-gray-300"
                                    )} title={template.meta_id ? template.status : t.status.local_only} />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="min-h-[60px]">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                        {/* Fallback for preview content */}
                                        {template.components?.find(c => c.type === 'BODY')?.text || "Sin contenido de texto..."}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                                    <div className="flex gap-2 items-center">
                                        {template.components?.some(c => c.type === 'HEADER') && (
                                            <span title={t.status.multimedia}>
                                                <FileText className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        {template.components?.some(c => c.type === 'BUTTONS') && (
                                            <span title={t.status.buttons}>
                                                <Zap className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                        {template.meta_id && (
                                            <span title={t.status.meta_verified} className="text-green-500">
                                                <Upload className="w-3.5 h-3.5" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded-full",
                                            template.meta_id && template.status === 'APPROVED'
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : template.meta_id
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    : "bg-slate-100 text-slate-500 dark:bg-zinc-800"
                                        )}>
                                            {template.meta_id
                                                ? template.status.toLowerCase()
                                                : t.status.local_only}
                                        </span>
                                        <div className="flex gap-1">
                                            {!template.meta_id && (
                                                <button
                                                    onClick={(e) => handleSubmitToMeta(template.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
                                                    title="Enviar a revisión de Meta"
                                                >
                                                    <Upload className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(template.id, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                                                title="Eliminar plantilla"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <TemplateBuilderSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                templateToEdit={editingTemplate}
                onSuccess={loadTemplates}
                channelId={selectedChannelId}
            />
        </div>
    )
}
