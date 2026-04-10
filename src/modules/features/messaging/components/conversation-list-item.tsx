"use client"

import { useState, useEffect, memo, useMemo } from "react"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { UserCheck, MessageSquare, Facebook, Instagram, Clock, Bot } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { ConversationActionsMenu } from "./conversation-actions-menu"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSafeInboxContext } from "../context/inbox-context"
import { getTagColorClass } from "@/modules/features/crm/components/tags/tag-colors"

// Redefine type or import if shared. Using local definition for now or basic shape.
type Conversation = any // Simplify for prototype component

interface ConversationListItemProps {
    conv: Conversation
    isSelected: boolean
    onSelect: (id: string) => void
    onOpenMenu: (id: string, isArchived: boolean) => void
    fetchConversations: () => void
    tick?: number
}
 
export const ConversationListItem = memo(function ConversationListItem({ conv, isSelected, onSelect, onOpenMenu, fetchConversations, tick }: ConversationListItemProps) {
     const { t, locale } = useTranslation()
     const { pipelineStages } = useSafeInboxContext() || { pipelineStages: [] }
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: conv.id,
    })

    const contactName = conv.clients?.name || conv.leads?.name || conv.clients?.phone || conv.leads?.phone || t('crm.inbox.chat.unknown_user')
    const isUnread = conv.unread_count > 0

    const getPriorityColor = (priority?: string | null) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500'
            case 'high': return 'bg-orange-500'
            case 'normal': return 'bg-blue-500'
            case 'low': return 'bg-gray-400'
            default: return 'bg-gray-400'
        }
    }

    const getPriorityIcon = (priority?: string | null) => {
        if (priority === 'urgent' || priority === 'high') {
            return '🔴'
        }
        return null
    }

    const priorityIcon = getPriorityIcon(conv.priority)

    // Pulse Effect for New Messages
    const [isNew, setIsNew] = useState(false)
 
    // Response time indicators logic (Optimized: useMemo instead of useEffect)
    const { waitTime, waitLevel } = useMemo(() => {
        if (!conv.waiting_since || conv.status === 'closed') {
            return { waitTime: null, waitLevel: 'none' as const }
        }
 
        const start = new Date(conv.waiting_since).getTime()
        const now = Date.now()
        const diffMin = Math.floor((now - start) / 60000)
 
        let level: 'none' | 'warning' | 'critical' = 'none'
        if (diffMin >= 10) level = 'critical'
        else if (diffMin >= 5) level = 'warning'
 
        const time = diffMin < 1 ? '< 1m' : `${diffMin}m`
        
        return { waitTime: time, waitLevel: level }
    }, [conv.waiting_since, conv.status, tick])
 
    const formattedLastMessageTime = useMemo(() => {
        if (!conv.last_message_at) return t('common.recently')
        return formatDistanceToNow(new Date(conv.last_message_at), {
            addSuffix: true,
            locale: locale === 'es' ? es : enUS
        })
    }, [conv.last_message_at, locale, t, tick]) // Update every tick (30s)
 
    // Find pipeline color for the stroke (Explicit class map for Tailwind safety)
    const getPipelineBorderClass = (bgColor?: string | null) => {
        if (!bgColor) return "border-l-transparent"
        // Force Tailwind to include target classes in the bundle by listing them literally
        const colorMap: Record<string, string> = {
            'bg-red-500': 'border-l-red-500',
            'bg-orange-500': 'border-l-orange-500',
            'bg-amber-500': 'border-l-amber-500',
            'bg-yellow-500': 'border-l-yellow-500',
            'bg-green-500': 'border-l-green-500',
            'bg-emerald-500': 'border-l-emerald-500',
            'bg-teal-500': 'border-l-teal-500',
            'bg-cyan-500': 'border-l-cyan-500',
            'bg-sky-500': 'border-l-sky-500',
            'bg-blue-500': 'border-l-blue-500',
            'bg-indigo-500': 'border-l-indigo-500',
            'bg-violet-500': 'border-l-violet-500',
            'bg-purple-500': 'border-l-purple-500',
            'bg-fuchsia-500': 'border-l-fuchsia-500',
            'bg-pink-500': 'border-l-pink-500',
            'bg-rose-500': 'border-l-rose-500',
            'bg-zinc-500': 'border-l-zinc-500',
            'bg-zinc-400': 'border-l-zinc-400',
            'bg-gray-500': 'border-l-gray-500',
        }
        return colorMap[bgColor] || bgColor.replace('bg-', 'border-l-')
    }

    const pipelineBorderClass = useMemo(() => {
        if (!conv.leads?.status || !pipelineStages) return null
        const stage = pipelineStages.find((s: any) => s.status_key === conv.leads.status)
        return getPipelineBorderClass(stage?.color)
    }, [conv.leads?.status, pipelineStages])

    useEffect(() => {
        const timeDiff = new Date().getTime() - new Date(conv.last_message_at).getTime()
        const direction = conv.metadata?.last_message_direction || 'inbound' // Fallback to inbound if missing

        // If message is younger than 5 seconds AND not currently selected AND is inbound
        if (timeDiff < 5000 && !isSelected && direction === 'inbound') {
            setIsNew(true)
            const timer = setTimeout(() => setIsNew(false), 4000)
            return () => clearTimeout(timer)
        }
    }, [conv.last_message_at, isSelected, conv.metadata?.last_message_direction])

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onSelect(conv.id)}
            className={cn(
                "w-full p-4 text-left transition-all relative cursor-grab active:cursor-grabbing outline-none group touch-none border-l-4",
                isSelected 
                    ? cn("bg-zinc-100/80 dark:bg-zinc-100/10", pipelineBorderClass || "border-l-black dark:border-l-white") 
                    : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 border-l-transparent",
                isUnread && !isSelected && "bg-white dark:bg-zinc-950",
                isDragging && "opacity-50 grayscale",
                isNew && "ring-1 ring-inset ring-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20 transition-all duration-500 ease-out"
            )}
        >
            {/* New Message Indicator Dot (Pulsing) */}
            {isNew && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping opacity-75 pointer-events-none" />
            )}

            {/* Action Menu - Absolute Positioned to save height */}
            <div
                className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 focus-within:opacity-100 has-[:focus]:opacity-100 lg:opacity-0 sm:opacity-100" // Visible on mobile/touch typically via tap? Actually simpler: always visible on touch, hover on desktop?
            // For simplicity and user request "save height", let's make it visible on hover for desktop, but we need it accessible. 
            // Creating a floating button that doesn't affect flow.
            >
                {/* Re-thinking: If I hide it, how do they delete on mobile? Swipe? 
                Let's keep it visible but absolute.
             */}
            </div>
            <div
                className="absolute right-0 top-0 p-2 z-10"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <ConversationActionsMenu
                    conversationId={conv.id}
                    isArchived={conv.state === 'archived'}
                    onActionComplete={fetchConversations}
                />
            </div>

            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 pointer-events-none relative">
                    <div className={cn(
                        "p-[2px] rounded-full border-2 transition-colors",
                        pipelineBorderClass || "border-zinc-100 dark:border-zinc-800"
                    )}>
                        <Avatar className="h-10 w-10 border border-black/5 dark:border-white/10 shadow-sm">
                            <AvatarImage src={conv.leads?.avatar_url || conv.clients?.avatar_url} alt={contactName} />
                            <AvatarFallback className="bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold text-xs uppercase">
                                {contactName.slice(0, 2)}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Channel Badge Centered on Avatar Base - No background, minimal */}
                    {(() => {
                        const channel = conv.channel?.toLowerCase()
                        const provider = (conv as any).integration_connections?.provider_key?.toLowerCase()
                        const combined = `${channel} ${provider}`
                        
                        let icon = null
                        if (combined.includes('whatsapp') || combined.includes('evolution')) icon = "/social media icons/whatsapp.png"
                        else if (combined.includes('messenger') || combined.includes('facebook')) icon = "/social media icons/messenger.png"
                        else if (combined.includes('instagram')) icon = "/social media icons/instagram.png"

                        if (!icon) return null
                        return (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                                <img src={icon} alt="Channel" className="h-4 w-4 object-contain drop-shadow-sm" />
                            </div>
                        )
                    })()}
                </div>

                <div className="flex-1 min-w-0 pointer-events-none flex flex-col gap-1 pr-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn(
                                "font-semibold truncate text-[15px]",
                                conv.unread_count > 0 ? "text-foreground" : "text-foreground/90"
                            )}>
                                {contactName}
                            </span>
                            {conv.is_bot_active && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Bot className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent>Atendido por Bot</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {waitLevel !== 'none' && (
                                <div className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse",
                                    waitLevel === 'critical' ? "bg-red-100 text-red-600 border border-red-200" : "bg-orange-100 text-orange-600 border border-orange-200"
                                )}>
                                    <Clock className="h-2.5 w-2.5" />
                                    {waitTime}
                                </div>
                            )}
                            {/* Priority Inline */}
                            {conv.priority && conv.priority !== 'normal' && (
                                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityColor(conv.priority))} />
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pointer-events-auto">
                            {conv.unread_count > 0 && (
                                <Badge className="h-5 min-w-[1.25rem] px-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-none shadow-sm flex items-center justify-center text-[10px] font-bold">
                                    {conv.unread_count}
                                </Badge>
                            )}
                        </div>
                    </div>

                    <div>
                        <p className={cn(
                            "text-sm text-muted-foreground line-clamp-1 break-all leading-tight",
                            isUnread && "text-foreground/80 font-medium"
                        )}>
                            {/* Force leading-tight to minimize height */}
                            {conv.last_message_preview || conv.last_message || t('crm.inbox.chat.no_messages')}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 flex-wrap mt-0.5">
                        {conv.integration_connections?.connection_name && (
                            <span className="bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground/90 truncate max-w-[100px]">
                                {conv.integration_connections.connection_name}
                            </span>
                        )}

                        <span className="font-medium">
                             {formattedLastMessageTime}
                         </span>
                         
                        {conv.assigned_to && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <UserCheck className="h-3 w-3 text-brand-pink/70" />
                                    </TooltipTrigger>
                                    <TooltipContent>Asignado a un agente</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {conv.tags && conv.tags.length > 0 && typeof conv.tags[0] === 'string' && (
                            <div className="flex gap-1">
                                {conv.tags.slice(0, 2).map((tag: string, idx: number) => (
                                    <Badge
                                        key={idx}
                                        variant="secondary"
                                        className={cn(
                                            "text-[10px] px-1 py-0 border-0 text-white shadow-sm",
                                            // Since we only have the name in conversations.tags, 
                                            // we might need a lookup or just a generic color if 
                                            // we don't want to join every time. 
                                            // However, for "Perfect Label System", let's use a default 
                                            // unless we pass metadata.
                                            "bg-zinc-400 dark:bg-zinc-600"
                                        )}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
})
