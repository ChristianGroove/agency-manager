"use client"

import { Channel } from "../types"
import { PipelineStage } from "@/modules/core/crm/pipeline-actions"
import { Button } from "@/components/ui/button"
import { Save, ArrowLeft, Loader2, Link2, ShieldAlert } from "lucide-react"
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
import { WebhookUrlCard } from "./webhook-url-card"

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

    // Credentials State (Initialized from channel.credentials or defaults)
    const [credentials, setCredentials] = useState<any>(channel.credentials || {})

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

    // Fetch Rule on Open
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
        }
    }, [open, channel.id])


    const handleSave = async () => {
        setIsLoading(true)
        try {
            // 1. Save Channel Config & Credentials
            await updateChannel(channel.id, {
                connection_name: name,
                is_primary: isPrimary,
                default_pipeline_stage_id: pipelineStageId === "none" ? null : pipelineStageId,
                auto_reply_when_offline: autoReply,
                welcome_message: welcomeMessage,
                working_hours: workingHours,
                credentials: credentials // Saving updated credentials
            })

            // 2. Save Routing Rule
            if (assignmentRule) {
                await upsertAssignmentRule({
                    ...assignmentRule,
                    conditions: { connection_id: [channel.id] } // Enforce connection link
                })
            } else if (initialRuleId && !assignmentRule) {
                // If it existed but now is null (disabled), delete it
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

                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header Fixed */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                <Link2 className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">Configuración de Canal</SheetTitle>
                                <SheetDescription>
                                    {channel.connection_name} ({channel.provider_key})
                                </SheetDescription>
                            </div>
                        </div>
                        <Button onClick={handleSave} disabled={isLoading || isFetchingRule} className="bg-black text-white hover:bg-gray-800 rounded-xl shadow-lg shadow-black/10">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Guardar
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative scrollbar-thin scrollbar-thumb-gray-200">
                        <Tabs defaultValue="general" className="space-y-6">
                            <TabsList className="bg-white border w-full justify-start p-1 h-auto flex-wrap">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="connection" className="data-[state=active]:text-blue-600">Conexión</TabsTrigger>
                                <TabsTrigger value="routing">Reglas de Asignación</TabsTrigger>
                                <TabsTrigger value="automation">Respuestas & Horarios</TabsTrigger>
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
                                        <div className="flex items-center justify-between rounded-lg border p-4 bg-white">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Canal Principal</Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Usar este canal por defecto para mensajes salientes (si no hay conversación previa).
                                                </p>
                                            </div>
                                            <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* --- CONNECTION (THE MISSING PIECE) --- */}
                            <TabsContent value="connection">
                                <Card className="border-blue-100 shadow-sm">
                                    <CardHeader className="bg-blue-50/50 pb-4">
                                        <CardTitle className="flex items-center gap-2 text-blue-700">
                                            <Link2 className="h-5 w-5" /> Credenciales de Conexión
                                        </CardTitle>
                                        <CardDescription>
                                            Edita aquí las claves API o IDs. ¡Cuidado! Cambiar esto puede romper la conexión.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        {channel.provider_key === 'meta_whatsapp' && (
                                            <>
                                                <div className="grid gap-2">
                                                    <Label>Phone Number ID</Label>
                                                    <Input
                                                        value={credentials.phoneNumberId || ''}
                                                        onChange={e => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                                                        className="font-mono bg-slate-50"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>WABA ID</Label>
                                                    <Input
                                                        value={credentials.wabaId || ''}
                                                        onChange={e => setCredentials({ ...credentials, wabaId: e.target.value })}
                                                        className="font-mono bg-slate-50"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Access Token (Permanent)</Label>
                                                    <Input
                                                        type="password"
                                                        value={credentials.accessToken || ''}
                                                        onChange={e => setCredentials({ ...credentials, accessToken: e.target.value })}
                                                        className="font-mono bg-slate-50"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Recomendamos usar un Token de Usuario del Sistema.</p>
                                                </div>
                                            </>
                                        )}

                                        {channel.provider_key === 'evolution_api' && (
                                            <>
                                                <div className="grid gap-2">
                                                    <Label>Instance Name</Label>
                                                    <Input
                                                        value={credentials.instanceName || ''}
                                                        onChange={e => setCredentials({ ...credentials, instanceName: e.target.value })}
                                                        className="bg-slate-50"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Server URL</Label>
                                                    <Input
                                                        value={credentials.baseUrl || ''}
                                                        onChange={e => setCredentials({ ...credentials, baseUrl: e.target.value })}
                                                        className="bg-slate-50"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>API Key (Global)</Label>
                                                    <Input
                                                        type="password"
                                                        value={credentials.apiKey || ''}
                                                        onChange={e => setCredentials({ ...credentials, apiKey: e.target.value })}
                                                        className="bg-slate-50"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {!['meta_whatsapp', 'evolution_api'].includes(channel.provider_key) && (
                                            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 flex gap-2">
                                                <ShieldAlert className="h-5 w-5" />
                                                <p className="text-sm">La edición visual de credenciales no está disponible para este proveedor.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Webhook URL Display */}
                                <WebhookUrlCard providerKey={channel.provider_key} />
                            </TabsContent>

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
                                                        <SelectTrigger className="bg-white">
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
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2 bg-white">
                                                            {agents.map(agent => (
                                                                <div key={agent.user.id} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded">
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
