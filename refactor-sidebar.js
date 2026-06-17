const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/features/messaging/components/sidebar/sidebar-conversation-list.tsx');
let content = fs.readFileSync(filePath + '.backup', 'utf8');

// 1. Add the import for useConversations
content = content.replace(
    `import { evaluateInboxPermissions } from "@/modules/core/iam/utils/inbox-permissions"`,
    `import { evaluateInboxPermissions } from "@/modules/core/iam/utils/inbox-permissions"\nimport { useConversations } from "@/hooks/queries/useConversations"`
);

// 2. Remove states we don't need
content = content.replace(/const \[conversations, setConversations\] = useState<Conversation\[\]>\(\[\]\)\r?\n/, '');
content = content.replace(/const \[loading, setLoading\] = useState\(true\)\r?\n/, '');

// 3. Regex to replace the entire block from PAGE_SIZE to the end of the realtime useEffect
const mainBlockRegex = /const PAGE_SIZE = 50[\s\S]*?\/\/\s*eslint-disable-next-line react-hooks\/exhaustive-deps\r?\n\s*\}, \[effectiveOrgId, currentUserId, identityLoaded\]\)/;

if (mainBlockRegex.test(content)) {
    const replacement = `
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: loading
    } = useConversations({
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
        return data?.pages.flat() || []
    }, [data])

    const hasMore = !!hasNextPage;

    const loadMore = () => {
        if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
        }
    }
    `;
    
    content = content.replace(mainBlockRegex, replacement);
    console.log('Block 1 Replaced successfully.');
} else {
    console.error('Failed to find start/end markers for the main block using Regex.');
}

// 4. Remove the Main fetch controller for conversations (the debounce search effect)
const mainFetchRegex = /\/\/ Main fetch controller for conversations[\s\S]*?}, \[activeFilter, effectiveOrgId, identityLoaded, selectedChannelId, selectedAgentId, searchQuery, isAdmin, hasGlobalView, effectivePermissions\]\)/;
if (mainFetchRegex.test(content)) {
    content = content.replace(mainFetchRegex, '');
    console.log('Block 2 Replaced successfully.');
} else {
    console.error('Failed to find the main fetch regex for the second block.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Sidebar successfully refactored');
