"use client"

import { Channel } from "../types"
import { PipelineStage } from "@/modules/features/crm/services/logic/pipeline-actions"
import { Button } from "@/components/ui/button"
import {
    Save, Loader2, Phone, Eye, EyeOff, RefreshCw,
    Clock, Users, MessageSquare, Settings2, Calendar,
    ChevronDown, ChevronUp, Trash2, Plus
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { updateChannel } from "../actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getChannelAssignmentRule, upsertAssignmentRule, deleteAssignmentRule } from "@/modules/features/messaging/assignment-actions"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface EditChannelSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    channel: Channel
    pipelineStages: PipelineStage[]
    agents: any[]
}

// Section header component for visual consistency
function SectionTitle({ icon: Icon, title, badge }: { icon: any, title: string, badge?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between pt-1 pb-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                <Icon className="h-3.5 w-3.5" />
                {title}
            </div>
            {badge}
        </div>
    )
}

// Compact row for toggle-style settings
function SettingRow({ label, description, children, className }: { label: string, description?: string, children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("flex items-center justify-between py-3 gap-4", className)}>
            <div className="min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                {description && <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

export function EditChannelSheet({ open, onOpenChange, channel, pipelineStages, agents }: EditChannelSheetProps) {
    const { dict } = useI18n()
    const router = useRouter()
    const t = dict.crm.crm_settings.channels.sheet
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingRule, setIsFetchingRule] = useState(false)
    const [activeTab, setActiveTab] = useState("general")

    // Form State
    const [name, setName] = useState(channel.connection_name)
    const [isPrimary, setIsPrimary] = useState(channel.is_primary)

    // Pipeline
    const [pipelineStageId, setPipelineStageId] = useState(channel.default_pipeline_stage_id || "none")
    // Auto Reply
    const [autoReply, setAutoReply] = useState(channel.auto_reply_when_offline || "")
    const [welcomeMessage, setWelcomeMessage] = useState(channel.welcome_message || "")

    // Robust Working Hours Structure Migration
    const sanitizeWorkingHours = (raw: any) => {
        const base = { 
            enabled: false, // Default: OFF for new channels
            timezone: 'America/Bogota', 
            days: {
                1: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
                2: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
                3: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
                4: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
                5: { enabled: true, ranges: [{ start: "09:00", end: "18:00" }] },
                6: { enabled: false, ranges: [{ start: "09:00", end: "12:00" }] },
                0: { enabled: false, ranges: [{ start: "09:00", end: "12:00" }] }
            }
        }

        if (!raw || !raw.days) return base;

        // If it's the old array [1,2,3] structure (Implicitly enabled if it had days)
        if (Array.isArray(raw.days)) {
            const newDays: any = { ...base.days }
            const oldStart = raw.start || "09:00"
            const oldEnd = raw.end || "18:00"
            
            Object.keys(newDays).forEach(d => newDays[d as any].enabled = false);
            raw.days.forEach((d: number) => {
                const dayKey = d === 7 || d === 0 ? 0 : d;
                newDays[dayKey] = { enabled: true, ranges: [{ start: oldStart, end: oldEnd }] }
            });
            return { enabled: true, timezone: raw.timezone || base.timezone, days: newDays };
        }

        // Merge daily configurations to avoid losing days not present in the update
        return { 
            ...base, 
            ...raw,
            days: { ...base.days, ...raw.days }
        };
    }

    const [workingHours, setWorkingHours] = useState<any>(sanitizeWorkingHours(channel.working_hours))

    // Routing Rule
    const [assignmentRule, setAssignmentRule] = useState<any>(null)
    const [initialRuleId, setInitialRuleId] = useState<string | null>(null)

    // Calling API state (WhatsApp only)
    const [callingEnabled, setCallingEnabled] = useState(false)
    const [iconVisibility, setIconVisibility] = useState<'DEFAULT' | 'HIDE'>('HIDE')
    const [callingLoading, setCallingLoading] = useState(false)
    const [callingStatusSource, setCallingStatusSource] = useState<string>('loading')

    const isWhatsApp = channel.provider_key === 'meta_whatsapp' || channel.provider_key === 'whatsapp_cloud'

    useEffect(() => {
        if (open) {
            setIsFetchingRule(true)
            getChannelAssignmentRule(channel.id)
                .then(rule => {
                    if (rule) { setAssignmentRule(rule); setInitialRuleId(rule.id) }
                    else { setAssignmentRule(null); setInitialRuleId(null) }
                })
                .finally(() => setIsFetchingRule(false))

            if (isWhatsApp) loadCallingStatus()
            
            // Reset form on open
            setName(channel.connection_name)
            setIsPrimary(channel.is_primary)
            setPipelineStageId(channel.default_pipeline_stage_id || "none")
            setAutoReply(channel.auto_reply_when_offline || "")
            setWelcomeMessage(channel.welcome_message || "")
            setWorkingHours(sanitizeWorkingHours(channel.working_hours))
        }
    }, [open, channel.id])

    async function loadCallingStatus() {
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling')
            const data = await res.json()
            setCallingEnabled(data.enabled ?? false)
            setIconVisibility(data.iconVisibility ?? 'HIDE')
            setCallingStatusSource(data.source ?? 'unknown')
        } catch { setCallingStatusSource('error') }
        finally { setCallingLoading(false) }
    }

    async function handleToggleCalling(enabled: boolean) {
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle', enabled })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            setCallingEnabled(enabled)
            if (enabled && iconVisibility === 'HIDE') setIconVisibility('DEFAULT')
            toast.success(enabled ? t.calling.status_on : t.calling.status_off)
        } catch (e: any) {
            toast.error(dict.common.error, { description: e.message })
            setCallingEnabled(!enabled)
        } finally { setCallingLoading(false) }
    }

    async function handleIconVisibility(visibility: 'DEFAULT' | 'HIDE') {
        if (!callingEnabled && visibility === 'DEFAULT') {
            toast.error('Activa Calling primero')
            return
        }
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'icon', visibility })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            setIconVisibility(visibility)
            toast.success(visibility === 'DEFAULT' ? t.calling.visibility.visible : t.calling.visibility.hidden)
        } catch (e: any) { toast.error(dict.common.error, { description: e.message }) }
        finally { setCallingLoading(false) }
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            await updateChannel(channel.id, {
                connection_name: name,
                is_primary: isPrimary,
                default_pipeline_stage_id: pipelineStageId === "none" ? null : pipelineStageId,
                auto_reply_when_offline: autoReply,
                welcome_message: welcomeMessage,
                working_hours: workingHours,
            })
            if (assignmentRule) {
                const result = await upsertAssignmentRule({ ...assignmentRule, conditions: { connection_id: [channel.id] } })
                if (!result.success) {
                    toast.error('Error guardando regla de asignación', { description: result.error })
                    setIsLoading(false)
                    return
                }
                // Update local state with saved ID for subsequent saves
                if (result.data) {
                    setAssignmentRule(result.data)
                    setInitialRuleId(result.data.id)
                }
            } else if (initialRuleId && !assignmentRule) {
                await deleteAssignmentRule(initialRuleId)
                setInitialRuleId(null)
            }
            toast.success(dict.common.saved)
            router.refresh()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(dict.common.error, { description: error.message || dict.common.unexpected_error })
        } finally { setIsLoading(false) }
    }

    const dayLabels: Record<number, string> = {
        1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo'
    }

    const timezones = [
        { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
        { value: 'America/Mexico_City', label: 'México (GMT-6)' },
        { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
        { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
        { value: 'Europe/Madrid', label: 'España (GMT+1)' },
    ]

    const providerLabel = ({
        'meta_whatsapp': 'WhatsApp', 'whatsapp_cloud': 'WhatsApp',
        'evolution_api': 'Evolution', 'facebook_page': 'Messenger', 
        'instagram_dm': 'Instagram', 'instagram_dme': 'Instagram',
    } as Record<string, string>)[channel.provider_key] || channel.provider_key

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl flex flex-col
                "
            >
                {/* Header */}
                <div className="shrink-0 px-6 py-4 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle className="text-lg font-bold tracking-tight">
                                {name || channel.connection_name}
                            </SheetTitle>
                            <SheetDescription className="text-[10px] font-medium opacity-70 uppercase tracking-widest">
                                {providerLabel} · {(channel.metadata as any)?.display_phone_number || channel.provider_key}
                            </SheetDescription>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={isLoading || isFetchingRule}
                            size="sm"
                            className="bg-primary text-primary-foreground hover:opacity-90 rounded-xl shadow-lg shadow-primary/10 px-4"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            <span className="ml-1.5 font-semibold text-xs">{t.save}</span>
                        </Button>
                    </div>
                </div>

                {/* Tabs Container */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                        <TabsList className="grid w-full grid-cols-2 bg-transparent h-9 p-0.5 gap-1">
                            <TabsTrigger 
                                value="general" 
                                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-xs font-semibold"
                            >
                                <Settings2 className="w-3.5 h-3.5 mr-2 opacity-70" />
                                {t.general.title}
                            </TabsTrigger>
                            <TabsTrigger 
                                value="automation" 
                                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-sm text-xs font-semibold"
                            >
                                <MessageSquare className="w-3.5 h-3.5 mr-2 opacity-70" />
                                Automatización y Horarios
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* ════════════════ TAB: GENERAL ════════════════ */}
                        <TabsContent value="general" className="m-0 p-6 space-y-6 focus-visible:outline-none">
                            
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <SectionTitle icon={Settings2} title="Información del Canal" />
                                <div className="grid gap-4 p-4 rounded-2xl border bg-white dark:bg-black/20 shadow-sm">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Nombre de la Conexión</Label>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="h-9 text-sm rounded-xl focus:ring-1 focus:ring-primary"
                                            placeholder="Ej: WhatsApp Principal"
                                        />
                                    </div>
                                    <SettingRow 
                                        label={t.general.primary_channel} 
                                        description={t.general.primary_desc}
                                        className="py-1"
                                    >
                                        <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                                    </SettingRow>
                                </div>
                            </div>

                            {/* WhatsApp Features */}
                            {isWhatsApp && (
                                <div className="space-y-4">
                                    <SectionTitle 
                                        icon={Phone} 
                                        title={t.calling.title} 
                                        badge={
                                            <div className={cn(
                                                "w-2 h-2 rounded-full animate-pulse",
                                                callingEnabled ? "bg-green-500" : "bg-gray-300"
                                            )} />
                                        } 
                                    />
                                    <div className="grid gap-1 p-4 rounded-2xl border bg-white dark:bg-black/20 shadow-sm divide-y divide-gray-100 dark:divide-white/5">
                                        <SettingRow label={t.calling.voice_title} description={t.calling.voice_desc} className="pt-0 pb-3">
                                            <Switch
                                                checked={callingEnabled}
                                                onCheckedChange={handleToggleCalling}
                                                disabled={callingLoading}
                                            />
                                        </SettingRow>
                                        <SettingRow label={t.calling.icon_title} description={t.calling.icon_desc} className="pt-3 pb-0">
                                            <Select
                                                value={iconVisibility}
                                                onValueChange={(v) => handleIconVisibility(v as 'DEFAULT' | 'HIDE')}
                                                disabled={callingLoading || !callingEnabled}
                                            >
                                                <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="DEFAULT">
                                                        <span className="flex items-center gap-1.5"><Eye className="w-3 h-3" />{t.calling.visibility.visible}</span>
                                                    </SelectItem>
                                                    <SelectItem value="HIDE">
                                                        <span className="flex items-center gap-1.5"><EyeOff className="w-3 h-3" />{t.calling.visibility.hidden}</span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </SettingRow>
                                    </div>
                                </div>
                            )}

                            {/* Routing & Leads */}
                            <div className="space-y-4">
                                <SectionTitle icon={Users} title="CRM y Asignación" />
                                <div className="grid gap-4 p-4 rounded-2xl border bg-white dark:bg-black/20 shadow-sm">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Etapa inicial del Lead</Label>
                                        <Select value={pipelineStageId || "none"} onValueChange={setPipelineStageId}>
                                            <SelectTrigger className="h-9 text-sm rounded-xl">
                                                <SelectValue placeholder="Seleccionar etapa..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No mover automáticamente</SelectItem>
                                                {pipelineStages.map(stage => (
                                                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground px-1">Los nuevos contactos de este canal se crearán en esta etapa.</p>
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                                        <SettingRow 
                                            label={t.assignment.custom_rule} 
                                            description={t.assignment.custom_rule_desc}
                                            className="py-1"
                                        >
                                            <Switch
                                                checked={!!assignmentRule}
                                                onCheckedChange={(checked) => {
                                                    if (checked && !assignmentRule) {
                                                        setAssignmentRule({
                                                            name: `Rule for ${channel.connection_name}`,
                                                            priority: 10,
                                                            conditions: { connection_id: [channel.id] },
                                                            strategy: 'round-robin',
                                                            assign_to: [],
                                                            is_active: true
                                                        } as any)
                                                    } else if (!checked) {
                                                        setAssignmentRule(null)
                                                    }
                                                }}
                                            />
                                        </SettingRow>

                                        {assignmentRule && (
                                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Estrategia de Reparto</Label>
                                                    <Select value={assignmentRule.strategy} onValueChange={(val) => setAssignmentRule({ ...assignmentRule, strategy: val })}>
                                                        <SelectTrigger className="h-8 text-sm rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="round-robin">Turno Rotativo (Round Robin)</SelectItem>
                                                            <SelectItem value="load-balance">Balanceo Inteligente</SelectItem>
                                                            <SelectItem value="specific-agent">Agentes Específicos</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-[10px] text-muted-foreground px-1">
                                                        {assignmentRule.strategy === 'round-robin' && 'Rota entre agentes disponibles en orden secuencial.'}
                                                        {assignmentRule.strategy === 'load-balance' && 'Asigna al agente con menor carga de trabajo actual.'}
                                                        {assignmentRule.strategy === 'specific-agent' && 'Asigna siempre a los agentes seleccionados abajo.'}
                                                    </p>
                                                </div>

                                                {assignmentRule.strategy === 'specific-agent' && (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Seleccionar Agentes</Label>
                                                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-gray-50/50 dark:bg-white/5">
                                                            {agents.map(agent => {
                                                                const targetType = channel.provider_key.includes('whatsapp') ? 'whatsapp' :
                                                                                 channel.provider_key.includes('instagram') ? 'instagram' :
                                                                                 (channel.provider_key.includes('facebook') || channel.provider_key.includes('messenger')) ? 'messenger' : 
                                                                                 channel.provider_key;
                                                                const isPrivileged = agent.role === 'owner' || agent.role === 'admin';
                                                                const hasChannelBinding = agent.agent_channels?.some((ac: any) => ac.channel_type === targetType && ac.is_active);
                                                                const hasExplicitAccess = agent.permissions?.inbox_access?.includes(channel.id);
                                                                const hasAccess = isPrivileged || hasChannelBinding || hasExplicitAccess;
                                                                const isSelected = assignmentRule.assign_to?.includes(agent.user.id);

                                                                return (
                                                                    <div 
                                                                        key={agent.user.id} 
                                                                        className={cn(
                                                                            "flex items-center gap-2 py-1.5 px-2 rounded-lg border border-transparent transition-all",
                                                                            hasAccess ? "hover:bg-white dark:hover:bg-white/5 hover:border-black/5" : "opacity-50 grayscale bg-gray-100/50 dark:bg-gray-800/30"
                                                                        )}
                                                                    >
                                                                        <Switch
                                                                            id={agent.user.id}
                                                                            checked={isSelected}
                                                                            disabled={!hasAccess}
                                                                            onCheckedChange={(checked) => {
                                                                                const current = assignmentRule.assign_to || []
                                                                                const updated = checked
                                                                                    ? [...current, agent.user.id]
                                                                                    : current.filter((id: string) => id !== agent.user.id)
                                                                                setAssignmentRule({ ...assignmentRule, assign_to: updated })
                                                                            }}
                                                                            className="scale-75"
                                                                        />
                                                                        <div className="flex flex-col min-w-0">
                                                                            <Label 
                                                                                htmlFor={agent.user.id} 
                                                                                className={cn(
                                                                                    "text-[10px] font-bold truncate cursor-pointer",
                                                                                    !hasAccess && "cursor-not-allowed"
                                                                                )}
                                                                            >
                                                                                {agent.user.full_name || agent.user.email}
                                                                            </Label>
                                                                            {!hasAccess && (
                                                                                <span className="text-[8px] text-red-500 font-bold uppercase leading-none">No Autorizado</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                         <p className="text-[10px] text-muted-foreground mt-2 px-1 italic">
                                                             Solo puedes seleccionar agentes que tengan el canal asignado en la configuración de equipo. 
                                                             <span className="font-semibold ml-1">(Admins y Owners tienen acceso total por defecto)</span>.
                                                         </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* ════════════════ TAB: AUTOMATION & HOURS ════════════════ */}
                        <TabsContent value="automation" className="m-0 p-6 space-y-6 focus-visible:outline-none">
                            
                            {/* Master Toggle - HIGH UX */}
                            <div className="p-4 rounded-2xl border bg-primary/5 border-primary/20 shadow-sm flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-xl transition-colors duration-300",
                                        workingHours.enabled 
                                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                                            : "bg-gray-200 text-gray-400 dark:bg-gray-800"
                                    )}>
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-bold">Horarios y Automatización Global</Label>
                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                            Controla la lógica de disponibilidad. Al activarlo, el sistema pausará otras automatizaciones durante los horarios configurados para priorizar las respuestas automáticas de este canal.
                                        </p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={workingHours.enabled} 
                                    onCheckedChange={checked => setWorkingHours({ ...workingHours, enabled: checked })} 
                                />
                            </div>

                            <div className={cn(
                                "space-y-6 transition-all duration-500", 
                                !workingHours.enabled && "opacity-40 grayscale pointer-events-none scale-[0.98] origin-top"
                            )}>
                                {/* Auto Responses */}
                                <div className="space-y-4">
                                    <SectionTitle icon={MessageSquare} title="Respuestas Automáticas" />
                                    <div className="grid gap-6 p-5 rounded-2xl border bg-white dark:bg-black/20 shadow-sm">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Bienvenida (Nuevos Leads)</Label>
                                                <Badge variant="outline" className="text-[9px] h-4">Online Only</Badge>
                                            </div>
                                            <textarea
                                                value={welcomeMessage}
                                                onChange={e => setWelcomeMessage(e.target.value)}
                                                placeholder="Ej: ¡Hola! Gracias por contactarnos..."
                                                className="w-full min-h-[80px] text-sm p-3 rounded-xl border bg-gray-50/50 dark:bg-white/5 focus:ring-1 focus:ring-primary outline-none resize-none"
                                            />
                                            <p className="text-[10px] text-muted-foreground leading-tight px-1 italic">
                                                Se enviará solo a contactos nuevos cuando el horario esté activo y no haya flujos de automatización prioritarios.
                                            </p>
                                        </div>

                                        <div className="space-y-2 border-t border-gray-100 dark:border-white/5 pt-4">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Respuesta Fuera de Horario</Label>
                                                <Badge variant="outline" className="text-[9px] h-4 text-orange-600 border-orange-200">Offline Only</Badge>
                                            </div>
                                            <textarea
                                                value={autoReply}
                                                onChange={e => setAutoReply(e.target.value)}
                                                placeholder="Ej: Lo sentimos, nuestro horario es de 9am a 6pm..."
                                                className="w-full min-h-[80px] text-sm p-3 rounded-xl border bg-gray-50/50 dark:bg-white/5 focus:ring-1 focus:ring-primary outline-none resize-none"
                                            />
                                            <p className="text-[10px] text-muted-foreground leading-tight px-1 italic">
                                                Se enviará automáticamente cuando el canal esté fuera de servicio. Limitado a una vez por hora por contacto.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Schedule Engine */}
                                <div className="space-y-4">
                                    <SectionTitle icon={Calendar} title="Horarios de Atención" />
                                    <div className="p-5 rounded-2xl border bg-white dark:bg-black/20 shadow-sm space-y-5">
                                        
                                        <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-semibold">Zona Horaria Global</span>
                                            </div>
                                            <Select 
                                                value={workingHours.timezone || 'America/Bogota'} 
                                                onValueChange={tz => setWorkingHours({ ...workingHours, timezone: tz })}
                                            >
                                                <SelectTrigger className="w-48 h-8 text-[11px] rounded-lg bg-white dark:bg-gray-900 border-none shadow-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {timezones.map(tz => (
                                                        <SelectItem key={tz.value} value={tz.value} className="text-[11px]">{tz.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Days Grid */}
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                                                const schedule = workingHours.days?.[day] || { enabled: false, ranges: [] }
                                                
                                                return (
                                                    <div 
                                                        key={day} 
                                                        className={cn(
                                                            "flex flex-col gap-2 p-3 rounded-xl border transition-all",
                                                            schedule.enabled ? "bg-white dark:bg-white/5 border-gray-200" : "bg-gray-50/50 dark:bg-black/10 border-transparent opacity-60"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    checked={schedule.enabled}
                                                                    onCheckedChange={checked => {
                                                                        const newDays = { ...workingHours.days }
                                                                        newDays[day] = { ...schedule, enabled: checked }
                                                                        if (checked && (!schedule.ranges || schedule.ranges.length === 0)) {
                                                                            newDays[day].ranges = [{ start: "09:00", end: "18:00" }]
                                                                        }
                                                                        setWorkingHours({ ...workingHours, days: newDays })
                                                                    }}
                                                                    className="scale-90"
                                                                />
                                                                <span className={cn("text-xs font-bold", day === 0 || day === 6 ? "text-muted-foreground" : "")}>
                                                                    {dayLabels[day]}
                                                                </span>
                                                            </div>
                                                            {!schedule.enabled ? (
                                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Cerrado</span>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-[9px] bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">Abierto</Badge>
                                                            )}
                                                        </div>

                                                        {schedule.enabled && (
                                                            <div className="pl-12 space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                                                {schedule.ranges?.map((range: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-2 group">
                                                                        <Input 
                                                                            type="time" 
                                                                            value={range.start} 
                                                                            onChange={e => {
                                                                                const newRanges = [...schedule.ranges]
                                                                                newRanges[idx] = { ...range, start: e.target.value }
                                                                                const newDays = { ...workingHours.days, [day]: { ...schedule, ranges: newRanges } }
                                                                                setWorkingHours({ ...workingHours, days: newDays })
                                                                            }}
                                                                            className="w-24 h-7 text-[11px] rounded-md px-2" 
                                                                        />
                                                                        <span className="text-[10px] text-muted-foreground font-bold">a</span>
                                                                        <Input 
                                                                            type="time" 
                                                                            value={range.end} 
                                                                            onChange={e => {
                                                                                const newRanges = [...schedule.ranges]
                                                                                newRanges[idx] = { ...range, end: e.target.value }
                                                                                const newDays = { ...workingHours.days, [day]: { ...schedule, ranges: newRanges } }
                                                                                setWorkingHours({ ...workingHours, days: newDays })
                                                                            }}
                                                                            className="w-24 h-7 text-[11px] rounded-md px-2" 
                                                                        />
                                                                        {idx > 0 && (
                                                                            <Button 
                                                                                variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                                onClick={() => {
                                                                                    const newRanges = schedule.ranges.filter((_: any, i: number) => i !== idx)
                                                                                    const newDays = { ...workingHours.days, [day]: { ...schedule, ranges: newRanges } }
                                                                                    setWorkingHours({ ...workingHours, days: newDays })
                                                                                }}
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                        {idx === 0 && schedule.ranges.length < 2 && (
                                                                            <Button 
                                                                                variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50"
                                                                                onClick={() => {
                                                                                    const newRanges = [...schedule.ranges, { start: "14:00", end: "18:00" }]
                                                                                    const newDays = { ...workingHours.days, [day]: { ...schedule, ranges: newRanges } }
                                                                                    setWorkingHours({ ...workingHours, days: newDays })
                                                                                }}
                                                                            >
                                                                                <Plus className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic text-center">
                                            Las automatizaciones secundarias se comportarán según este horario si está activado.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Footer Style spacing/decoration */}
                <div className="h-6 shrink-0 bg-transparent" />
            </SheetContent>
        </Sheet>
    )
}
