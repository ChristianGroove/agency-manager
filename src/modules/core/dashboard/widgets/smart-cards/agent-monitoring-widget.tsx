"use client"

import { useMemo } from "react"
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
    const currentLocale = locale === 'es' ? es : enUS

    const sortedAgents = useMemo(() => {
        return [...agents].sort((a, b) => {
            if (a.online !== b.online) return a.online ? -1 : 1
            return (b.unread_count || 0) - (a.unread_count || 0)
        })
    }, [agents])

    if (!agents || agents.length === 0) return null

    return (
        <div className={cn("w-full mb-8", className)}>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
                        Monitoreo de Agentes
                    </h3>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {agents.filter(a => a.online).length} online • {agents.reduce((acc, a) => acc + (a.unread_count || 0), 0)} pendientes
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[30px] p-6 shadow-xl relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="flex flex-wrap gap-6 items-center">
                        <TooltipProvider delayDuration={0}>
                            <AnimatePresence mode="popLayout">
                                {sortedAgents.map((agent) => (
                                    <motion.div
                                        key={agent.user_id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="relative group cursor-default"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="relative">
                                                    {/* Outer Ring for Activity */}
                                                    <div className={cn(
                                                        "absolute -inset-1 rounded-full transition-all duration-500",
                                                        agent.online ? "bg-brand-cyan/20 blur-[2px]" : "bg-transparent",
                                                        agent.unread_count > 5 && "bg-red-500/10 blur-[4px] animate-pulse"
                                                    )} />
                                                    
                                                    <Avatar className={cn(
                                                        "h-14 w-14 border-2 transition-transform duration-300 group-hover:scale-110",
                                                        agent.online ? "border-brand-cyan" : "border-gray-200 dark:border-white/10 grayscale opacity-70"
                                                    )}>
                                                        <AvatarImage src={agent.avatar_url} alt={agent.name} />
                                                        <AvatarFallback className="bg-gradient-to-br from-brand-cyan to-indigo-600 text-white font-bold">
                                                            {(agent.name || '??').substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    {/* Online Indicator */}
                                                    <span className={cn(
                                                        "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white dark:border-zinc-900",
                                                        agent.online ? "bg-green-500" : "bg-gray-400"
                                                    )} />

                                                    {/* Unread Bubble - ALWAYS VISIBLE */}
                                                    {agent.unread_count > 0 && (
                                                        <motion.div
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            className={cn(
                                                                "absolute -top-2 -right-2 h-6 min-w-[24px] px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg z-10",
                                                                agent.unread_count > 5 ? "bg-red-500 animate-bounce" : "bg-brand-pink"
                                                            )}
                                                        >
                                                            {agent.unread_count}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-zinc-900/90 backdrop-blur-md border-white/10 text-white p-3 rounded-2xl shadow-2xl">
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-bold text-sm tracking-tight">{agent.name}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                                        <span className={cn("inline-block w-1.5 h-1.5 rounded-full", agent.online ? "bg-green-500" : "bg-gray-500")} />
                                                        {agent.online ? 'Conectado' : 'Desconectado'}
                                                    </p>
                                                    {agent.last_interaction_at && (
                                                        <div className="mt-1 pt-1 border-t border-white/5 flex flex-col gap-1">
                                                            <div className="text-[10px] text-gray-300">
                                                                Última actividad: <span className="text-brand-cyan font-medium">
                                                                    {formatDistanceToNow(new Date(agent.last_interaction_at), { 
                                                                        addSuffix: true,
                                                                        locale: currentLocale
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <div className="text-[10px] text-gray-400">
                                                                Fuera de servicio (24h): <span className="text-brand-pink/80 font-semibold">{agent.offline_hours_24h}h</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="mt-1 text-[9px] text-gray-500 font-medium">
                                                        Carga actual: {agent.current_load}/{agent.max_capacity} chats
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </TooltipProvider>
                    </div>
                </div>
            </div>
        </div>
    )
}
