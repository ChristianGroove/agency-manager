"use client"

import { useState, useEffect, memo } from "react"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { UserCheck, MessageSquare, Facebook, Instagram } from "lucide-react"
import { ConversationActionsMenu } from "./conversation-actions-menu"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Redefine type or import if shared. Using local definition for now or basic shape.
type Conversation = any // Simplify for prototype component

interface ConversationListItemProps {
    conv: Conversation
    isSelected: boolean
    onSelect: (id: string) => void
    fetchConversations: () => void
}

export const ConversationListItem = memo(function ConversationListItem({ conv, isSelected, onSelect, fetchConversations }: ConversationListItemProps) {
    const { t, locale } = useTranslation()
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

    useEffect(() => {
        const timeDiff = new Date().getTime() - new Date(conv.last_message_at).getTime()
        // If message is younger than 5 seconds AND not currently selected (tuned for realtime feel)
        if (timeDiff < 5000 && !isSelected) {
            setIsNew(true)
            const timer = setTimeout(() => setIsNew(false), 4000)
            return () => clearTimeout(timer)
        }
    }, [conv.last_message_at, isSelected])

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onSelect(conv.id)}
            className={cn(
                "w-full p-4 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all relative cursor-grab active:cursor-grabbing outline-none group touch-none border-l-4",
                isSelected ? "bg-muted border-l-foreground" : "border-transparent",
                isUnread && !isSelected && "bg-zinc-50/50 dark:bg-zinc-900/20",
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
                <div className="flex-shrink-0 pointer-events-none">
                    <Avatar className="h-10 w-10 border border-black/5 dark:border-white/10 shadow-sm">
                        <AvatarImage src={conv.leads?.avatar_url || conv.clients?.avatar_url} alt={contactName} />
                        <AvatarFallback className="bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold">
                            {contactName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="flex-1 min-w-0 pointer-events-none flex flex-col gap-1 pr-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                                "font-medium truncate text-sm",
                                isUnread && "font-bold text-foreground"
                            )}>
                                {contactName}
                            </span>
                            {/* Priority Inline */}
                            {conv.priority && conv.priority !== 'normal' && (
                                <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityColor(conv.priority))} />
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pointer-events-auto">
                            {conv.assigned_to && (
                                <UserCheck className="h-3 w-3 text-muted-foreground" />
                            )}
                            {conv.unread_count > 0 && (
                                <Badge className="h-5 min-w-[1.25rem] px-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-none shadow-sm flex items-center justify-center">
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

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {(['whatsapp', 'evolution', 'whatsapp_cloud', 'meta_whatsapp'].includes((conv.channel as any)?.toLowerCase())) && (
                            <>
                                <img src="/social media icons/whatsapp.png" alt="WhatsApp" className="h-3.5 w-3.5 object-contain" />
                                {conv.integration_connections?.connection_name && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[80px]">
                                        {conv.integration_connections.connection_name}
                                    </span>
                                )}
                            </>
                        )}
                        {(['messenger', 'meta_messenger', 'facebook_dm', 'facebook_page'].includes((conv.channel as any)?.toLowerCase())) && (
                            <img src="/social media icons/messenger.png" alt="Messenger" className="h-3.5 w-3.5 object-contain" />
                        )}
                        {(['instagram', 'instagram_dm', 'meta_instagram'].includes((conv.channel as any)?.toLowerCase())) && (
                            <img src="/social media icons/instagram.png" alt="Instagram" className="h-3.5 w-3.5 object-contain" />
                        )}

                        <span>
                            {conv.last_message_at
                                ? formatDistanceToNow(new Date(conv.last_message_at), {
                                    addSuffix: true,
                                    locale: locale === 'es' ? es : enUS
                                })
                                : t('common.recently')
                            }
                        </span>

                        {conv.tags && conv.tags.length > 0 && (
                            <div className="flex gap-1">
                                {conv.tags.slice(0, 2).map((tag: string, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0 border-dashed">
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
