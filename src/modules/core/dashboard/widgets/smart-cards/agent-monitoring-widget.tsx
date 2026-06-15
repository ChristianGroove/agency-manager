"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip"
import { Inbox } from "lucide-react"
import { supabase } from "@/modules/core/database/supabase"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { getInboxAgentMonitorStats } from "@/modules/features/messaging/assignment-actions"

interface AgentStat {
    user_id: string
    name: string
    avatar_url: string
    online: boolean
    unread_count: number
    last_interaction_at: string | null
    current_load: number
    max_capacity: number
    offline_hours_24h: number
}

interface AgentMonitoringWidgetProps {
    agents?: AgentStat[] // Keeping optional for backwards compatibility with dashboard
    className?: string
}

export function AgentMonitoringWidget({ agents: initialAgents, className }: AgentMonitoringWidgetProps) {
    const { t } = useTranslation()
    const { organizationId } = useCurrentOrganization()
    const [realtimeOnlineIds, setRealtimeOnlineIds] = useState<Set<string>>(new Set())
    const [fetchedAgents, setFetchedAgents] = useState<AgentStat[]>([])
    const [isLoading, setIsLoading] = useState(!initialAgents)

    const UNASSIGNED_ID = '00000000-0000-0000-0000-000000000000'

    // Fetch stats if not provided (e.g., when used in Inbox)
    useEffect(() => {
        if (initialAgents) {
            setFetchedAgents(initialAgents)
            return
        }

        const fetchStats = async () => {
            const res = await getInboxAgentMonitorStats()
            if (res.success && res.data) {
                setFetchedAgents(res.data)
            }
            setIsLoading(false)
        }
        fetchStats()
        
        // Optional: polling every minute to keep counts fresh
        const interval = setInterval(fetchStats, 60000)
        return () => clearInterval(interval)
    }, [initialAgents])

    const activeAgents = initialAgents || fetchedAgents

    // --- RE-ENGINEERED PRESENCE (POSTGRES REALTIME + HEARTBEAT SYNC) ---
    useEffect(() => {
        if (!organizationId) return

        // Sync initial state
        const initial = new Set<string>()
        activeAgents.forEach(a => { if (a.online) initial.add(a.user_id) })
        setRealtimeOnlineIds(initial)

        const channel = supabase
            .channel(`agent_status_${organizationId}`)
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'agent_availability', 
                    filter: `organization_id=eq.${organizationId}` 
                },
                (payload: any) => {
                    const data = payload.new
                    const isOnline = data.status === 'online' && (new Date(data.last_seen_at).getTime() > Date.now() - 3 * 60 * 1000)
                    
                    setRealtimeOnlineIds(prev => {
                        const next = new Set(prev)
                        if (isOnline) next.add(data.agent_id)
                        else next.delete(data.agent_id)
                        return next
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [organizationId, activeAgents])

    const sortedAgents = useMemo(() => {
        return [...activeAgents].map(agent => ({
            ...agent,
            online: agent.user_id === UNASSIGNED_ID ? true : realtimeOnlineIds.has(agent.user_id)
        })).sort((a, b) => {
            if (a.user_id === UNASSIGNED_ID) return -1
            if (b.user_id === UNASSIGNED_ID) return 1
            if (a.online !== b.online) return a.online ? -1 : 1
            return (b.unread_count || 0) - (a.unread_count || 0)
        })
    }, [activeAgents, realtimeOnlineIds])

    if (isLoading) return <div className="animate-pulse h-24 bg-white/10 rounded-[30px] mb-4"></div>
    if (!activeAgents || activeAgents.length === 0) return <div className="p-4 bg-muted/50 text-muted-foreground rounded-lg text-sm mb-4">No agents found or offline.</div>

    const handleAgentClick = (agentId: string) => {
        const idToDispatch = agentId === UNASSIGNED_ID ? 'unassigned' : agentId
        window.dispatchEvent(new CustomEvent('pixy:inbox:select-agent', { detail: { agentId: idToDispatch } }))
    }

    return (
        <div className={cn("w-full mb-4 px-2", className)}>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                        Monitoreo en tiempo real
                    </div>
                </div>

                {/* HORIZONTAL SCROLL LAYOUT */}
                <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[20px] p-4 shadow-xl relative flex flex-nowrap overflow-x-auto snap-x scrollbar-hide items-center gap-4">
                    <TooltipProvider delayDuration={0}>
                        <AnimatePresence mode="popLayout">
                            {sortedAgents.map((agent) => (
                                <motion.div 
                                    key={agent.user_id} 
                                    layout 
                                    className="relative group flex-shrink-0 snap-start cursor-pointer"
                                    onClick={() => handleAgentClick(agent.user_id)}
                                >
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative">
                                                <Avatar className={cn(
                                                    "h-12 w-12 border-2 transition-all duration-300 group-hover:scale-110",
                                                    agent.user_id === UNASSIGNED_ID ? "border-brand-pink border-dashed" :
                                                    agent.online ? "border-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "border-gray-200 dark:border-white/10 grayscale"
                                                )}>
                                                    {agent.user_id === UNASSIGNED_ID ? (
                                                        <div className="flex items-center justify-center w-full h-full text-brand-pink"><Inbox className="h-5 w-5" /></div>
                                                    ) : (
                                                        <>
                                                            <AvatarImage src={agent.avatar_url} />
                                                            <AvatarFallback className="bg-zinc-100 font-bold text-xs">{(agent.name || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </>
                                                    )}
                                                </Avatar>
                                                <span className={cn(
                                                    "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 transition-colors",
                                                    agent.user_id === UNASSIGNED_ID ? "hidden" :
                                                    agent.online ? "bg-green-500" : "bg-gray-400"
                                                )} />
                                                {agent.unread_count > 0 && (
                                                    <div className={cn(
                                                        "absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-lg",
                                                        agent.unread_count > 5 ? "bg-red-500 animate-bounce" : "bg-brand-pink"
                                                    )}>
                                                        {agent.unread_count}
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-zinc-900/90 text-white p-3 rounded-2xl border-white/10">
                                            <p className="font-bold text-sm">{agent.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{agent.online ? 'Conectado' : 'Fuera de lnea'}</p>
                                            <p className="text-[9px] text-gray-500">Carga: {agent.current_load}/{agent.max_capacity} chats</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </TooltipProvider>
                </div>
            </div>
        </div>
    )
}
