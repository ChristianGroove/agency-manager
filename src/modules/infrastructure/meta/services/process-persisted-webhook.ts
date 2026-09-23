import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { MetaProvider } from '@/modules/features/messaging/providers/meta-provider'
import { webhookManager } from '@/modules/features/messaging/webhook-handler'
import { processMetaControlEvents } from './webhook-events'
import type { ChannelType } from '@/types/messaging'

export async function processPersistedMetaWebhook(eventId: string): Promise<void> {
    const { data, error } = await supabaseAdmin.from('meta_webhook_events')
        .select('*').eq('id', eventId).single()
    if (error || !data) throw new Error('Webhook event unavailable')
    if (data.processed_at) return

    await processMetaControlEvents(data.payload)
    const channel = data.channel as ChannelType
    webhookManager.registerProvider(channel, new MetaProvider('', '', process.env.META_WEBHOOK_VERIFY_TOKEN || ''))
    const result = await webhookManager.handleParsed(channel, data.payload)
    if (!result.success) throw new Error('Meta webhook processing failed')

    const saved = await supabaseAdmin.from('meta_webhook_events')
        .update({ processed_at: new Date().toISOString() }).eq('id', eventId).is('processed_at', null)
    if (saved.error) throw new Error('Could not acknowledge webhook processing')
}
