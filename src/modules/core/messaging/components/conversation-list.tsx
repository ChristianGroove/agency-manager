"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import { Search, MessageSquare, Phone, User, Check, CheckCheck, Filter, Archive, UserCheck, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { InboxSettingsSheet } from "./inbox-settings-sheet"
import { Settings as SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConversationActionsMenu } from "./conversation-actions-menu"

// Extended type to include joined lead data
// Extended type to include joined lead data and missing columns
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
    } | null
    // integration_connections FK doesn't exist yet - removed to fix PGRST200
    // Add missing fields locally until types are regenerated
    state?: 'active' | 'archived' | 'closed'
    tags?: string[]
    priority?: string
}

interface ConversationListProps {
    selectedId: string | null
    onSelect: (id: string) => void
}

type FilterTab = 'all' | 'unread' | 'assigned' | 'archived' | 'snoozed'

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null)
        })
    }, [])

    // Initial Fetch
    useEffect(() => {
        fetchConversations()
    }, [activeFilter])

    const fetchConversations = async () => {
        console.log('[ConversationList] Fetching conversations...')
        setLoading(true)

        let query = supabase
            .from('conversations')
            .select('*, leads(name, phone)')
            .order('last_message_at', { ascending: false })

        console.log('[ConversationList] Active filter:', activeFilter)

        // Apply filter
        switch (activeFilter) {
            case 'unread':
                query = query.gt('unread_count', 0).neq('state', 'archived').neq('status', 'snoozed')
                break
            case 'assigned':
                if (currentUserId) {
                    query = query.eq('assigned_to', currentUserId).neq('state', 'archived').neq('status', 'snoozed')
                }
                break
            case 'archived':
                query = query.eq('state', 'archived')
                break
            case 'snoozed':
                query = query.eq('status', 'snoozed')
                break
            case 'all':
            default:
                // Exclude archived AND snoozed by default from main list
                query = query.neq('state', 'archived').neq('status', 'snoozed')
                break
        }

        const { data, error } = await query

        console.log('[ConversationList] Query result:', {
            conversations: data?.length || 0,
            error: error?.message,
            data: data
        })

        if (!error && data) {
            setConversations(data as Conversation[])
        } else if (error) {
            console.error('[ConversationList] Error fetching conversations:', JSON.stringify(error, null, 2))
        }
        setLoading(false)
    }

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('conversations-list')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => {
                    fetchConversations()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [activeFilter, currentUserId])

    // Filter and search conversations
    const filteredConversations = useMemo(() => {
        console.log('[ConversationList] Filtering conversations:', {
            total: conversations.length,
            searchQuery: searchQuery.trim()
        })

        if (!searchQuery.trim()) {
            console.log('[ConversationList] No search query, returning all:', conversations.length)
            return conversations
        }

        const query = searchQuery.toLowerCase()
        const filtered = conversations.filter(conv => {
            const leadName = conv.leads?.name?.toLowerCase() || ''
            const leadPhone = conv.leads?.phone?.toLowerCase() || ''
            const lastMessage = conv.last_message?.toLowerCase() || ''

            return leadName.includes(query) ||
                leadPhone.includes(query) ||
                lastMessage.includes(query)
        })

        console.log('[ConversationList] Filtered result:', filtered.length)
        return filtered
    }, [conversations, searchQuery])

    // Count badges for tabs
    const counts = useMemo(() => {
        return {
            all: conversations.filter(c => c.state !== 'archived' && c.status !== 'snoozed').length,
            unread: conversations.filter(c => c.unread_count > 0 && c.state !== 'archived' && c.status !== 'snoozed').length,
            assigned: conversations.filter(c => c.assigned_to === currentUserId && c.state !== 'archived').length,
            archived: conversations.filter(c => c.state === 'archived').length,
            snoozed: conversations.filter(c => c.status === 'snoozed').length
        }
    }, [conversations, currentUserId])

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

    return (
        <div className="flex flex-col h-full border-r bg-white dark:bg-zinc-950">
            <InboxSettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

            {/* Header */}
            <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Conversations
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsSettingsOpen(true)}
                        title="Inbox Settings"
                    >
                        <SettingsIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Filter Tabs */}
                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all" className="text-xs">
                            All
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="text-xs">
                            Unread
                            {counts.unread > 0 && (
                                <Badge variant="default" className="ml-1 px-1 min-w-[20px] h-5 bg-blue-600">
                                    {counts.unread}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="assigned" className="text-xs">
                            <UserCheck className="h-3 w-3" />
                        </TabsTrigger>
                        <TabsTrigger value="snoozed" className="text-xs">
                            <Clock className="h-3 w-3" />
                        </TabsTrigger>
                        <TabsTrigger value="archived" className="text-xs">
                            <Archive className="h-3 w-3" />
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
                {loading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        Loading...
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm font-medium">No conversations</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {searchQuery ? 'No results found' : 'Conversations will appear here'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {filteredConversations.map((conv) => {
                            const contactName = conv.leads?.name || conv.leads?.phone || "Unknown"
                            const isSelected = conv.id === selectedId
                            const isUnread = conv.unread_count > 0
                            const priorityIcon = getPriorityIcon(conv.priority)

                            return (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelect(conv.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            onSelect(conv.id)
                                        }
                                    }}
                                    className={cn(
                                        "w-full p-4 text-left hover:bg-muted/50 transition-colors relative cursor-pointer outline-none focus:bg-muted/50",
                                        isSelected && "bg-muted",
                                        isUnread && "bg-blue-50 dark:bg-blue-950/20"
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
                                        {/* Avatar */}
                                        <div className="flex-shrink-0 mt-1">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                                {contactName.slice(0, 2).toUpperCase()}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={cn(
                                                    "font-medium truncate",
                                                    isUnread && "font-bold"
                                                )}>
                                                    {priorityIcon && <span className="mr-1">{priorityIcon}</span>}
                                                    {contactName}
                                                </span>

                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    {conv.assigned_to && (
                                                        <UserCheck className="h-3 w-3 text-green-600" />
                                                    )}
                                                    {conv.unread_count > 0 && (
                                                        <Badge className="h-5 min-w-[20px] px-1 bg-blue-600">
                                                            {conv.unread_count}
                                                        </Badge>
                                                    )}
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        <ConversationActionsMenu
                                                            conversationId={conv.id}
                                                            isArchived={conv.state === 'archived'}
                                                            onActionComplete={() => {
                                                                console.log('Action complete, refreshing list...')
                                                                fetchConversations()
                                                            }}
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

                                                {/* Tags */}
                                                {conv.tags && conv.tags.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {conv.tags.slice(0, 2).map((tag: string, idx: number) => (
                                                            <Badge key={idx} variant="outline" className="text-[10px] px-1 py-0">
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
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
