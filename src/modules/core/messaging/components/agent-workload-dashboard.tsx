"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { updateAgentStatus, toggleAutoAssign, updateAgentCapacity, getAgentsWorkload } from "../assignment-actions"
import { Circle, User, Zap, Info } from "lucide-react"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface AgentWorkload {
    agent_id: string
    status: 'online' | 'away' | 'offline' | 'busy'
    current_load: number
    max_capacity: number
    auto_assign_enabled: boolean
    users: {
        email: string
        raw_user_meta_data: any
    }
}

export function AgentWorkloadDashboard() {
    const [agents, setAgents] = useState<AgentWorkload[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadWorkload()

        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUser(data.user)
        })

        // Subscribe to agent_availability changes
        const channel = supabase
            .channel('agent-workload')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'agent_availability'
            }, () => {
                loadWorkload()
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [])

    const loadWorkload = async () => {
        setLoading(true)
        const result = await getAgentsWorkload()
        if (result.success) {
            setAgents(result.data as AgentWorkload[])
        }
        setLoading(false)
    }

    const handleStatusChange = async (status: 'online' | 'away' | 'offline' | 'busy') => {
        // Optimistic Update
        setAgents(prev => prev.map(a =>
            a.agent_id === currentUser?.id ? { ...a, status } : a
        ))

        const result = await updateAgentStatus(status)
        if (result.success) {
            toast.success(`Estado actualizado a ${status}`)
            // loadWorkload() // Realtime should handle this, but we can verify later
        } else {
            // Revert on failure
            toast.error(result.error || 'Error al actualizar estado')
            loadWorkload()
        }
    }

    const handleAutoAssignToggle = async (enabled: boolean) => {
        // Optimistic Update
        setAgents(prev => prev.map(a =>
            a.agent_id === currentUser?.id ? { ...a, auto_assign_enabled: enabled } : a
        ))

        const result = await toggleAutoAssign(enabled)
        if (result.success) {
            toast.success(enabled ? 'Auto-asignación activada' : 'Auto-asignación desactivada')
        } else {
            toast.error(result.error || 'Error al cambiar auto-asignación')
            loadWorkload()
        }
    }

    const handleCapacityChange = async (value: number[]) => {
        const newCapacity = value[0]

        // Optimistic Update (Commit)
        setAgents(prev => prev.map(a =>
            a.agent_id === currentUser?.id ? { ...a, max_capacity: newCapacity } : a
        ))

        const result = await updateAgentCapacity(newCapacity)
        if (result.success) {
            toast.success(`Capacidad actualizada a ${newCapacity}`)
        } else {
            toast.error(result.error || 'Error al actualizar capacidad')
            loadWorkload()
        }
    }

    // Handle slider drag for smooth UI
    const handleSliderChange = (value: number[]) => {
        setAgents(prev => prev.map(a =>
            a.agent_id === currentUser?.id ? { ...a, max_capacity: value[0] } : a
        ))
    }

    const currentAgent = agents.find(a => a.agent_id === currentUser?.id)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'text-green-500'
            case 'away': return 'text-yellow-500'
            case 'busy': return 'text-orange-500'
            case 'offline': return 'text-gray-400'
            default: return 'text-gray-400'
        }
    }

    const getLoadPercentage = (agent: AgentWorkload) => {
        return (agent.current_load / agent.max_capacity) * 100
    }

    const getUserName = (agent: AgentWorkload) => {
        // If it's me, use my local user data
        if (agent.agent_id === currentUser?.id) {
            return currentUser.user_metadata?.name || currentUser.email || 'Tú'
        }
        // Fallback for others (since we removed join for now)
        return agent.users?.raw_user_meta_data?.name || agent.users?.email || `Agente ${agent.agent_id.substring(0, 4)}`
    }

    if (loading) {
        return <div className="p-6 text-center text-muted-foreground">Cargando estado...</div>
    }

    const handleInitializeProfile = async () => {
        setLoading(true)
        // Auto-create agent profile by setting status which upserts in backend
        const result = await updateAgentStatus('online')
        if (result.success) {
            toast.success('Perfil de agente inicializado')
            // Force reload to ensure RLS and server state are fully propagated
            window.location.reload()
        } else {
            toast.error('Error al inicializar perfil: ' + result.error)
        }
        setLoading(false)
    }

    if (loading) {
        return <div className="p-6 text-center text-muted-foreground">Cargando estado...</div>
    }

    // Fallback if current user has no agent profile yet
    if (!currentAgent && currentUser) {
        return (
            <div className="space-y-6">
                <Card className="p-8 text-center border-dashed border-2">
                    <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <User className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Perfil de Agente No Encontrado</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Parece que aún no tienes un perfil de agente activo. Actívalo para comenzar a recibir chats.
                    </p>
                    <Button onClick={handleInitializeProfile}>
                        Activar mi Perfil de Agente
                    </Button>
                </Card>
                {/* Still show team workload if available */}
                {agents.length > 0 && (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Carga del Equipo</h3>
                        {/* ... existing team list code ... */}
                        <div className="space-y-3">
                            {agents.map(agent => (
                                <div key={agent.agent_id} className="flex items-center gap-3 p-3 rounded-lg border">
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="h-4 w-4 text-gray-500" />
                                    </div>
                                    <span className="text-sm">{getUserName(agent)}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Current Agent Status Card */}
            {currentAgent && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Tu Estado</h3>

                    {/* Status Selector */}
                    <div className="flex gap-2 mb-4">
                        {(['online', 'away', 'busy', 'offline'] as const).map(status => (
                            <Button
                                key={status}
                                variant={currentAgent.status === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleStatusChange(status)}
                                className="capitalize"
                            >
                                <Circle className={`h-3 w-3 mr-2 fill-current ${getStatusColor(status)}`} />
                                {status === 'online' ? 'Disponible' :
                                    status === 'away' ? 'Ausente' :
                                        status === 'busy' ? 'Ocupado' : 'Offline'}
                            </Button>
                        ))}
                    </div>
                    {currentAgent.status !== 'online' && (
                        <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-2 rounded border border-amber-100">
                            Nota: Debes estar <strong>Disponible</strong> para recibir nuevas conversaciones automáticas.
                        </p>
                    )}

                    {/* Auto-Assign Toggle */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="text-sm font-medium">Auto-Asignación</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs text-xs">
                                            Si está activado, el sistema te asignará chats automáticamente según las reglas definidas.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Switch
                            checked={currentAgent.auto_assign_enabled}
                            onCheckedChange={handleAutoAssignToggle}
                        />
                    </div>

                    {/* Capacity Slider */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span>Capacidad Máxima</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                Número máximo de conversaciones activas que puedes manejar al mismo tiempo.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <span className="font-semibold">{currentAgent.max_capacity} chats</span>
                        </div>
                        <Slider
                            value={[currentAgent.max_capacity]}
                            onValueChange={handleSliderChange} // Smooth Drag
                            onValueCommit={handleCapacityChange} // Commit to server
                            min={1}
                            max={50}
                            step={1}
                            className="w-full"
                        />
                    </div>

                    {/* Current Load */}
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Carga Actual</span>
                            <span className="text-lg font-bold">
                                {currentAgent.current_load} / {currentAgent.max_capacity}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${getLoadPercentage(currentAgent)}%` }}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {/* All Agents Workload */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Carga del Equipo</h3>
                <div className="space-y-3">
                    {agents.map(agent => {
                        const loadPercentage = getLoadPercentage(agent)
                        const name = agent.users?.raw_user_meta_data?.name || agent.users?.email || 'Desconocido'

                        return (
                            <div key={agent.agent_id} className="flex items-center gap-3 p-3 rounded-lg border">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center relative">
                                        <User className="h-5 w-5 text-gray-600" />
                                        <Circle
                                            className={`h-3 w-3 absolute -bottom-0.5 -right-0.5 fill-current ${getStatusColor(agent.status)} border-2 border-white rounded-full`}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium truncate">{name}</span>
                                        {!agent.auto_assign_enabled && (
                                            <Badge variant="outline" className="text-xs">Manual</Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${loadPercentage >= 90 ? 'bg-red-500' :
                                                    loadPercentage >= 70 ? 'bg-yellow-500' :
                                                        'bg-green-500'
                                                    }`}
                                                style={{ width: `${Math.min(loadPercentage, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {agent.current_load}/{agent.max_capacity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </Card>

            {/* Test Tools (Dev Only) */}
            <Card className="p-4 border-dashed border-indigo-200 bg-indigo-50/50">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded text-indigo-600 mt-1">
                        <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-indigo-900">Herramientas de Prueba</h4>
                        <p className="text-xs text-indigo-700 mb-3">
                            Simula eventos para verificar el funcionamiento de las reglas.
                        </p>
                        <SimulationControls />
                    </div>
                </div>
            </Card>
        </div>
    )
}

function SimulationControls() {
    const [loading, setLoading] = useState(false)
    const { simulateInboundMessage } = require('../actions') // Lazy load actions

    const handleSimulateMessage = async () => {
        setLoading(true)
        try {
            // Random phone to create new leads
            const randomPhone = `555${Math.floor(Math.random() * 899999 + 100000)}`
            const result = await simulateInboundMessage(randomPhone)

            if (result.success) {
                toast.success('Mensaje simulado enviado', {
                    description: 'Revisa el inbox, debería aparecer un nuevo chat asignado.'
                })
            } else {
                toast.error('Falló la simulación: ' + result.message)
            }
        } catch (err: any) {
            toast.error('Error: ' + err.message)
        }
        setLoading(false)
    }

    return (
        <Button
            size="sm"
            variant="secondary"
            className="bg-white hover:bg-white/80 border text-indigo-700"
            onClick={handleSimulateMessage}
            disabled={loading}
        >
            {loading ? 'Simulando...' : 'Simular Mensaje Nuevo (WhatsApp)'}
        </Button>
    )
}
