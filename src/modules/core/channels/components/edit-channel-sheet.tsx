"use client"

import { Channel } from "../types"
import { PipelineStage } from "@/modules/core/crm/pipeline-actions"
import { Button } from "@/components/ui/button"
import { Save, Loader2, Link2, Phone, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { updateChannel } from "../actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getChannelAssignmentRule, upsertAssignmentRule, deleteAssignmentRule } from "@/modules/core/messaging/assignment-actions"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface EditChannelSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    channel: Channel
    pipelineStages: PipelineStage[]
    agents: any[]
}

export function EditChannelSheet({ open, onOpenChange, channel, pipelineStages, agents }: EditChannelSheetProps) {
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

    // Fetch Routing Rule on Open
    useEffect(() => {
        if (open) {
            setIsFetchingRule(true)
            getChannelAssignmentRule(channel.id)
                .then(rule => {
                    if (rule) {
                        setAssignmentRule(rule)
                        setInitialRuleId(rule.id)
                    } else {
                        setAssignmentRule(null)
                        setInitialRuleId(null)
                    }
                })
                .finally(() => setIsFetchingRule(false))

            // Fetch calling status for WhatsApp channels
            if (isWhatsApp) {
                loadCallingStatus()
            }
        }
    }, [open, channel.id])

    // Load calling status from Meta
    async function loadCallingStatus() {
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling')
            const data = await res.json()
            setCallingEnabled(data.enabled ?? false)
            setIconVisibility(data.iconVisibility ?? 'HIDE')
            setCallingStatusSource(data.source ?? 'unknown')
        } catch (err) {
            console.error('Failed to load calling status:', err)
            setCallingStatusSource('error')
        } finally {
            setCallingLoading(false)
        }
    }

    // Toggle calling API
    async function handleToggleCalling(enabled: boolean) {
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle', enabled })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update')

            setCallingEnabled(enabled)
            if (enabled && iconVisibility === 'HIDE') {
                setIconVisibility('DEFAULT')
            }

            toast.success(enabled ? 'Calling API activado' : 'Calling API desactivado', {
                description: 'Confirmación recibida de Meta Graph API'
            })
        } catch (error: any) {
            toast.error('Error de Meta API', { description: error.message })
            setCallingEnabled(!enabled)
        } finally {
            setCallingLoading(false)
        }
    }

    // Toggle icon visibility
    async function handleIconVisibility(visibility: 'DEFAULT' | 'HIDE') {
        if (!callingEnabled && visibility === 'DEFAULT') {
            toast.error('Activa Calling primero', { description: 'No puedes mostrar el ícono sin activar las llamadas.' })
            return
        }
        setCallingLoading(true)
        try {
            const res = await fetch('/api/meta/calling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'icon', visibility })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update')

            setIconVisibility(visibility)
            toast.success('Visibilidad actualizada', {
                description: visibility === 'DEFAULT'
                    ? 'El ícono de llamada es visible para los usuarios'
                    : 'El ícono de llamada está oculto'
            })
        } catch (error: any) {
            toast.error('Error', { description: error.message })
        } finally {
            setCallingLoading(false)
        }
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
                await upsertAssignmentRule({
                    ...assignmentRule,
                    conditions: { connection_id: [channel.id] }
                })
            } else if (initialRuleId && !assignmentRule) {
                await deleteAssignmentRule(initialRuleId)
            }

            toast.success("Guardado", { description: "Configuración del canal actualizada." })
            onOpenChange(false)
        } catch (error: any) {
            toast.error("Error", { description: error.message || "No se pudo guardar." })
        } finally {
            setIsLoading(false)
        }
    }

    const timezones = [
        { value: 'America/Bogota', label: 'Colombia (GMT-5)' },
        { value: 'America/Mexico_City', label: 'México Central (GMT-6)' },
        { value: 'America/Sao_Paulo', label: 'Brasil (GMT-3)' },
        { value: 'America/New_York', label: 'US Eastern (GMT-5)' },
        { value: 'Europe/Madrid', label: 'España (GMT+1)' },
    ]

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-3xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl">
                    {/* Header Fixed */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 dark:bg-gray-950/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-400">
                                <Link2 className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Configuración de Canal</SheetTitle>
                                <SheetDescription>
                                    {channel.connection_name}
                                </SheetDescription>
                            </div>
                        </div>
                        <Button onClick={handleSave} disabled={isLoading || isFetchingRule} className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl shadow-lg shadow-black/10">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Guardar
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative scrollbar-thin scrollbar-thumb-gray-200">
                        <Tabs defaultValue="general" className="space-y-6">
                            <TabsList className="bg-white dark:bg-gray-900 border w-full justify-start p-1 h-auto flex-wrap">
                                <TabsTrigger value="general">General</TabsTrigger>
                                {isWhatsApp && (
                                    <TabsTrigger value="whatsapp" className="data-[state=active]:text-green-600">
                                        <Phone className="h-3.5 w-3.5 mr-1.5" />
                                        WhatsApp
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="routing">Asignación</TabsTrigger>
                                <TabsTrigger value="automation">Automatización</TabsTrigger>
                            </TabsList>

                            {/* --- GENERAL --- */}
                            <TabsContent value="general">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Básico</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Nombre de la Conexión</Label>
                                            <Input value={name} onChange={e => setName(e.target.value)} />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-4 bg-white dark:bg-gray-900">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Canal Principal</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Usar este canal por defecto para mensajes salientes.
                                                </p>
                                            </div>
                                            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- WHATSAPP FEATURES (Calling API) --- */}
                            {isWhatsApp && (
                                <TabsContent value="whatsapp">
                                    <div className="space-y-6">
                                        {/* Calling API Controls */}
                                        <Card className="border-green-200 dark:border-green-900 shadow-sm">
                                            <CardHeader className="bg-green-50/50 dark:bg-green-950/20">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                                                            <Phone className="h-5 w-5" />
                                                            Calling API
                                                        </CardTitle>
                                                        <CardDescription className="mt-1">
                                                            Controla las llamadas de voz vía WhatsApp Business
                                                        </CardDescription>
                                                    </div>
                                                    <Badge
                                                        variant={callingEnabled ? "default" : "secondary"}
                                                        className={callingEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                                                    >
                                                        {callingLoading ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : callingEnabled ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-5 pt-6">
                                                {/* Enable/Disable Toggle */}
                                                <div className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-900">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base font-semibold">
                                                            Llamadas de Voz
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Permite recibir y realizar llamadas por WhatsApp
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        checked={callingEnabled}
                                                        onCheckedChange={handleToggleCalling}
                                                        disabled={callingLoading}
                                                    />
                                                </div>

                                                <Separator />

                                                {/* Icon Visibility */}
                                                <div className="flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-900">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-base font-semibold">
                                                            Ícono de Llamada
                                                        </Label>
                                                        <p className="text-sm text-muted-foreground">
                                                            Muestra u oculta el botón de llamar en el chat de WhatsApp
                                                        </p>
                                                    </div>
                                                    <Select
                                                        value={iconVisibility}
                                                        onValueChange={(v) => handleIconVisibility(v as 'DEFAULT' | 'HIDE')}
                                                        disabled={callingLoading || !callingEnabled}
                                                    >
                                                        <SelectTrigger className="w-36">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="DEFAULT">
                                                                <div className="flex items-center gap-2">
                                                                    <Eye className="w-4 h-4" />
                                                                    Visible
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="HIDE">
                                                                <div className="flex items-center gap-2">
                                                                    <EyeOff className="w-4 h-4" />
                                                                    Oculto
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Status Info */}
                                                {callingLoading && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Sincronizando con Meta...
                                                    </div>
                                                )}

                                                {/* Refresh */}
                                                <div className="flex items-center justify-between pt-2">
                                                    <span className="text-xs text-muted-foreground">
                                                        {callingStatusSource === 'meta' && 'Estado sincronizado con Meta'}
                                                        {callingStatusSource === 'default' && 'Configuración predeterminada'}
                                                        {callingStatusSource === 'error' && 'No se pudo verificar el estado'}
                                                        {callingStatusSource === 'loading' && 'Cargando...'}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={loadCallingStatus}
                                                        disabled={callingLoading}
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                                        Verificar
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Info Card */}
                                        <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/50">
                                            <CardContent className="pt-5 text-sm text-blue-700 dark:text-blue-400 space-y-2">
                                                <p>
                                                    <strong>¿Cómo funciona?</strong> Cuando activas Calling, los usuarios de WhatsApp podrán llamar a tu número de negocio.
                                                </p>
                                                <p>
                                                    <strong>Ícono de llamada:</strong> El modo &quot;Visible&quot; muestra un botón de llamar en la cabecera del chat. Los cambios se aplican inmediatamente en WhatsApp.
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            )}

                            {/* --- ROUTING --- */}
                            <TabsContent value="routing">
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>Reglas de Asignación</CardTitle>
                                                <CardDescription>¿Quién debe atender los chats de este canal?</CardDescription>
                                            </div>
                                            {isFetchingRule && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="flex items-center justify-between rounded-lg border p-4">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Asignación Personalizada</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Sobrescribir reglas generales para este canal.
                                                </p>
                                            </div>
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
                                        </div>

                                        {assignmentRule && (
                                            <div className="space-y-4 border-l-2 border-primary/20 pl-4 animate-in slide-in-from-left-2">
                                                <div className="grid gap-2">
                                                    <Label>Estrategia</Label>
                                                    <Select
                                                        value={assignmentRule.strategy}
                                                        onValueChange={(val) => setAssignmentRule({ ...assignmentRule, strategy: val })}
                                                    >
                                                        <SelectTrigger className="bg-white dark:bg-gray-900">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="round-robin">Round Robin (Equitativo)</SelectItem>
                                                            <SelectItem value="specific-agent">Agentes Específicos</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {assignmentRule.strategy === 'specific-agent' && (
                                                    <div className="grid gap-2">
                                                        <Label>Seleccionar Agentes</Label>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-white dark:bg-gray-900">
                                                            {agents.map(agent => (
                                                                <div key={agent.user.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-gray-800 rounded">
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
                                                                    />
                                                                    <Label htmlFor={agent.user.id} className="text-sm font-normal cursor-pointer w-full">
                                                                        {agent.user.full_name || agent.user.email}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- AUTOMATION --- */}
                            <TabsContent value="automation">
                                <div className="grid gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Entrada al CRM</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Etapa Inicial del Pipeline</Label>
                                                <Select value={pipelineStageId || "none"} onValueChange={setPipelineStageId}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a stage" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Desactivado</SelectItem>
                                                        {pipelineStages.map(stage => (
                                                            <SelectItem key={stage.id} value={stage.id}>
                                                                {stage.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Los nuevos leads entrarán automáticamente aquí.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Respuestas Automáticas</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Mensaje de Bienvenida</Label>
                                                <Input
                                                    value={welcomeMessage}
                                                    onChange={e => setWelcomeMessage(e.target.value)}
                                                    placeholder="Ej: ¡Hola! Gracias por escribirnos..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Respuesta de Fuera de Horario</Label>
                                                <Input
                                                    value={autoReply}
                                                    onChange={e => setAutoReply(e.target.value)}
                                                    placeholder="Ej: Estamos cerrados, te contactamos mañana."
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Horario de Atención</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Inicio</Label>
                                                    <Input type="time" value={workingHours.start} onChange={e => setWorkingHours({ ...workingHours, start: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Fin</Label>
                                                    <Input type="time" value={workingHours.end} onChange={e => setWorkingHours({ ...workingHours, end: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Timezone</Label>
                                                <Select
                                                    value={workingHours.timezone || 'America/Bogota'}
                                                    onValueChange={tz => setWorkingHours({ ...workingHours, timezone: tz })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {timezones.map(tz => (
                                                            <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
