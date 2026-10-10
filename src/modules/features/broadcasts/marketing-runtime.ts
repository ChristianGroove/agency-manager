import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { refreshStaleMarketingChannels } from './marketing-channel-health'

export async function observeMarketingRun<T extends { success: boolean; failed?: number }>(run: () => Promise<T>): Promise<T> {
    if (process.env.MARKETING_EXECUTION_ENABLED !== 'true') return run()
    const started = await supabaseAdmin.rpc('record_marketing_worker_run')
    if (started.error || !started.data) throw new Error('No se pudo registrar el inicio del motor.')
    let result: T | undefined
    try {
        await refreshStaleMarketingChannels()
        result = await run()
        return result
    } finally {
        const finished = await supabaseAdmin.rpc('record_marketing_worker_run', {
            p_run: started.data, p_result: result || {}, p_failed: !result || !result.success || !!result.failed,
        })
        if (finished.error) throw new Error('No se pudo registrar el resultado del motor.')
    }
}
