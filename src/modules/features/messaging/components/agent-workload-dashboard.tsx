"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/modules/core/database/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { updateAgentStatus, toggleAutoAssign, updateAgentCapacity, getAgentsWorkload } from "../assignment-actions"
import { AGENT_MAX_CAPACITY, AGENT_MIN_CAPACITY } from "../assignment-constants"
import { simulateInboundMessage } from "@/modules/features/messaging/messaging-actions"
import { Circle, User, Zap, Info, Loader2, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTranslation } from "@/modules/core/i18n/use-translation"

interface AgentWorkload {
    agent_id: string
    status: 'online' | 'away' | 'offline' | 'busy'
    last_seen_at?: string
    current_load: number
    max_capacity: number
    auto_assign_enabled: boolean
    users: {
        email: string
        raw_user_meta_data: any
    }
}

export function AgentWorkloadDashboard({ isAdmin }: { isAdmin?: boolean }) {
    const { t } = useTranslation()
    const [agents, setAgents] = useState<AgentWorkload[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadWorkload()

        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUser(data.user)
        })

        // Poll agent_availability every 30s (not time-critical, avoids unfiltered realtime)
        const pollInterval = setInterval(() => {
            loadWorkload()
        }, 30000)

        return () => {
            clearInterval(pollInterval)
        }
    }, [])

    const loadWorkload = async (showLoading = true) => {
        if (showLoading) setLoading(true)
        const result = await getAgentsWorkload()
        if (result.success) {
            setAgents(result.data as AgentWorkload[])
        }
        if (showLoading) setLoading(false)
    }

    const handleReconcile = async () => {
        setLoading(true)
        try {
            const { reconcileAllAgentLoads } = await import("../assignment-actions")
            const result = await reconcileAllAgentLoads()
            if (result.success) {
                toast.success(t('crm.inbox.settings.sections.reconcile_success', { 
                    count: (result.data as any).reconciled 
                }) || `Sincronización completa. ${(result.data as any).reconciled} registros corregidos.`)
                await loadWorkload(false)
            } else {
                toast.error(result.error || "Fallo en la sincronización")
            }
        } catch (err) {
            toast.error("Error al sincronizar")
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (status: 'online' | 'away' | 'offline' | 'busy') => {
        // Optimistic Update
        setAgents(prev => prev.map(a =>
            a.agent_id === currentUser?.id ? { ...a, status } : a
        ))

        const result = await updateAgentStatus(status)
        if (result.success) {
            toast.success(t('crm.inbox.settings.sections.status_updated', { status: t(`crm.inbox.settings.sections.${status}`) }))
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.update_error'))
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
            toast.success(enabled ? t('crm.inbox.settings.sections.auto_assign_on') : t('crm.inbox.settings.sections.auto_assign_off'))
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.auto_assign_error'))
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
            toast.success(t('crm.inbox.settings.sections.capacity_updated', { capacity: newCapacity }))
        } else {
            toast.error(result.error || t('crm.inbox.settings.sections.capacity_error'))
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

    const getStatusColor = (agentStatus: string, lastSeen?: string) => {
        // Heartbeat validation: 3 minutes threshold
        const isActuallyOnline = agentStatus === 'online' && (
            !lastSeen || (new Date(lastSeen).getTime() > Date.now() - 3 * 60 * 1000)
        );

        if (!isActuallyOnline && agentStatus === 'online') return 'text-gray-400';

        switch (agentStatus) {
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
            return currentUser.user_metadata?.name || currentUser.email || t('common.you')
        }
        // Fallback for others (since we removed join for now)
        return agent.users?.raw_user_meta_data?.name || agent.users?.email || `${t('crm.inbox.settings.tabs.status')} ${agent.agent_id.substring(0, 4)}`
    }

    if (loading) {
        return <div className="p-6 text-center text-muted-foreground">Cargando estado...</div>
    }

    // Provisioning is now handled by DB trigger, we just check if it exists
    if (!currentAgent && currentUser) {
        return (
            <div className="p-6 text-center">
                <Card className="p-8 border-dashed">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500 mb-2" />
                    <p className="text-sm text-muted-foreground">Sincronizando perfil de agente...</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Current Agent Status Card */}
            {currentAgent && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold">{t('crm.inbox.settings.sections.your_status')}</h3>
                            <p className="text-xs text-muted-foreground">Controla cómo te ven los clientes y el sistema de asignación.</p>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                            Perfil Activo
                        </Badge>
                    </div>

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
                                <Circle className={`h-3 w-3 mr-2 fill-current ${getStatusColor(status, currentAgent.last_seen_at)}`} />
                                {t(`crm.inbox.settings.sections.${status}`)}
                            </Button>
                        ))}
                    </div>
                    {currentAgent.status !== 'online' && (
                        <p className="text-xs text-amber-600 mb-4 bg-amber-50 p-2 rounded border border-amber-100">
                            {t('crm.inbox.settings.sections.available_note', { status: '' }).split('{status}').map((part, i, arr) => (
                                <React.Fragment key={i}>
                                    {part}
                                    {i < arr.length - 1 && <strong>{t('crm.inbox.settings.sections.online')}</strong>}
                                </React.Fragment>
                            ))}
                        </p>
                    )}

                    {/* Auto-Assign Toggle */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            <span className="text-sm font-medium">{t('crm.inbox.settings.sections.auto_assign')}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs text-xs">
                                            {t('crm.inbox.settings.sections.auto_assign_tooltip')}
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
                                <span>{t('crm.inbox.settings.sections.max_capacity')}</span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                {t('crm.inbox.settings.sections.max_capacity_tooltip')}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <span className="font-semibold">{t('crm.inbox.settings.sections.max_capacity_chats', { capacity: currentAgent.max_capacity })}</span>
                        </div>
                        <Slider
                            value={[currentAgent.max_capacity]}
                            onValueChange={handleSliderChange} // Smooth Drag
                            onValueCommit={handleCapacityChange} // Commit to server
                            min={AGENT_MIN_CAPACITY}
                            max={AGENT_MAX_CAPACITY}
                            step={1}
                            className="w-full"
                        />
                    </div>

                    {/* Current Load */}
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">{t('crm.inbox.settings.sections.current_load')}</span>
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

            {/* All Agents Workload - Restricted to Admins/Owners */}
            {isAdmin && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">{t('crm.inbox.settings.sections.team_workload')}</h3>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleReconcile}
                            disabled={loading}
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        >
                            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('crm.inbox.settings.sections.reconcile') || "Recalcular Cargas"}
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {agents.map(agent => {
                            const loadPercentage = getLoadPercentage(agent)
                            const name = agent.users?.raw_user_meta_data?.name || agent.users?.email || t('common.unknown')

                            return (
                                <div key={agent.agent_id} className="flex items-center gap-3 p-3 rounded-lg border">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center relative">
                                            <User className="h-5 w-5 text-gray-600" />
                                            <Circle
                                                className={`h-3 w-3 absolute -bottom-0.5 -right-0.5 fill-current ${getStatusColor(agent.status, agent.last_seen_at)} border-2 border-white rounded-full`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium truncate">{name}</span>
                                            {!agent.auto_assign_enabled && (
                                                <Badge variant="outline" className="text-xs">{t('crm.inbox.settings.sections.manual')}</Badge>
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
            )}

            {/* Test Tools (Dev Only + Admin/Owner Restricted) */}
            {process.env.NODE_ENV !== 'production' && isAdmin && (
                <Card className="p-4 border-dashed border-indigo-200 bg-indigo-50/50">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 rounded text-indigo-600 mt-1">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-indigo-900">{t('crm.inbox.settings.sections.test_tools')}</h4>
                            <p className="text-xs text-indigo-700 mb-3">
                                {t('crm.inbox.settings.sections.test_tools_desc')}
                            </p>
                            <SimulationControls t={t} />
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}

function SimulationControls({ t }: { t: any }) {
    const [loading, setLoading] = useState(false)
    // const { simulateInboundMessage } = require('../actions') // Lazy load handled via top-level import

    const handleSimulateMessage = async () => {
        setLoading(true)
        try {
            // Random phone to create new leads
            const randomPhone = `555${Math.floor(Math.random() * 899999 + 100000)}`
            const result = await simulateInboundMessage(randomPhone)

            if (result.success) {
                toast.success(t('crm.inbox.settings.sections.simulation_success'), {
                    description: t('crm.inbox.settings.sections.simulation_success_desc')
                })
            } else {
                toast.error(t('crm.inbox.settings.sections.simulation_failed', { message: result.error }))
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
            {loading ? t('crm.inbox.settings.sections.simulating') : t('crm.inbox.settings.sections.simulate_message')}
        </Button>
    )
}
