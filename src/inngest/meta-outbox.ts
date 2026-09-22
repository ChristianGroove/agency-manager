import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { dispatchMetaOutbound } from '@/modules/features/messaging/meta-outbox'

export const processMetaOutbound = inngest.createFunction(
    { id: 'process-meta-outbound', retries: 0, concurrency: 10 },
    { event: 'meta/outbound.queued' },
    async ({ event, step }) => step.run('dispatch-once', () => dispatchMetaOutbound(event.data.outboxId)),
)

export const sweepMetaOutbound = inngest.createFunction(
    { id: 'sweep-meta-outbound', retries: 1 },
    { cron: '* * * * *' },
    async ({ step }) => step.run('recover-queued-and-ambiguous', async () => {
        const staleAt = new Date(Date.now() - 15 * 60_000).toISOString()
        const { data: stale, error: staleError } = await supabaseAdmin.from('meta_outbound_outbox')
            .select('id').eq('status', 'sending').lt('claimed_at', staleAt).limit(50)
        if (staleError) throw new Error('Could not inspect claimed Meta sends')
        for (const row of stale || []) {
            // Sending may have reached Graph; preserve uncertainty instead of retrying.
            const { error } = await supabaseAdmin.rpc('finish_meta_outbound', {
                p_outbox_id: row.id, p_status: 'unknown', p_external_id: null, p_error_kind: 'worker_interrupted',
            })
            if (error) throw new Error('Could not mark interrupted Meta send')
        }
        const { data: queued, error: queueError } = await supabaseAdmin.from('meta_outbound_outbox')
            .select('id').eq('status', 'queued').lte('available_at', new Date().toISOString())
            .order('created_at', { ascending: true }).limit(50)
        if (queueError) throw new Error('Could not inspect queued Meta sends')
        for (const row of queued || []) await dispatchMetaOutbound(row.id)
        return { examinedQueued: queued?.length || 0, examinedStale: stale?.length || 0 }
    }),
)
