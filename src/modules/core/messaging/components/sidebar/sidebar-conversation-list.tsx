"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Search, MessageSquare, Phone, User, Check, CheckCheck, Filter, Archive, UserCheck, Clock, Bell, BellOff, Settings as SettingsIcon } from "lucide-react"
import { Virtuoso } from "react-virtuoso"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { InboxSettingsSheet } from "../inbox-settings-sheet"
import { Button } from "@/components/ui/button"
import { ConversationListItem } from "../conversation-list-item"
import { useMessageNotifications } from "@/modules/core/preferences/use-message-notifications"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { useInboxShortcuts } from "@/modules/core/preferences/use-inbox-shortcuts"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { useTranslation } from "@/lib/i18n/use-translation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type FilterTab = 'all' | 'unread' | 'assigned' | 'archived' | 'snoozed'

// Extended type to include joined lead and connection data
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
    } | null
    integration_connections: {
        connection_name: string | null
    } | null
    clients: {
        name: string | null
        phone: string | null
    } | null
}

interface SidebarConversationListProps {
    selectedId: string | null
    onSelect: (id: string | null) => void
}

export function SidebarConversationList({ selectedId, onSelect }: SidebarConversationListProps) {
    const { t } = useTranslation()
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { preferences, updatePreferences } = useInboxPreferences()
    const { organizationId, loading: orgLoading } = useCurrentOrganization()

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
        if (!orgLoading) fetchConversations(true)
    }, [activeFilter, organizationId, orgLoading])

    const fetchConversations = async (showLoading = false) => {
        if (showLoading) setLoading(true)

        let query = supabase
            .from('conversations')
            .select('*, leads(name, phone), clients(name, phone), integration_connections(connection_name)')
            .order('last_message_at', { ascending: false })

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

        // Critical: Filter by Organization
        if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query

        if (!error && data) {
            setConversations(data as Conversation[])
        } else if (error) {
            console.error('[ConversationList] Error fetching conversations:', JSON.stringify(error, null, 2))
        }
        if (showLoading) setLoading(false)
    }

    // Auto-deselect if selected conversation is gone (and no search is active)
    useEffect(() => {
        if (!loading && selectedId && conversations.length >= 0) {
            if (activeFilter === 'all' && !searchQuery) {
                const stillExists = conversations.some(c => c.id === selectedId)
                if (!stillExists) {
                    onSelect(null)
                }
            }
        }
    }, [conversations, loading, selectedId, activeFilter, searchQuery])

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('conversations-list')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => {
                    fetchConversations(false)
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [activeFilter, currentUserId])

    // Filter and search conversations
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) {
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
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            <InboxSettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

            {/* Header Area */}
            <TooltipProvider>
                <div className="px-4 pb-2 pt-2 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder={t('crm.inbox.sidebar.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                    <SettingsIcon className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.sidebar.inbox_settings')}</TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Filter Tabs */}
                    <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)} className="w-full">
                        <TabsList className="w-full justify-start gap-1 bg-transparent p-0 h-auto">
                            <TabsTrigger
                                value="all"
                                className="text-[11px] font-medium rounded-full border border-transparent data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 transition-all h-7"
                            >
                                {t('crm.inbox.sidebar.filters.all')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="unread"
                                className="text-[11px] font-medium rounded-full border border-transparent data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground px-3 py-1.5 transition-all h-7"
                            >
                                {t('crm.inbox.sidebar.filters.unread')}
                                {counts.unread > 0 && (
                                    <Badge className="ml-1.5 h-4 min-w-[1rem] px-1 bg-brand-pink text-white border-none shadow-none text-[9px] flex items-center justify-center">
                                        {counts.unread}
                                    </Badge>
                                )}
                            </TabsTrigger>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger
                                        value="assigned"
                                        className="text-[11px] font-medium rounded-full border border-transparent data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground px-2 py-1.5 transition-all h-7"
                                    >
                                        <User className="h-3.5 w-3.5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t('crm.inbox.sidebar.filters.assigned_to_me')}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger
                                        value="snoozed"
                                        className="text-[11px] font-medium rounded-full border border-transparent data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground px-2 py-1.5 transition-all h-7"
                                    >
                                        <Clock className="h-3.5 w-3.5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t('crm.inbox.sidebar.filters.snoozed')}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <TabsTrigger
                                        value="archived"
                                        className="text-[11px] font-medium rounded-full border border-transparent data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground text-muted-foreground px-2 py-1.5 transition-all h-7"
                                    >
                                        <Archive className="h-3.5 w-3.5" />
                                    </TabsTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{t('crm.inbox.sidebar.filters.archived')}</TooltipContent>
                            </Tooltip>
                        </TabsList>
                    </Tabs>
                </div>
            </TooltipProvider>

            {/* Conversation List */}
            <div className="flex-1 min-h-0">
                {loading ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('crm.inbox.sidebar.loading')}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60">
                        <MessageSquare className="h-8 w-8 mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{t('crm.inbox.sidebar.no_conversations')}</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                            {searchQuery ? t('crm.inbox.sidebar.no_conversations_desc_search') : t('crm.inbox.sidebar.no_conversations_desc')}
                        </p>
                    </div>
                ) : (
                    <Virtuoso
                        style={{ height: '100%' }}
                        totalCount={filteredConversations.length}
                        data={filteredConversations}
                        itemContent={(index, conv) => (
                            <div className="border-b border-border/50">
                                <ConversationListItem
                                    key={conv.id}
                                    conv={conv}
                                    isSelected={conv.id === selectedId}
                                    onSelect={onSelect}
                                    fetchConversations={fetchConversations}
                                />
                            </div>
                        )}
                    />
                )}
            </div>
        </div>
    )
}
