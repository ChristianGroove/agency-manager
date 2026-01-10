
"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { formatDistanceToNow } from "date-fns"
import { Search, MessageSquare, Phone, User, Check, CheckCheck, Filter, Archive, UserCheck, Clock, Bell, BellOff, Settings as SettingsIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { InboxSettingsSheet } from "./inbox-settings-sheet"
import { Button } from "@/components/ui/button"
import { ConversationActionsMenu } from "./conversation-actions-menu"
import { ConversationListItem } from "./conversation-list-item"
import { useMessageNotifications } from "@/modules/core/preferences/use-message-notifications"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { useInboxShortcuts } from "@/modules/core/preferences/use-inbox-shortcuts"

// Extended type to include joined lead and connection data
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
    } | null
    integration_connections: {
        connection_name: string | null
    } | null
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
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { preferences, updatePreferences } = useInboxPreferences()

    // Enable Global Notifications (Sound/Push)
    useMessageNotifications();

    // Enable Shortcuts
    useInboxShortcuts({
        onSearch: () => {
            searchInputRef.current?.focus()
        }
    });

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
            .select('*, leads(name, phone), integration_connections(connection_name)')
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
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8 transition-colors", !preferences.notifications.sound_enabled && "text-amber-500 hover:text-amber-600")}
                            onClick={() => updatePreferences('notifications', { sound_enabled: !preferences.notifications.sound_enabled })}
                            title={preferences.notifications.sound_enabled ? "Mute Sounds (Focus Mode)" : "Unmute Sounds"}
                        >
                            {preferences.notifications.sound_enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                        </Button>
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
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)} className="w-full">
                    <TabsList className="w-full justify-start gap-2 bg-transparent p-0 h-auto border-b rounded-none px-4">
                        <TabsTrigger
                            value="all"
                            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 transition-all"
                        >
                            All
                        </TabsTrigger>
                        <TabsTrigger
                            value="unread"
                            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 transition-all"
                        >
                            Unread
                            {counts.unread > 0 && (
                                <Badge className="ml-1.5 h-5 min-w-[1.25rem] px-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 border-none shadow-sm transition-transform data-[state=active]:scale-110 flex items-center justify-center">
                                    {counts.unread}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="assigned"
                            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 transition-all"
                            title="Assigned to me"
                        >
                            <UserCheck className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger
                            value="snoozed"
                            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 transition-all"
                            title="Snoozed"
                        >
                            <Clock className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger
                            value="archived"
                            className="text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-3 transition-all"
                            title="Archived"
                        >
                            <Archive className="h-4 w-4" />
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
                    <div className="divide-y border-t border-border/50">
                        {filteredConversations.map((conv) => (
                            <ConversationListItem
                                key={conv.id}
                                conv={conv}
                                isSelected={conv.id === selectedId}
                                onSelect={onSelect}
                                fetchConversations={fetchConversations}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
