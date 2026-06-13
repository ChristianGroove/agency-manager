import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createClient } from '@/modules/core/database/supabase-client';
import { Conversation } from '@/types';

// Omitimos la importación de types complejos para mantenerlo portable, asumiendo Conversation
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
    const supabase = createClient();

    const fetchConversations = async () => {
        if (!identityLoaded || !orgId) return [];

        let query = supabase
            .from('conversations')
            .select('*, leads(name, phone, avatar_url, status), clients(name, phone, avatar_url), integration_connections(connection_name)')
            .order('last_message_at', { ascending: false })
            .range(0, 100); // Para simplicidad en el piloto, traemos las últimas 100

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

    const result = useQuery({
        queryKey,
        queryFn: fetchConversations,
        enabled: identityLoaded && !!orgId,
        staleTime: 1000 * 60, // 1 minuto
    });

    // "Ping-to-Refetch" effect
    useEffect(() => {
        if (!orgId || !identityLoaded) return;
        const channelName = `inbox-org-${orgId}-ping`;

        // Realtime Subscription (Optimized: solo invalida caché, no maneja estado local)
        const channel = supabase.channel(channelName)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'conversations', filter: `organization_id=eq.${orgId}` },
                () => {
                    // Ping recibido: Invalidar caché para hacer un refetch HTTP silencioso
                    queryClient.invalidateQueries({ queryKey: ['conversations', orgId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId, identityLoaded, queryClient, supabase]);

    return result;
}
