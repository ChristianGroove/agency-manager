import { NextResponse } from 'next/server'
import { requireCronSecret } from '@/app/api/_guards/request-guards'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { processPersistedMetaWebhook } from '@/modules/infrastructure/meta/services/process-persisted-webhook'
import { recoverMetaOutbound } from '@/modules/features/messaging/meta-outbox-recovery'

/** Called by a Coolify Scheduled Task when Inngest is not configured. */
export async function POST(request: Request) {
    const unauthorized = requireCronSecret(request)
    if (unauthorized) return unauthorized

    try {
        const { data: pending, error } = await supabaseAdmin.from('meta_webhook_events')
            .select('id').is('processed_at', null)
            .order('created_at', { ascending: true }).limit(25)
        if (error) throw new Error('Could not inspect pending Meta webhooks')

        let processedWebhooks = 0
        let failedWebhooks = 0
        for (const row of pending || []) {
            try {
                await processPersistedMetaWebhook(row.id)
                processedWebhooks++
            } catch (error) {
                failedWebhooks++
                console.error('[MetaMaintenance] Webhook failed', error instanceof Error ? { name: error.name } : { type: typeof error })
            }
        }

        // Privacy requests are processed even while marketing execution is disabled.
        const optOuts = await supabaseAdmin.rpc('process_marketing_opt_out_requests', { p_limit: 5 })
        const failedMarketingOptOuts = optOuts.error ? 1 : (optOuts.data?.failed || 0)
        const processedMarketingOptOuts = optOuts.data?.processed || 0
        const outbound = await recoverMetaOutbound()
        const expiry = await supabaseAdmin.rpc('expire_meta_coexistence_onboarding')
        if (expiry.error) throw new Error('Could not expire overdue coexistence onboarding')

        const failed = failedWebhooks + outbound.failed + failedMarketingOptOuts
        return NextResponse.json({ processedWebhooks, failedWebhooks, processedMarketingOptOuts, failedMarketingOptOuts,
            examinedQueued: outbound.examinedQueued, examinedStale: outbound.examinedStale,
            failedOutbound: outbound.failed, expiredOnboarding: expiry.data || 0,
        }, { status: failed ? 500 : 200 })
    } catch (error) {
        console.error('[MetaMaintenance] Failed', error instanceof Error ? { name: error.name } : { type: typeof error })
        return NextResponse.json({ error: 'Meta maintenance failed' }, { status: 500 })
    }
}
