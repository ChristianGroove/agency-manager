import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { dispatchMetaOutbound } from '@/modules/features/messaging/meta-outbox'
import { recoverMetaOutbound } from '@/modules/features/messaging/meta-outbox-recovery'

export const processMetaOutbound = inngest.createFunction(
    { id: 'process-meta-outbound', retries: 0, concurrency: 10 },
    { event: 'meta/outbound.queued' },
    async ({ event, step }) => step.run('dispatch-once', () => dispatchMetaOutbound(event.data.outboxId)),
)

export const sweepMetaOutbound = inngest.createFunction(
    { id: 'sweep-meta-outbound', retries: 1 },
    { cron: '* * * * *' },
    async ({ step }) => step.run('recover-queued-and-ambiguous', async () => {
        const result = await recoverMetaOutbound(50)
        if (result.failed) throw new Error('Some queued Meta sends failed')
        return result
    }),
)
