
const fs = require('fs');
let content = fs.readFileSync('src/modules/features/messaging/components/sidebar/sidebar-conversation-list.tsx', 'utf8');

const startToken = '// Main fetch controller for conversations';
const endToken = '// CRITICO: NO agregar selectedChannelId, selectedAgentId, activeFilter aqui.';

const startIndex = content.indexOf(startToken);
const endIndex = content.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    
    const replacement = \
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: queriesLoading } = useConversations({
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
    });

    const conversations = useMemo(() => {
        if (!data || !data.pages) return [];
        return data.pages.flat() as Conversation[];
    }, [data]);

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
        if (!queriesLoading && !isFetchingNextPage && hasNextPage) {
            fetchNextPage();
        }
    }

    // Optimistic UI updates
    useEffect(() => {
        const handleGlobalDelete = (e: Event) => {
            const { conversationId } = (e as CustomEvent).detail;
            if (conversationId && effectiveOrgId) {
                queryClient.setQueriesData({ queryKey: ['conversations', effectiveOrgId] }, (oldData: any) => {
                    if (!oldData || !oldData.pages) return oldData;
                    return {
                        ...oldData,
                        pages: oldData.pages.map((page: any[]) => page.filter(c => c.id !== conversationId))
                    };
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
                        pages: oldData.pages.map((page: any[]) => page.map(c => c.id === conversationId ? { ...c, assigned_to: agentId } : c))
                    };
                });
            }
        };

        window.addEventListener('pixy:conversation-deleted', handleGlobalDelete);
        window.addEventListener('pixy:conversation-assigned', handleGlobalAssign);

        return () => {
            window.removeEventListener('pixy:conversation-deleted', handleGlobalDelete);
            window.removeEventListener('pixy:conversation-assigned', handleGlobalAssign);
        };
    }, [effectiveOrgId, queryClient]);

    \;
    
    content = before + replacement + after;
    fs.writeFileSync('src/modules/features/messaging/components/sidebar/sidebar-conversation-list.tsx', content);
    console.log('Replaced successfully');
} else {
    console.log('Tokens not found');
}

