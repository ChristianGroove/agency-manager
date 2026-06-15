const fs = require('fs');

let c = fs.readFileSync('src/modules/features/messaging/services/conversation.service.ts', 'utf8');

c = `import { messagingCleanupService } from '@/modules/features/messaging/cleanup-service';
async function broadcastVanish(organizationId: string, conversationId: string) {
    const { createClient } = await import('@/modules/core/database/supabase-server');
    const supabase = await createClient();
    await supabase.channel('inbox-org-' + organizationId).send({
        type: 'broadcast',
        event: 'vanish',
        payload: { conversationId }
    });
}
` + c;

fs.writeFileSync('src/modules/features/messaging/services/conversation.service.ts', c);
