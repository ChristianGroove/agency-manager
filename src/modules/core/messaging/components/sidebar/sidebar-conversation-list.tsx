"use client"
// CRITICAL: Realtime managed via singleton. See: realtime_architecture_guide.md

import { useEffect, useState, useMemo, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { supabase } from "@/lib/supabase"
import { Search, MessageSquare, Clock, Filter, Archive, Users, Settings as SettingsIcon, MessageCircle, User } from "lucide-react"
import { Virtuoso } from "react-virtuoso"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Database } from "@/types/supabase"
import { InboxSettingsSheet } from "../inbox-settings-sheet"
import { BulkDistributionModal } from "./bulk-distribution-modal"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConversationListItem } from "../conversation-list-item"
import { ConversationActionsMenu } from "../conversation-actions-menu"

import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team-actions"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { useInboxShortcuts } from "@/modules/core/preferences/use-inbox-shortcuts"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useSafeInboxContext } from "../../context/inbox-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getChannels } from "@/modules/core/channels/actions"
import { Channel as ChannelType } from "@/modules/core/channels/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check as CheckIcon } from "lucide-react"
import { getSidebarAgents } from "../../assignment-actions"
import { realtimeManager } from "@/lib/supabase-realtime-manager"

type FilterTab = 'all' | 'unread' | 'assigned' | 'archived' | 'snoozed'

export interface SidebarAgent {
    id: string
    name: string
    avatar_url: string | null
    role: string
    channels: string[]
}

// Extended type to include joined lead and connection data
type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: {
        name: string | null
        phone: string | null
        avatar_url: string | null
    } | null
    integration_connections: {
        connection_name: string | null
    } | null
    clients: {
        name: string | null
        phone: string | null
        avatar_url: string | null
    } | null
}

interface SidebarConversationListProps {
    selectedId: string | null
    onSelect: (id: string | null) => void
    organizationId: string | null
    userPermissions: any
}

export function SidebarConversationList({ 
    selectedId, 
    onSelect, 
    organizationId: propOrgId, 
    userPermissions: propPermissions 
}: SidebarConversationListProps) {
    const { t } = useTranslation()
    const { updateLeadCache } = useSafeInboxContext() as any
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [channels, setChannels] = useState<ChannelType[]>([])
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
    const [agents, setAgents] = useState<SidebarAgent[]>([])
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
    const [loading, setLoading] = useState(true)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [tick, setTick] = useState(0)
    const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null)
    const [activeMenuIsArchived, setActiveMenuIsArchived] = useState(false)
    const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false)
    
    // Internal fallbacks if props are missing
    const { organizationId: localOrgId, loading: orgLoading } = useCurrentOrganization()
    const [localPermissions, setLocalPermissions] = useState<any>(null)
    const [localPermissionsLoaded, setLocalPermissionsLoaded] = useState(false)

    // Effective Data
    const effectiveOrgId = propOrgId || localOrgId
    const effectivePermissions = propPermissions || localPermissions
    const identityLoaded = !!effectiveOrgId && (!!propPermissions || localPermissionsLoaded)

    // Sync Ref to avoid stale closures in realtime callback
    const selectedIdRef = useRef(selectedId)
    useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

    // Maestro Ticker
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(prev => prev + 1)
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const hasGlobalView = useMemo(() => {
        const role = effectivePermissions?.role?.toLowerCase();
        const isGlobalRole = role === 'owner' || role === 'dueño' || role === 'admin' || role === 'administrador';
        
        return isGlobalRole || 
               effectivePermissions?.permissions?.all === true || 
               effectivePermissions?.permissions?.['inbox.conversations.view_all'] === true
    }, [effectivePermissions])

    const filteredAgents = useMemo(() => {
        if (!selectedChannelId) return agents;
        return agents.filter(a => {
            const isAdmin = ['admin', 'owner'].includes(a.role.toLowerCase());
            const hasAccess = a.channels.includes(selectedChannelId);
            return isAdmin || hasAccess;
        });
    }, [agents, selectedChannelId])

    const searchInputRef = useRef<HTMLInputElement>(null)
    const { preferences } = useInboxPreferences()

    // Enable Shortcuts
    useInboxShortcuts({
        onSearch: () => {
            searchInputRef.current?.focus()
        },
        onDistribute: () => {
            setIsDistributeModalOpen(true)
        }
    });

    // Get current user and local permissions (fallback only)
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data } = await supabase.auth.getUser()
                if (data.user) {
                    setCurrentUserId(data.user.id)
                    if (!propPermissions) {
                        const perms = await getCurrentUserPermissions()
                        setLocalPermissions(perms)
                    }
                }
                setLocalPermissionsLoaded(true)
            } catch (err) {
                console.warn('[SidebarConversationList] [AUTH] Fallback failed:', err)
                setLocalPermissionsLoaded(true)
            }
        }
        fetchUserData()
    }, [propPermissions])

    // Unified fetch controller for secondary data (channels, agents)
    useEffect(() => {
        if (identityLoaded && effectiveOrgId) {
            fetchChannels()
            if (hasGlobalView) {
                getSidebarAgents().then(({ data }) => {
                    if (data) setAgents(data as SidebarAgent[])
                })
            }
        }
    }, [effectiveOrgId, identityLoaded, hasGlobalView])

    // Main fetch controller for conversations
    useEffect(() => {
        if (identityLoaded && effectiveOrgId) {
            // Debounce search
            const timer = setTimeout(() => {
                fetchConversations(true)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [activeFilter, effectiveOrgId, identityLoaded, selectedChannelId, selectedAgentId, searchQuery])

    const fetchChannels = async () => {
        const data = await getChannels()
        const authorizedChannels = effectivePermissions?.permissions?.inbox_access || []

        if (!hasGlobalView) {
            const filteredChannels = data.filter(c => authorizedChannels.includes(c.id))
            setChannels(filteredChannels)
        } else {
            setChannels(data)
        }
    }

    const PAGE_SIZE = 50
    const [hasMore, setHasMore] = useState(true)
    const [offset, setOffset] = useState(0)

    const fetchConversations = async (showLoading = false, isLoadMore = false) => {
        if (!identityLoaded || !effectiveOrgId || (!hasMore && isLoadMore)) return

        if (showLoading) setLoading(true)
        const currentOffset = isLoadMore ? offset : 0

        let query = supabase
            .from('conversations')
            .select('*, leads(name, phone, avatar_url), clients(name, phone, avatar_url), integration_connections(connection_name)')
            .order('last_message_at', { ascending: false })
            .range(currentOffset, currentOffset + PAGE_SIZE - 1)

        if (searchQuery.trim()) {
            const search = `%${searchQuery.toLowerCase()}%`
            query = query.or(`phone.ilike.${search},last_message_preview.ilike.${search},leads.name.ilike.${search}`)
        }

        switch (activeFilter) {
            case 'unread':
                query = query.gt('unread_count', 0).neq('state', 'archived').neq('status', 'snoozed')
                break
            case 'assigned':
                if (currentUserId) query = query.eq('assigned_to', currentUserId).neq('state', 'archived').neq('status', 'snoozed')
                break
            case 'archived':
                query = query.eq('state', 'archived')
                break
            case 'snoozed':
                query = query.eq('status', 'snoozed')
                break
            default:
                query = query.neq('state', 'archived').neq('status', 'snoozed')
                break
        }

        if (selectedChannelId) query = query.eq('connection_id', selectedChannelId)
        if (selectedAgentId) {
            if (selectedAgentId === 'unassigned') query = query.is('assigned_to', null)
            else query = query.eq('assigned_to', selectedAgentId)
        }

        if ((preferences.behavior as any).strict_isolation && currentUserId) {
            query = query.eq('assigned_to', currentUserId)
        }

        if (!hasGlobalView && currentUserId) {
            query = query.eq('assigned_to', currentUserId)
        }

        query = query.eq('organization_id', effectiveOrgId)

        const { data, error } = await query

        if (!error && data) {
            if (isLoadMore) {
                setConversations(prev => [...prev, ...data as Conversation[]])
                setOffset(prev => prev + PAGE_SIZE)
            } else {
                setConversations(data as Conversation[])
                setOffset(PAGE_SIZE)
            }
            setHasMore(data.length === PAGE_SIZE)
        }
        if (showLoading) setLoading(false)
    }

    const loadMore = () => {
        if (!loading && hasMore) fetchConversations(false, true)
    }

    const debouncedFetchConversations = useDebouncedCallback((showLoading = false, isLoadMore = false) => {
        fetchConversations(showLoading, isLoadMore)
    }, 1000)

    // Real-time surgical updates
    useEffect(() => {
        if (!effectiveOrgId || !currentUserId) return;
        
        const channelName = `inbox-org-${effectiveOrgId}`
        
        realtimeManager.getOrCreateChannel(channelName, (channel: any) => {
            channel.on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                async (payload: any) => {
                    const eventType = payload.eventType
                    const updatedConv = payload.new as Conversation
                    const oldConv = payload.old as any
                    
                    if (updatedConv && updatedConv.organization_id !== effectiveOrgId) return;

                    setConversations((prev) => {
                        if (eventType === 'DELETE') return prev.filter(c => c.id !== oldConv.id)

                        const existingIndex = prev.findIndex(c => c.id === updatedConv.id)
                        
                        let matches = true
                        if (activeFilter === 'all') matches = updatedConv.state !== 'archived' && updatedConv.status !== 'snoozed'
                        else if (activeFilter === 'unread') matches = updatedConv.unread_count > 0 && updatedConv.state !== 'archived' && updatedConv.status !== 'snoozed'
                        else if (activeFilter === 'assigned') matches = updatedConv.assigned_to === currentUserId && updatedConv.state !== 'archived'
                        else if (activeFilter === 'archived') matches = updatedConv.state === 'archived'
                        else if (activeFilter === 'snoozed') matches = updatedConv.status === 'snoozed'

                        if (!matches) return prev.filter(c => c.id !== updatedConv.id)

                        if (existingIndex > -1) {
                            const updated = {
                                ...prev[existingIndex],
                                ...updatedConv,
                                leads: prev[existingIndex].leads,
                                clients: prev[existingIndex].clients,
                                integration_connections: prev[existingIndex].integration_connections
                            }
                            return [updated, ...prev.filter(c => c.id !== updatedConv.id)]
                        }
                        return prev 
                    })

                    if (updatedConv.id === selectedIdRef.current) {
                        window.dispatchEvent(new CustomEvent('pixy:sync-active-chat', { 
                            detail: { conversationId: updatedConv.id } 
                        }));
                    }
                    debouncedFetchConversations(false)
                }
            )
            .on('broadcast', { event: 'vanish' }, (payload: any) => {
                const { conversationId } = payload.payload;
                if (conversationId) {
                    setConversations(prev => prev.filter(c => c.id !== conversationId));
                }
            })
        })

        const handleGlobalDelete = (e: Event) => {
            const { conversationId } = (e as CustomEvent).detail;
            if (conversationId) {
                setConversations(prev => prev.filter(c => c.id !== conversationId));
            }
        };

        window.addEventListener('pixy:conversation-deleted', handleGlobalDelete);

        return () => {
            realtimeManager.releaseChannel(channelName)
            window.removeEventListener('pixy:conversation-deleted', handleGlobalDelete);
        }
    }, [effectiveOrgId, currentUserId, activeFilter, identityLoaded])

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
            <BulkDistributionModal 
                open={isDistributeModalOpen} 
                onOpenChange={setIsDistributeModalOpen}
                onSuccess={() => fetchConversations(false)}
            />

            <TooltipProvider>
                <div className="px-4 pb-2 pt-2 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                ref={searchInputRef}
                                placeholder={t('crm.inbox.sidebar.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-none shadow-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-offset-0"
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 px-2 bg-zinc-50 dark:bg-zinc-900 border-none",
                                        selectedChannelId && "text-brand-pink"
                                    )}
                                >
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="end">
                                <Command>
                                    <CommandInput placeholder={t('crm.channels.title')} />
                                    <CommandList>
                                        <CommandEmpty>No channel found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => setSelectedChannelId(null)}
                                                className="flex items-center justify-between"
                                            >
                                                <span>{t('crm.inbox.sidebar.filters.all')}</span>
                                                {!selectedChannelId && <CheckIcon className="h-4 w-4" />}
                                            </CommandItem>
                                            {channels.map((channel) => (
                                                <CommandItem
                                                    key={channel.id}
                                                    onSelect={() => setSelectedChannelId(channel.id)}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="truncate">{channel.connection_name}</span>
                                                    {selectedChannelId === channel.id && <CheckIcon className="h-4 w-4" />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {hasGlobalView && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        "h-9 px-2 bg-zinc-50 dark:bg-zinc-900 border-none",
                                        selectedAgentId && "text-brand-pink"
                                    )}
                                >
                                    <Users className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0" align="end">
                                <Command>
                                    <CommandInput placeholder={t('crm.inbox.sidebar.filters.agent_filter_placeholder')} />
                                    <CommandList>
                                        <CommandEmpty>{t('crm.inbox.sidebar.no_contacts')}</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                onSelect={() => setSelectedAgentId(null)}
                                                className="flex items-center justify-between"
                                            >
                                                <span>{t('crm.inbox.sidebar.filters.all_agents')}</span>
                                                {!selectedAgentId && <CheckIcon className="h-4 w-4" />}
                                            </CommandItem>
                                            <CommandItem
                                                onSelect={() => setSelectedAgentId('unassigned')}
                                                className="flex items-center justify-between"
                                            >
                                                <span>{t('crm.inbox.sidebar.filters.unassigned')}</span>
                                                {selectedAgentId === 'unassigned' && <CheckIcon className="h-4 w-4" />}
                                            </CommandItem>
                                            {filteredAgents.map((agent) => (
                                                <CommandItem
                                                    key={agent.id}
                                                    onSelect={() => setSelectedAgentId(agent.id)}
                                                    className="flex items-center justify-between"
                                                >
                                                    <span className="truncate">{agent.name}</span>
                                                    {selectedAgentId === agent.id && <CheckIcon className="h-4 w-4" />}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                    <SettingsIcon className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.sidebar.inbox_settings')}</TooltipContent>
                        </Tooltip>
                    </div>

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

            <div className="flex-1 min-h-0">
                {!identityLoaded ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('crm.inbox.sidebar.loading')}
                    </div>
                ) : conversations.length === 0 && !loading ? (
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
                        totalCount={conversations.length}
                        data={conversations}
                        endReached={loadMore}
                        itemContent={(index, conv) => (
                            <div className="border-b border-border/50">
                                <ConversationListItem
                                    key={conv.id}
                                    conv={conv}
                                    isSelected={conv.id === selectedId}
                                    onSelect={(id) => {
                                        const contactData = conv.clients || conv.leads || { name: conv.leads?.name || conv.leads?.phone }
                                        if (updateLeadCache) {
                                            updateLeadCache(id, {
                                                lead: {
                                                    ...contactData,
                                                    title: contactData.name || contactData.phone,
                                                    name: contactData.name || contactData.phone
                                                },
                                                conversation: conv
                                            })
                                        }
                                        onSelect(id)
                                    }}
                                    onOpenMenu={(id, isArchived) => {
                                        setActiveMenuConvId(id)
                                        setActiveMenuIsArchived(isArchived)
                                    }}
                                    fetchConversations={() => fetchConversations(false)}
                                    tick={tick}
                                />
                            </div>
                        )}
                        components={{
                            Footer: () => hasMore ? (
                                <div className="p-4 text-center text-xs text-muted-foreground animate-pulse">
                                    {t('crm.inbox.sidebar.loading')}...
                                </div>
                            ) : null
                        }}
                    />
                )}
                
                {activeMenuConvId && (
                    <div className="hidden">
                        <ConversationActionsMenu 
                            conversationId={activeMenuConvId}
                            isArchived={activeMenuIsArchived}
                            onActionComplete={() => fetchConversations(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
