import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/modules/core/database/supabase';
import { Database } from '@/types/supabase';

type Conversation = Database['public']['Tables']['conversations']['Row'] & {
    leads: { name: string | null; phone: string | null; avatar_url: string | null; status: string | null } | null;
    integration_connections: { connection_name: string | null } | null;
    clients: { name: string | null; phone: string | null; avatar_url: string | null } | null;
};

// Omitimos la importación de types complejos para mantenerlo portable
interface UseConversationsProps {
    orgId: string | null;
    userId: string | null;
    hasGlobalView: boolean;
    isAdmin: boolean;
    authorizedChannels: string[];
    searchQuery?: string;
    activeFilter?: string;
    selectedChannelId?: string | null;
    selectedAgentId?: string | null;
    identityLoaded: boolean;
}

const PAGE_SIZE = 50;

export function useConversations({
    orgId,
    userId,
    hasGlobalView,
    isAdmin,
    authorizedChannels,
    searchQuery = '',
    activeFilter = 'all',
    selectedChannelId = null,
    selectedAgentId = null,
    identityLoaded
}: UseConversationsProps) {
    const queryClient = useQueryClient();

    const fetchConversationsPage = async ({ pageParam = 0 }) => {
        if (!identityLoaded || !orgId) return [];

        let query = supabase
            .from('conversations')
            .select('*, leads(name, phone, avatar_url, status), clients(name, phone, avatar_url), integration_connections(connection_name)')
            .order('last_message_at', { ascending: false })
            .range(pageParam, pageParam + PAGE_SIZE - 1);

        if (searchQuery.trim()) {
            const search = `%${searchQuery.toLowerCase()}%`;
            query = query.or(`phone.ilike.${search},last_message_preview.ilike.${search},leads.name.ilike.${search}`);
        }

        switch (activeFilter) {
            case 'unread':
                query = query.gt('unread_count', 0).neq('state', 'archived').neq('status', 'snoozed');
                break;
            case 'assigned':
                if (userId) query = query.eq('assigned_to', userId).neq('state', 'archived').neq('status', 'snoozed');
                break;
            case 'archived':
                query = query.eq('state', 'archived');
                break;
            case 'snoozed':
                query = query.eq('status', 'snoozed');
                break;
            default:
                query = query.neq('state', 'archived').neq('status', 'snoozed');
                break;
        }

        if (selectedChannelId) query = query.eq('connection_id', selectedChannelId);
        if (selectedAgentId) {
            if (selectedAgentId === 'unassigned') query = query.is('assigned_to', null);
            else query = query.eq('assigned_to', selectedAgentId);
        }

        if (hasGlobalView) {
            // Owner ve todo
        } else if (isAdmin) {
            if (authorizedChannels && authorizedChannels.length > 0) {
                query = query.in('connection_id', authorizedChannels);
            } else {
                return [];
            }
        } else if (userId) {
            query = query.eq('assigned_to', userId);
        } else {
            return [];
        }

        query = query.eq('organization_id', orgId);

        const { data, error } = await query;
        if (error) throw error;
        return data as Conversation[];
    };

    const queryKey = [
        'conversations',
        orgId,
        searchQuery,
        activeFilter,
        selectedChannelId,
        selectedAgentId,
        userId,
        hasGlobalView,
        isAdmin,
        identityLoaded
    ];

    const result = useInfiniteQuery({
        queryKey,
        queryFn: fetchConversationsPage,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length === PAGE_SIZE) {
                return allPages.length * PAGE_SIZE;
            }
            return undefined;
        },
        initialPageParam: 0,
        enabled: identityLoaded && !!orgId,
        staleTime: 1000 * 60, // 1 minuto
    });

    // "Ping-to-Refetch" effect (Listening to Global Event instead of opening duplicate WebSocket)
    useEffect(() => {
        if (!orgId || !identityLoaded) return;

        const handleConversationsUpdate = (e: Event) => {
            const payload = (e as CustomEvent).detail;
            let needsRefetch = true;

            if (payload.eventType === 'UPDATE') {
                let itemFound = false;

                queryClient.setQueriesData({ queryKey: ['conversations', orgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    
                    let modified = false;
                    const newPages = oldData.pages.map((page: any[]) => {
                        const index = page.findIndex(c => c.id === payload.new.id);
                        if (index !== -1) {
                            itemFound = true;
                            const cachedItem = page[index];
                            
                            // Si cambia un estado clave que afecta a los filtros, requerimos un refetch
                            if (
                                cachedItem.state !== payload.new.state ||
                                cachedItem.status !== payload.new.status ||
                                cachedItem.assigned_to !== payload.new.assigned_to ||
                                // Validar si pasa a 0 o >0 (afecta la pestaña 'unread')
                                (cachedItem.unread_count > 0) !== (payload.new.unread_count > 0)
                            ) {
                                needsRefetch = true;
                            } else {
                                needsRefetch = false;
                            }

                            modified = true;
                            const updatedPage = [...page];
                            updatedPage[index] = { ...updatedPage[index], ...payload.new };
                            return updatedPage;
                        }
                        return page;
                    });
                    
                    return modified ? { ...oldData, pages: newPages } : oldData;
                });

                // Si no lo encontramos en caché, requerimos refetch para que entre a la lista
                if (!itemFound) needsRefetch = true;
            } else if (payload.eventType === 'DELETE') {
                queryClient.setQueriesData({ queryKey: ['conversations', orgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    let modified = false;
                    const newPages = oldData.pages.map((page: any[]) => {
                        const newPage = page.filter(c => c.id !== payload.old.id);
                        if (newPage.length !== page.length) modified = true;
                        return newPage;
                    });
                    return modified ? { ...oldData, pages: newPages } : oldData;
                });
                // Todavía requerimos refetch para asegurar paginación correcta a largo plazo
            }
            // Para INSERT, siempre requerimos refetch (el INSERT no trae JOINs como leads/clients)

            if (needsRefetch) {
                queryClient.invalidateQueries({ queryKey: ['conversations', orgId] });
            }
        };

        window.addEventListener('pixy:conversations-update', handleConversationsUpdate);

        return () => {
            window.removeEventListener('pixy:conversations-update', handleConversationsUpdate);
        };
    }, [orgId, identityLoaded, queryClient]);

    return result;
}
