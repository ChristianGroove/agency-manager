import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { dispatchMetaOutbound } from './meta-outbox'

/** Recover committed sends without automatically repeating an ambiguous Graph request. */
export async function recoverMetaOutbound(limit = 25) {
    const staleAt = new Date(Date.now() - 15 * 60_000).toISOString()
    const { data: stale, error: staleError } = await supabaseAdmin.from('meta_outbound_outbox')
        .select('id').eq('status', 'sending').lt('claimed_at', staleAt).limit(limit)
    if (staleError) throw new Error('Could not inspect claimed Meta sends')

    for (const row of stale || []) {
        const { error } = await supabaseAdmin.rpc('finish_meta_outbound', {
            p_outbox_id: row.id, p_status: 'unknown', p_external_id: null, p_error_kind: 'worker_interrupted',
        })
        if (error) throw new Error('Could not mark interrupted Meta send')
    }

    const { data: queued, error: queueError } = await supabaseAdmin.from('meta_outbound_outbox')
        .select('id').eq('status', 'queued').lte('available_at', new Date().toISOString())
        .order('created_at', { ascending: true }).limit(limit)
    if (queueError) throw new Error('Could not inspect queued Meta sends')

    let failed = 0
    for (const row of queued || []) {
        try {
            await dispatchMetaOutbound(row.id)
        } catch (error) {
            failed++
            console.error('[MetaOutboxRecovery] Dispatch failed', error instanceof Error ? { name: error.name } : { type: typeof error })
        }
    }
    return { examinedQueued: queued?.length || 0, examinedStale: stale?.length || 0, failed }
}
