import { NextResponse } from 'next/server'
import { requireCronSecret } from '@/app/api/_guards/request-guards'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { processPersistedMetaWebhook } from '@/modules/infrastructure/meta/services/process-persisted-webhook'

/** Recovers persisted events when the original webhook request did not finish. */
export async function POST(request: Request) {
    const unauthorized = requireCronSecret(request)
    if (unauthorized) return unauthorized

    const { data, error } = await supabaseAdmin.from('meta_webhook_events')
        .select('id').is('processed_at', null)
        .order('created_at', { ascending: true }).limit(25)
    if (error) return NextResponse.json({ error: 'Could not inspect pending webhooks' }, { status: 500 })

    let processed = 0
    let failed = 0
    for (const row of data || []) {
        try {
            await processPersistedMetaWebhook(row.id)
            processed++
        } catch (error) {
            failed++
            console.error('[MetaWebhookRecovery] Processing failed', error instanceof Error ? { name: error.name } : { type: typeof error })
        }
    }
    return NextResponse.json({ processed, failed }, { status: failed ? 500 : 200 })
}
