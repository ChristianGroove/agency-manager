"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { useTranslation } from "@/lib/i18n/use-translation"
import { 
    Tooltip, 
    TooltipContent, 
    TooltipProvider, 
    TooltipTrigger 
} from "@/components/ui/tooltip"
import { Inbox } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"

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
    agents: AgentStat[]
    className?: string
}

export function AgentMonitoringWidget({ agents, className }: AgentMonitoringWidgetProps) {
    const { t, locale } = useTranslation()
    const { organizationId } = useCurrentOrganization()
    const currentLocale = locale === 'es' ? es : enUS
    const [realtimeOnlineIds, setRealtimeOnlineIds] = useState<Set<string>>(new Set())

    const UNASSIGNED_ID = '00000000-0000-0000-0000-000000000000'

    // --- RE-ENGINEERED PRESENCE (POSTGRES REALTIME + HEARTBEAT SYNC) ---
    // Pure technical excellence: Bypasses flaky Webhook Sync and uses physical DB Heartbeats in Realtime.
    useEffect(() => {
        if (!organizationId) return

        // Sync initial state from prop
        const initial = new Set<string>()
        agents.forEach(a => { if (a.online) initial.add(a.user_id) })
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
                    const isOnline = data.status === 'online' && (new Date(data.last_seen_at).getTime() > Date.now() - 10 * 60 * 1000)
                    
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
    }, [organizationId, agents])

    const sortedAgents = useMemo(() => {
        return [...agents].map(agent => ({
            ...agent,
            online: agent.user_id === UNASSIGNED_ID ? true : realtimeOnlineIds.has(agent.user_id)
        })).sort((a, b) => {
            if (a.user_id === UNASSIGNED_ID) return -1
            if (b.user_id === UNASSIGNED_ID) return 1
            if (a.online !== b.online) return a.online ? -1 : 1
            return (b.unread_count || 0) - (a.unread_count || 0)
        })
    }, [agents, realtimeOnlineIds])

    if (!agents || agents.length === 0) return null

    return (
        <div className={cn("w-full mb-8", className)}>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                        Monitoreo en tiempo real
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[30px] p-6 shadow-xl relative overflow-hidden flex flex-wrap gap-6 items-center">
                    <TooltipProvider delayDuration={0}>
                        <AnimatePresence mode="popLayout">
                            {sortedAgents.map((agent) => (
                                <motion.div key={agent.user_id} layout className="relative group cursor-default">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="relative">
                                                <Avatar className={cn(
                                                    "h-14 w-14 border-2 transition-all duration-300 group-hover:scale-110",
                                                    agent.user_id === UNASSIGNED_ID ? "border-brand-pink border-dashed" :
                                                    agent.online ? "border-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.3)]" : "border-gray-200 dark:border-white/10 grayscale"
                                                )}>
                                                    {agent.user_id === UNASSIGNED_ID ? (
                                                        <div className="flex items-center justify-center w-full h-full text-brand-pink"><Inbox className="h-6 w-6" /></div>
                                                    ) : (
                                                        <>
                                                            <AvatarImage src={agent.avatar_url} />
                                                            <AvatarFallback className="bg-zinc-100 font-bold">{(agent.name || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                        </>
                                                    )}
                                                </Avatar>
                                                <span className={cn(
                                                    "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900 transition-colors",
                                                    agent.user_id === UNASSIGNED_ID ? "hidden" :
                                                    agent.online ? "bg-green-500" : "bg-gray-400"
                                                )} />
                                                {agent.unread_count > 0 && (
                                                    <div className={cn(
                                                        "absolute -top-2 -right-2 h-6 min-w-[24px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg",
                                                        agent.unread_count > 5 ? "bg-red-500 animate-bounce" : "bg-brand-pink"
                                                    )}>
                                                        {agent.unread_count}
                                                    </div>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-zinc-900/90 text-white p-3 rounded-2xl border-white/10">
                                            <p className="font-bold text-sm">{agent.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{agent.online ? 'Conectado' : 'Fuera de línea'}</p>
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
