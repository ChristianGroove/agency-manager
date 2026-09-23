import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { processPersistedMetaWebhook } from '@/modules/infrastructure/meta/services/process-persisted-webhook'

export const processMetaWebhook = inngest.createFunction({ id: 'process-meta-webhook', retries: 5, concurrency: 10 },
    { event: 'meta/webhook.received' }, async ({ event, step }) => {
        await step.run('process-persisted-webhook', () => processPersistedMetaWebhook(event.data.eventId))
        return { success: true }
    })
