"use client"

import { Channel } from "../types"
import { PipelineStage } from "@/modules/core/crm/pipeline-actions"
import { Button } from "@/components/ui/button"
import {
    Save, Loader2, Phone, Eye, EyeOff, RefreshCw,
    Clock, Users, MessageSquare, Settings2, Star
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { updateChannel } from "../actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getChannelAssignmentRule, upsertAssignmentRule, deleteAssignmentRule } from "@/modules/core/messaging/assignment-actions"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/context"

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
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <Icon className="h-4 w-4" />
                {title}
            </div>
            {badge}
        </div>
    )
}

// Compact row for toggle-style settings
function SettingRow({ label, description, children }: { label: string, description?: string, children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0">
                <Label className="text-sm font-medium">{label}</Label>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

export function EditChannelSheet({ open, onOpenChange, channel, pipelineStages, agents }: EditChannelSheetProps) {
    const { dict } = useI18n()
    const t = dict.crm.crm_settings.channels.sheet
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingRule, setIsFetchingRule] = useState(false)

    // Form State
    const [name, setName] = useState(channel.connection_name)
    const [isPrimary, setIsPrimary] = useState(channel.is_primary)

    // Pipeline
    const [pipelineStageId, setPipelineStageId] = useState(channel.default_pipeline_stage_id || "none")
    // Auto Reply
    const [autoReply, setAutoReply] = useState(channel.auto_reply_when_offline || "")
    const [welcomeMessage, setWelcomeMessage] = useState(channel.welcome_message || "")

    // Working Hours
    const defaultHours = { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5], timezone: 'America/Bogota' }
    const [workingHours, setWorkingHours] = useState<any>({ ...defaultHours, ...(channel.working_hours || {}) })

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
                await upsertAssignmentRule({ ...assignmentRule, conditions: { connection_id: [channel.id] } })
            } else if (initialRuleId && !assignmentRule) {
                await deleteAssignmentRule(initialRuleId)
            }
            toast.success(dict.common.saved)
            onOpenChange(false)
        } catch (error: any) {
            toast.error(dict.common.error, { description: error.message || dict.common.unexpected_error })
        } finally { setIsLoading(false) }
    }

    const timezones = [
        { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
        { value: 'America/Mexico_City', label: 'México Central (GMT-6)' },
        { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
        { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
        { value: 'Europe/Madrid', label: 'España (GMT+1)' },
    ]

    const providerLabel = ({
        'meta_whatsapp': 'WhatsApp', 'whatsapp_cloud': 'WhatsApp',
        'evolution_api': 'Evolution', 'meta_instagram': 'Instagram', 'meta_business': 'Meta Business',
    } as Record<string, string>)[channel.provider_key] || channel.provider_key

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 shrink-0 px-6 py-4 bg-white/60 dark:bg-gray-950/60 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                                    {channel.connection_name}
                                </SheetTitle>
                                <SheetDescription className="text-xs">
                                    {providerLabel} · {(channel.metadata as any)?.display_phone_number || channel.provider_key}
                                </SheetDescription>
                            </div>
                            <Button
                                onClick={handleSave}
                                disabled={isLoading || isFetchingRule}
                                size="sm"
                                className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl shadow-lg shadow-black/10"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                <span className="ml-1.5">{t.save}</span>
                            </Button>
                        </div>
                    </div>

                    {/* Single scrollable view */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                        <div className="px-6 py-5 space-y-1">

                            {/* ═══════ WHATSAPP — CALLING API (first if applicable) ═══════ */}
                            {isWhatsApp && (
                                <>
                                    <SectionTitle
                                        icon={Phone}
                                        title={t.calling.title}
                                        badge={
                                            <Badge
                                                variant={callingEnabled ? "default" : "secondary"}
                                                className={`text-[10px] ${callingEnabled ? "bg-green-600" : ""}`}
                                            >
                                                {callingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : callingEnabled ? t.calling.status_on : t.calling.status_off}
                                            </Badge>
                                        }
                                    />
                                    <div className="rounded-xl border bg-white/50 dark:bg-white/5 px-4 divide-y divide-gray-100 dark:divide-white/5">
                                        <SettingRow label={t.calling.voice_title} description={t.calling.voice_desc}>
                                            <Switch
                                                checked={callingEnabled}
                                                onCheckedChange={handleToggleCalling}
                                                disabled={callingLoading}
                                            />
                                        </SettingRow>
                                        <SettingRow label={t.calling.icon_title} description={t.calling.icon_desc}>
                                            <Select
                                                value={iconVisibility}
                                                onValueChange={(v) => handleIconVisibility(v as 'DEFAULT' | 'HIDE')}
                                                disabled={callingLoading || !callingEnabled}
                                            >
                                                <SelectTrigger className="w-28 h-8 text-xs">
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
                                    <div className="flex items-center justify-between px-1 pt-1 pb-3">
                                        <span className="text-[10px] text-muted-foreground">
                                            {callingStatusSource === 'meta' && `✓ ${dict.common.saved}`}
                                            {callingStatusSource === 'default' && `○ ${t.calling.default_config}`}
                                            {callingStatusSource === 'error' && `⚠ ${dict.common.connection_error}`}
                                            {callingStatusSource === 'loading' && '...'}
                                        </span>
                                        <Button variant="ghost" size="sm" onClick={loadCallingStatus} disabled={callingLoading} className="h-6 text-[10px] px-2">
                                            <RefreshCw className="h-3 w-3 mr-1" />{t.calling.verify}
                                        </Button>
                                    </div>

                                    <div className="border-b border-gray-100 dark:border-white/5" />
                                </>
                            )}

                            {/* ═══════ GENERAL ═══════ */}
                            <SectionTitle icon={Settings2} title={t.general.title} />
                            <div className="rounded-xl border bg-white/50 dark:bg-white/5 px-4 divide-y divide-gray-100 dark:divide-white/5">
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t.general.connection_name}</Label>
                                    <Input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <SettingRow label={t.general.primary_channel} description={t.general.primary_desc}>
                                    <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                                </SettingRow>
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t.general.initial_stage}</Label>
                                    <Select value={pipelineStageId || "none"} onValueChange={setPipelineStageId}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder={dict.common.search} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t.general.stage_disabled}</SelectItem>
                                            {pipelineStages.map(stage => (
                                                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border-b border-gray-100 dark:border-white/5 my-1" />

                            {/* ═══════ MENSAJES Y HORARIO ═══════ */}
                            <SectionTitle icon={MessageSquare} title={t.messages.title} />
                            <div className="rounded-xl border bg-white/50 dark:bg-white/5 px-4 divide-y divide-gray-100 dark:divide-white/5">
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t.messages.welcome}</Label>
                                    <Input
                                        value={welcomeMessage}
                                        onChange={e => setWelcomeMessage(e.target.value)}
                                        placeholder={t.messages.welcome_placeholder}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="py-3 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">{t.messages.off_hours}</Label>
                                    <Input
                                        value={autoReply}
                                        onChange={e => setAutoReply(e.target.value)}
                                        placeholder={t.messages.off_hours_placeholder}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="border-b border-gray-100 dark:border-white/5 my-1" />

                            {/* ═══════ HORARIO ═══════ */}
                            <SectionTitle icon={Clock} title={t.schedule.title} />
                            <div className="rounded-xl border bg-white/50 dark:bg-white/5 px-4 py-3 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">{t.schedule.start}</Label>
                                        <Input type="time" value={workingHours.start} onChange={e => setWorkingHours({ ...workingHours, start: e.target.value })} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">{t.schedule.end}</Label>
                                        <Input type="time" value={workingHours.end} onChange={e => setWorkingHours({ ...workingHours, end: e.target.value })} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">{t.schedule.timezone}</Label>
                                    <Select value={workingHours.timezone || 'America/Bogota'} onValueChange={tz => setWorkingHours({ ...workingHours, timezone: tz })}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timezones.map(tz => (
                                                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border-b border-gray-100 dark:border-white/5 my-1" />

                            {/* ═══════ ASIGNACIÓN ═══════ */}
                            <SectionTitle
                                icon={Users}
                                title={t.assignment.title}
                                badge={isFetchingRule ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : undefined}
                            />
                            <div className="rounded-xl border bg-white/50 dark:bg-white/5 px-4 divide-y divide-gray-100 dark:divide-white/5">
                                <SettingRow label={t.assignment.custom_rule} description={t.assignment.custom_rule_desc}>
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
                                    <div className="py-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">{t.assignment.strategy}</Label>
                                            <Select value={assignmentRule.strategy} onValueChange={(val) => setAssignmentRule({ ...assignmentRule, strategy: val })}>
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="specific-agent">Agentes Específicos</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {assignmentRule.strategy === 'specific-agent' && (
                                            <div className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">Agentes</Label>
                                                <div className="grid grid-cols-1 gap-1 max-h-36 overflow-y-auto">
                                                    {agents.map(agent => (
                                                        <div key={agent.user.id} className="flex items-center gap-2 py-1 px-1 hover:bg-gray-50 dark:hover:bg-white/5 rounded">
                                                            <Switch
                                                                id={agent.user.id}
                                                                checked={assignmentRule.assign_to?.includes(agent.user.id)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = assignmentRule.assign_to || []
                                                                    const updated = checked
                                                                        ? [...current, agent.user.id]
                                                                        : current.filter((id: string) => id !== agent.user.id)
                                                                    setAssignmentRule({ ...assignmentRule, assign_to: updated })
                                                                }}
                                                                className="scale-75"
                                                            />
                                                            <Label htmlFor={agent.user.id} className="text-xs font-normal cursor-pointer">
                                                                {agent.user.full_name || agent.user.email}
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Bottom spacing */}
                            <div className="h-4" />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
