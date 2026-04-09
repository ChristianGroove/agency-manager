import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { assignConversation } from "../conversation-management-actions"
import { User, Circle, ChevronDown, Check, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n/use-translation"

interface Agent {
    agent_id: string
    status: string
    last_seen_at?: string
    current_load: number
    max_capacity: number
    role?: string
    agent_channels?: Array<{ channel_type: string }>
    users: {
        email: string
        raw_user_meta_data: any
    }
}

interface QuickAssignPanelProps {
    conversationId: string
    channel?: string
    connectionId?: string
    currentAssignee?: string | null
    agents: Agent[]
    onAssigned?: (agentId: string | null) => void
    tick?: number
}

export function QuickAssignPanel({ conversationId, channel, connectionId, currentAssignee, agents, tick, onAssigned }: QuickAssignPanelProps) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [assigning, setAssigning] = useState(false)
    const [, setTick] = useState(0)

    // Local ticker to re-calculate online status vs Current Time every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(prev => prev + 1)
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleAssign = async (agentId: string | null) => {
        const originalAssignee = currentAssignee;
        
        // 1. OPTIMISTIC UPDATE: Close menu and update parent UI immediately
        setOpen(false);
        onAssigned?.(agentId); // Now accepts agentId for optimism

        try {
            const result = await assignConversation(conversationId, agentId);
            
            if (result.success) {
                toast.success(agentId ? t('crm.inbox.context.actions.assigned') : t('crm.inbox.context.actions.unassigned'));
            } else {
                // 2. ROLLBACK: Revert UI if server fails
                onAssigned?.(originalAssignee ?? null);
                toast.error(result.error || t('crm.inbox.context.actions.failed_to_assign'));
            }
        } catch (err) {
            // 2. ROLLBACK: Revert UI on critical network error
            onAssigned?.(originalAssignee ?? null);
            toast.error(t('crm.inbox.context.actions.failed_to_assign'));
        }
    }

    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

    useEffect(() => {
        const fetchRole = async () => {
            const { getCurrentUserPermissions } = await import("@/modules/core/settings/settings-actions")
            const perms = await getCurrentUserPermissions()
            setCurrentUserRole(perms?.role || null)
        }
        fetchRole()
    }, [])

    const currentAgent = agents.find(a => a.agent_id === currentAssignee)
    const currentName = currentAgent?.users?.raw_user_meta_data?.name || currentAgent?.users?.email || t('crm.inbox.context.sections.unassign')
    const currentInitials = currentName.substring(0, 2).toUpperCase()

    const isCurrentAdmin = currentUserRole === 'admin' || currentUserRole === 'administrador'
    const isCurrentOwner = currentUserRole === 'owner' || currentUserRole === 'dueño'

    const getStatusColor = (agentStatus: string, lastSeen?: string) => {
        // Heartbeat validation: 3 minutes threshold (consistent with 1min heartbeat frequency)
        const isActuallyOnline = agentStatus === 'online' && (
            !lastSeen || (new Date(lastSeen).getTime() > Date.now() - 3 * 60 * 1000)
        );

        if (!isActuallyOnline && agentStatus === 'online') return 'bg-gray-400'; // Fallback to offline if heartbeat missed

        switch (agentStatus) {
            case 'online': return 'bg-green-500' // Using bg for circle
            case 'away': return 'bg-yellow-500'
            case 'busy': return 'bg-orange-500'
            default: return 'bg-gray-400'
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" role="combobox" aria-expanded={open} className="w-full justify-between px-0 hover:bg-transparent h-auto group">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {currentAssignee ? (
                                <Avatar className="h-8 w-8 border border-border">
                                    <AvatarFallback className="text-xs font-medium bg-zinc-100 dark:bg-zinc-800">
                                        {currentInitials}
                                    </AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <User className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                            )}
                            {currentAgent && (
                                <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", getStatusColor(currentAgent.status, currentAgent.last_seen_at))} />
                            )}
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] uppercase font-semibold text-muted-foreground">{t('crm.inbox.context.sections.assignee_label')}</div>
                            <div className="text-sm font-medium leading-none mt-0.5 group-hover:underline decoration-muted-foreground/50 underline-offset-2">
                                {currentAssignee ? currentName : t('crm.inbox.context.sections.unassigned_click_to_assign')}
                            </div>
                        </div>
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={t('crm.inbox.context.sections.search_agent_placeholder')} disabled={assigning} />
                    <CommandList>
                        <CommandEmpty>{t('crm.inbox.context.sections.no_agents_found')}</CommandEmpty>
                        <CommandGroup heading={t('crm.inbox.context.sections.agents_heading')}>
                            {currentAssignee && (
                                <CommandItem onSelect={() => handleAssign(null)} className="text-red-500">
                                    <User className="mr-2 h-4 w-4" />
                                    {t('crm.inbox.context.sections.unassign')}
                                    <Check className={cn("ml-auto h-4 w-4", !currentAssignee ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            )}
                            {currentUserRole && agents
                                .filter(agent => {
                                    const role = agent.role?.toLowerCase() || ''
                                    const targetIsOwner = role === 'owner' || role === 'dueño';
                                    
                                    const hasChannelAccess = agent.agent_channels?.some(c =>
                                        c.channel_type === channel || c.channel_type === connectionId
                                    );
                                    const isEligible = targetIsOwner || hasChannelAccess;

                                    // FILTRADO: Si el usuario NO es un Owner, solo debería ver agentes con acceso al canal (o al propio Dueño)
                                    if (!isCurrentOwner && !isEligible) {
                                        return false
                                    }
                                    return true
                                })
                                .map(agent => {
                                    const name = agent.users?.raw_user_meta_data?.name || agent.users?.email || t('crm.inbox.context.sections.unknown_agent')
                                    const loadPercentage = (agent.current_load / agent.max_capacity) * 100

                                    // Re-calculate eligibility for the badge display
                                    const role = agent.role?.toLowerCase() || ''
                                    const targetIsOwner = role === 'owner' || role === 'dueño';
                                    const hasChannelAccess = agent.agent_channels?.some(c =>
                                        c.channel_type === channel || c.channel_type === connectionId
                                    );
                                    const isEligible = targetIsOwner || hasChannelAccess;

                                    return (
                                        <CommandItem
                                            key={agent.agent_id}
                                            value={name}
                                            onSelect={() => handleAssign(agent.agent_id)}
                                            className="flex flex-col items-start gap-1 py-2"
                                            disabled={assigning}
                                        >
                                            <div className="flex items-center w-full">
                                                <div className={cn("h-2 w-2 rounded-full mr-2", getStatusColor(agent.status, agent.last_seen_at))} />
                                                <span className="flex-1 truncate font-medium">{name}</span>
                                                {agent.agent_id === currentAssignee && (
                                                    <Check className="ml-auto h-4 w-4 opacity-50" />
                                                )}
                                                {!isEligible && (
                                                    <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                                                        Acceso Individual
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Load Bar */}
                                            <div className="w-full pl-4 pr-1 flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className={cn("h-full transition-all",
                                                        loadPercentage > 90 ? "bg-red-500" :
                                                            loadPercentage > 60 ? "bg-amber-500" : "bg-green-500"
                                                    )} style={{ width: `${Math.min(loadPercentage, 100)}%` }} />
                                                </div>
                                                <span className="text-[10px] text-muted-foreground tabular-nums">{agent.current_load}/{agent.max_capacity}</span>
                                            </div>
                                        </CommandItem>
                                    )
                                })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
