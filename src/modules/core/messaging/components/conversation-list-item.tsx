"use client"

import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { UserCheck, MessageSquare } from "lucide-react"
import { ConversationActionsMenu } from "./conversation-actions-menu"

// Redefine type or import if shared. Using local definition for now or basic shape.
type Conversation = any // Simplify for prototype component

interface ConversationListItemProps {
    conv: Conversation
    isSelected: boolean
    onSelect: (id: string) => void
    fetchConversations: () => void
}

export function ConversationListItem({ conv, isSelected, onSelect, fetchConversations }: ConversationListItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: conv.id,
    })

    const contactName = conv.leads?.name || conv.leads?.phone || "Unknown"
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

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={() => onSelect(conv.id)}
            className={cn(
                "w-full p-4 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all relative cursor-grab active:cursor-grabbing outline-none group touch-none border-l-4",
                isSelected ? "bg-muted border-l-foreground" : "border-transparent",
                isUnread && !isSelected && "bg-zinc-50/50 dark:bg-zinc-900/20 border-l-zinc-900 dark:border-l-zinc-100",
                isDragging && "opacity-50 grayscale"
            )}
        >
            {/* Priority Indicator - Move to right or subtle dot */}
            {conv.priority && conv.priority !== 'normal' && (
                <div
                    className={cn(
                        "absolute right-2 top-2 h-2 w-2 rounded-full",
                        getPriorityColor(conv.priority)
                    )}
                />
            )}

            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-bold shadow-sm border border-black/5 dark:border-white/10">
                        {contactName.slice(0, 2).toUpperCase()}
                    </div>
                </div>

                <div className="flex-1 min-w-0 pointer-events-none">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                            "font-medium truncate text-sm",
                            isUnread && "font-bold text-foreground"
                        )}>
                            {contactName}
                        </span>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pointer-events-auto">
                            {conv.assigned_to && (
                                <UserCheck className="h-3 w-3 text-muted-foreground" />
                            )}
                            {conv.unread_count > 0 && (
                                <Badge className="h-5 min-w-[1.25rem] px-1.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-none shadow-sm flex items-center justify-center">
                                    {conv.unread_count}
                                </Badge>
                            )}
                            {/* Action Menu needs to be clickable. */}
                            <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                                <ConversationActionsMenu
                                    conversationId={conv.id}
                                    isArchived={conv.state === 'archived'}
                                    onActionComplete={fetchConversations}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-1">
                        <p className={cn(
                            "text-sm text-muted-foreground line-clamp-2 break-all",
                            isUnread && "text-foreground/80 font-medium"
                        )}>
                            {conv.last_message || "No messages yet"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {((conv.channel as any) === 'whatsapp' || (conv.channel as any) === 'evolution') && (
                            <MessageSquare className="h-3 w-3" />
                        )}

                        <span>
                            {conv.last_message_at
                                ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                                : 'Recently'
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
}
