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
                "w-full p-4 text-left hover:bg-muted/50 transition-colors relative cursor-grab active:cursor-grabbing outline-none group touch-none", // touch-none for dnd-kit pointer sensors
                isSelected && "bg-muted",
                isUnread && "bg-blue-50 dark:bg-blue-950/20",
                isDragging && "opacity-50 grayscale"
            )}
        >
            {/* Priority Indicator */}
            {conv.priority && conv.priority !== 'normal' && (
                <div
                    className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        getPriorityColor(conv.priority)
                    )}
                />
            )}

            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1 pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-sm">
                        {contactName.slice(0, 2).toUpperCase()}
                    </div>
                </div>

                <div className="flex-1 min-w-0 pointer-events-none">
                    <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                            "font-medium truncate",
                            isUnread && "font-bold"
                        )}>
                            {priorityIcon && <span className="mr-1">{priorityIcon}</span>}
                            {contactName}
                        </span>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2 pointer-events-auto">
                            {conv.assigned_to && (
                                <UserCheck className="h-3 w-3 text-green-600" />
                            )}
                            {conv.unread_count > 0 && (
                                <Badge className="h-5 min-w-[20px] px-1 bg-blue-600">
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

                    <p className={cn(
                        "text-sm text-muted-foreground line-clamp-2 mb-1",
                        isUnread && "text-foreground/80 font-medium"
                    )}>
                        {conv.last_message || "No messages yet"}
                    </p>

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
