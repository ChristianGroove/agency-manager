"use client"
// CRITICAL: Realtime managed via singleton. See: realtime_architecture_guide.md

import { useEffect, useState, useMemo, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { supabase } from "@/modules/core/database/supabase"
import { Search, MessageSquare, Clock, Filter, Archive, Users, Settings as SettingsIcon, MessageCircle, User, Activity, X } from "lucide-react"
import { Virtuoso } from "react-virtuoso"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Database } from "@/types/supabase"
import { InboxSettingsSheet } from "../inbox-settings-sheet"
import { BulkDistributionModal } from "./bulk-distribution-modal"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConversationListItem } from "../conversation-list-item"
import { ConversationActionsMenu } from "../conversation-actions-menu"

import { getCurrentUserPermissions } from "@/modules/core/settings/actions/team"
import { useInboxPreferences } from "@/modules/core/preferences/use-inbox-preferences"
import { useInboxShortcuts } from "@/modules/core/preferences/use-inbox-shortcuts"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useSafeInboxContext } from "@/modules/features/messaging/context/inbox-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getChannels } from "@/modules/features/channels/actions"
import { Channel as ChannelType } from "@/modules/features/channels/types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check as CheckIcon } from "lucide-react"
import { getSidebarAgents } from "@/modules/features/messaging/assignment-actions"
import { realtimeManager } from "@/modules/core/database/supabase-realtime-manager"
import { evaluateInboxPermissions } from "@/modules/core/iam/utils/inbox-permissions"
import { useInboxContext } from "../../context/inbox-context"
import { useConversations } from "@/hooks/queries/useConversations"
import { useQueryClient } from "@tanstack/react-query"

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
        status: string | null
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
    const { currentUserRole, isAgentMonitorVisible, setIsAgentMonitorVisible } = useInboxContext()
    const { updateLeadCache } = useSafeInboxContext() as any
    const queryClient = useQueryClient()
    const [channels, setChannels] = useState<ChannelType[]>([])
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
    const [agents, setAgents] = useState<SidebarAgent[]>([])
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null)
    const [activeMenuIsArchived, setActiveMenuIsArchived] = useState(false)
    const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [isSearchExpanded, setIsSearchExpanded] = useState(false)

    // Refs para leer valores actuales en closures de Realtime sin re-registrar el canal (FIX BUG 2)
    // SEGURIDAD: identityLoadedRef es crítico — sin él, si el canal se registra antes de que
    // los permisos carguen (identityLoaded=false en closure), los security checks quedan
    // permanentemente deshabilitados para ese handler, filtrando convs de otros agentes.
    const selectedChannelIdRef = useRef<string | null>(null)
    const selectedAgentIdRef = useRef<string | null>(null)
    const activeFilterRef = useRef<FilterTab>('all')
    const currentUserIdRef = useRef<string | null>(null)
    const hasGlobalViewRef = useRef(false)
    const isAdminRef = useRef(false)
    const authorizedChannelsRef = useRef<string[]>([])
    const identityLoadedRef = useRef(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    
    // Internal fallbacks if props are missing
    const { organizationId: localOrgId, loading: orgLoading } = useCurrentOrganization()
    const [localPermissions, setLocalPermissions] = useState<any>(null)
    const [localPermissionsLoaded, setLocalPermissionsLoaded] = useState(false)

    // Effective Data
    const effectiveOrgId = propOrgId || localOrgId
    const effectivePermissions = propPermissions || localPermissions
    const identityLoaded = !!effectiveOrgId && (!!propPermissions || localPermissionsLoaded)

    // Sync Refs to avoid stale closures in Realtime callbacks (FIX BUG 2)
    const selectedIdRef = useRef(selectedId)
    useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    const { hasGlobalView, hasViewAll: isAdmin, hasTeamView, authorizedChannels } = useMemo(() => {
        return evaluateInboxPermissions(effectivePermissions);
    }, [effectivePermissions]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useConversations({
        orgId: effectiveOrgId,
        userId: currentUserId,
        hasGlobalView,
        isAdmin,
        authorizedChannels,
        searchQuery,
        activeFilter,
        selectedChannelId,
        selectedAgentId,
        identityLoaded
    })

    const conversations = useMemo(() => {
        if (!data || !data.pages) return [];
        return data.pages.flat() as Conversation[];
    }, [data])

    // Sincronizar refs para uso en handler Realtime sin stale closures
    useEffect(() => { 
        selectedChannelIdRef.current = selectedChannelId 
        window.dispatchEvent(new CustomEvent('pixy:inbox:filter-monitor-by-channel', { detail: { channelId: selectedChannelId } }))
    }, [selectedChannelId])
    useEffect(() => { selectedAgentIdRef.current = selectedAgentId }, [selectedAgentId])
    useEffect(() => { activeFilterRef.current = activeFilter }, [activeFilter])
    useEffect(() => { currentUserIdRef.current = currentUserId }, [currentUserId])
    useEffect(() => { hasGlobalViewRef.current = hasGlobalView }, [hasGlobalView])
    useEffect(() => { isAdminRef.current = isAdmin }, [isAdmin])
    useEffect(() => { authorizedChannelsRef.current = authorizedChannels }, [authorizedChannels])
    useEffect(() => { identityLoadedRef.current = identityLoaded }, [identityLoaded])

    const filteredAgents = useMemo(() => {
        return agents.filter(a => {
            const role = a.role.toLowerCase();
            const targetIsOwner = role === 'owner' || role === 'dueño';
            if (hasGlobalView) return true;
            if (isAdmin) {
                if (selectedChannelId) {
                    const hasAccess = a.channels.includes(selectedChannelId);
                    return targetIsOwner || hasAccess;
                }
                const sharesChannel = a.channels.some(ch => authorizedChannels.includes(ch));
                return targetIsOwner || sharesChannel;
            }
            return false;
        });
    }, [agents, selectedChannelId, isAdmin, hasGlobalView, authorizedChannels])

    // Capa visual: aplica filtros locales encima del estado para ocultar cards optimísticamente
    const visibleConversations = useMemo(() => {
        let list = conversations

        // 0. Búsqueda local (espejo del servidor pero en memoria para UI instantánea)
        if (searchQuery.trim()) {
            const sq = searchQuery.toLowerCase()
            list = list.filter(c => 
                c.phone?.toLowerCase().includes(sq) ||
                c.last_message_preview?.toLowerCase().includes(sq) ||
                c.leads?.name?.toLowerCase().includes(sq) ||
                c.clients?.name?.toLowerCase().includes(sq)
            )
        }

        // 1. Filtrado de Estado (Espejo del Backend para UI instantánea)
        switch (activeFilter) {
            case 'unread':
                list = list.filter(c => c.unread_count && c.unread_count > 0 && c.state !== 'archived' && c.status !== 'snoozed')
                break
            case 'assigned':
                if (currentUserId) list = list.filter(c => c.assigned_to === currentUserId && c.state !== 'archived' && c.status !== 'snoozed')
                break
            case 'archived':
                list = list.filter(c => c.state === 'archived')
                break
            case 'snoozed':
                list = list.filter(c => c.status === 'snoozed')
                break
            default: // 'all'
                list = list.filter(c => c.state !== 'archived' && c.status !== 'snoozed')
                break
        }

        if (selectedChannelId) list = list.filter(c => c.connection_id === selectedChannelId)
        if (selectedAgentId) {
            if (selectedAgentId === 'unassigned') list = list.filter(c => !c.assigned_to)
            else list = list.filter(c => c.assigned_to === selectedAgentId)
        }
        return list
    }, [conversations, selectedChannelId, selectedAgentId, activeFilter, currentUserId])

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
    // FIX DEBT 4: Espera 1500ms antes de hacer el fallback de permisos para darle
    // tiempo al padre (InboxLayout) de inyectarlos via propPermissions y evitar doble fetch.
    useEffect(() => {
        let cancelled = false
        const fetchUserData = async () => {
            try {
                const { data } = await supabase.auth.getUser()
                if (!cancelled && data.user) {
                    setCurrentUserId(data.user.id)
                    if (!propPermissions) {
                        await new Promise(resolve => setTimeout(resolve, 1500))
                        if (!cancelled && !propPermissions) {
                            const perms = await getCurrentUserPermissions()
                            if (!cancelled) setLocalPermissions(perms)
                        }
                    }
                }
                if (!cancelled) setLocalPermissionsLoaded(true)
            } catch (err) {
                console.warn('[SidebarConversationList] [AUTH] Fallback failed:', err)
                if (!cancelled) setLocalPermissionsLoaded(true)
            }
        }
        fetchUserData()
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // Solo al montar — propPermissions se refleja via effectivePermissions

    // Unified fetch controller for secondary data (channels, agents)
    useEffect(() => {
        if (identityLoaded && effectiveOrgId) {
            fetchChannels()
            if (hasGlobalView || isAdmin) {
                getSidebarAgents().then(({ data }) => {
                    if (data) setAgents(data as SidebarAgent[])
                })
            }
        }
    }, [effectiveOrgId, identityLoaded, hasGlobalView, isAdmin])

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

    const loadMore = () => {
        if (!isLoading && !isFetchingNextPage && hasNextPage) {
            fetchNextPage()
        }
    }

    // Local Optimistic UI listeners (Realtime is handled by useConversations)
    useEffect(() => {
        const handleGlobalDelete = (e: Event) => {
            const { conversationId } = (e as CustomEvent).detail;
            if (conversationId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.filter(c => c.id !== conversationId))
                    }
                });
            }
        };

        const handleGlobalAssign = (e: Event) => {
            const { conversationId, agentId } = (e as CustomEvent).detail;
            if (conversationId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        // Update assigned_to and immediately disable the bot icon locally 
                        pages: oldData.pages.map((page: any[]) => page.map(c => c.id === conversationId ? { ...c, assigned_to: agentId, is_bot_active: false } : c))
                    }
                });
            }
        };

        const handleBotDisabled = (e: Event) => {
            const { conversationId } = (e as CustomEvent).detail;
            if (conversationId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.map(c => c.id === conversationId ? { ...c, is_bot_active: false } : c))
                    }
                });
            }
        };

        const handleConversationRead = (e: Event) => {
            const { conversationId } = (e as CustomEvent).detail;
            if (conversationId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c))
                    }
                });
            }
        };

        const handleLeadStatusChange = (e: Event) => {
            const { leadId, newStatus } = (e as CustomEvent).detail;
            if (leadId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.map(c => 
                            c.lead_id === leadId && c.leads 
                                ? { ...c, leads: { ...c.leads, status: newStatus } } 
                                : c
                        ))
                    }
                });
            }
        };

        const handleAgentSelect = (e: Event) => {
            const { agentId } = (e as CustomEvent).detail;
            if (agentId) {
                setSelectedAgentId(prev => prev === agentId ? null : agentId);
                setActiveFilter('all');
            }
        };

        window.addEventListener('pixy:conversation-deleted', handleGlobalDelete);
        window.addEventListener('pixy:conversation-assigned', handleGlobalAssign);
        window.addEventListener('pixy:conversation-bot-disabled', handleBotDisabled);
        window.addEventListener('pixy:conversation-read', handleConversationRead);
        window.addEventListener('pixy:lead-status-changed', handleLeadStatusChange);
        window.addEventListener('pixy:inbox:select-agent', handleAgentSelect);

        return () => {
            window.removeEventListener('pixy:conversation-deleted', handleGlobalDelete);
            window.removeEventListener('pixy:conversation-assigned', handleGlobalAssign);
            window.removeEventListener('pixy:conversation-bot-disabled', handleBotDisabled);
            window.removeEventListener('pixy:conversation-read', handleConversationRead);
            window.removeEventListener('pixy:lead-status-changed', handleLeadStatusChange);
            window.removeEventListener('pixy:inbox:select-agent', handleAgentSelect);
        }
    }, [effectiveOrgId, queryClient])

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
        <div 
            className="flex flex-col h-full bg-transparent"
            data-role={effectivePermissions?.role}
            data-hierarchy={effectivePermissions?.hierarchy}
        >
            <InboxSettingsSheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
            <BulkDistributionModal 
                open={isDistributeModalOpen} 
                onOpenChange={setIsDistributeModalOpen}
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ['conversations', effectiveOrgId] })}
            />

            <TooltipProvider>
                <div className="px-4 pb-2 pt-2">
                    <div className="flex items-center gap-1">
                        {isSearchExpanded ? (
                            <div className="relative flex-1 flex items-center animate-in fade-in slide-in-from-right-5">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    ref={searchInputRef}
                                    placeholder={t('crm.inbox.sidebar.search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-8 bg-muted/40 dark:bg-white/5 border-transparent hover:bg-muted/60 dark:hover:bg-white/10 focus-visible:bg-background dark:focus-visible:bg-zinc-900 shadow-none h-8 text-xs transition-all w-full"
                                    autoFocus
                                />
                                <Button variant="ghost" size="icon" className="absolute right-1 h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setIsSearchExpanded(false); setSearchQuery(''); }}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex-1 min-w-0">
                                <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterTab)}>
                                    <SelectTrigger className="h-8 bg-transparent border-transparent hover:bg-muted/40 dark:hover:bg-white/5 shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none px-2 font-semibold text-xs truncate">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="truncate">
                                                {activeFilter === 'all' && t('crm.inbox.sidebar.filters.all')}
                                                {activeFilter === 'unread' && t('crm.inbox.sidebar.filters.unread')}
                                                {activeFilter === 'assigned' && t('crm.inbox.sidebar.filters.assigned_to_me')}
                                                {activeFilter === 'snoozed' && t('crm.inbox.sidebar.filters.snoozed')}
                                                {activeFilter === 'archived' && t('crm.inbox.sidebar.filters.archived')}
                                            </span>
                                            <Badge variant="secondary" className="h-4 px-1 text-[9px] rounded-full bg-black/5 dark:bg-white/10 font-medium">
                                                {counts[activeFilter]}
                                            </Badge>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent align="start" className="w-[200px]">
                                        <SelectItem value="all" className="text-xs">{t('crm.inbox.sidebar.filters.all')} ({counts.all})</SelectItem>
                                        <SelectItem value="unread" className="text-xs">{t('crm.inbox.sidebar.filters.unread')} ({counts.unread})</SelectItem>
                                        <SelectItem value="assigned" className="text-xs">{t('crm.inbox.sidebar.filters.assigned_to_me')} ({counts.assigned})</SelectItem>
                                        <SelectItem value="snoozed" className="text-xs">{t('crm.inbox.sidebar.filters.snoozed')} ({counts.snoozed})</SelectItem>
                                        <SelectItem value="archived" className="text-xs">{t('crm.inbox.sidebar.filters.archived')} ({counts.archived})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {!isSearchExpanded && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-muted/60 dark:hover:bg-white/10 border-transparent transition-all" onClick={() => setIsSearchExpanded(true)}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Buscar</TooltipContent>
                            </Tooltip>
                        )}

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-8 w-8 shrink-0 rounded-full bg-transparent hover:bg-muted/60 dark:hover:bg-white/10 border-transparent transition-all",
                                        selectedChannelId ? "text-brand-pink" : "text-muted-foreground hover:text-foreground"
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

                        {hasTeamView && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-8 w-8 shrink-0 rounded-full border-transparent transition-colors",
                                            isAgentMonitorVisible ? "text-brand-cyan bg-brand-cyan/10" : "bg-transparent hover:bg-muted/60 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground",
                                            selectedAgentId && "text-brand-pink"
                                        )}
                                        onClick={() => setIsAgentMonitorVisible((v: boolean) => !v)}
                                    >
                                        <Activity className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Monitor de Agentes</TooltipContent>
                            </Tooltip>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 bg-transparent rounded-full hover:bg-muted/60 dark:hover:bg-white/10 border-transparent transition-all"
                                    onClick={() => setIsSettingsOpen(true)}
                                >
                                    <SettingsIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('crm.inbox.sidebar.inbox_settings')}</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </TooltipProvider>

            <div className="flex-1 min-h-0">
                {(!mounted || !identityLoaded) ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('crm.inbox.sidebar.loading')}
                    </div>
                ) : conversations.length === 0 && !isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-60">
                        <MessageSquare className="h-8 w-8 mb-3 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{t('crm.inbox.sidebar.no_conversations')}</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                            {searchQuery ? t('crm.inbox.sidebar.no_conversations_desc_search') : t('crm.inbox.sidebar.no_conversations_desc')}
                        </p>
                    </div>
                ) : (
                    <Virtuoso
                        className="scrollbar-thin"
                        style={{ height: '100%' }}
                        totalCount={visibleConversations.length}
                        data={visibleConversations}
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
                                    fetchConversations={() => queryClient.invalidateQueries({ queryKey: ['conversations', effectiveOrgId] })}
                                />
                            </div>
                        )}
                        components={{
                            Footer: () => hasNextPage ? (
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
                            onActionComplete={() => queryClient.invalidateQueries({ queryKey: ['conversations', effectiveOrgId] })}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
