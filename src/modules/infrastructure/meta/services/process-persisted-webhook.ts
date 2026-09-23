import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { MetaProvider } from '@/modules/features/messaging/providers/meta-provider'
import { webhookManager } from '@/modules/features/messaging/webhook-handler'
import { ChannelResolver } from '@/modules/features/messaging/channel-resolver'
import { processMetaControlEvents } from './webhook-events'
import type { ChannelType } from '@/types/messaging'

async function routableWhatsAppPayload(payload: any): Promise<any> {
    const owned = new Map<string, boolean>()
    const entries = []
    for (const entry of payload.entry || []) {
        if (!Array.isArray(entry.changes)) {
            entries.push(entry)
            continue
        }
        const changes = []
        for (const change of entry.changes) {
            // Account lifecycle events are resolved by WABA ID rather than phone ID.
            if (change.field === 'account_update') {
                changes.push(change)
                continue
            }
            const phoneId = change.value?.metadata?.phone_number_id
            if (!phoneId) {
                changes.push(change)
                continue
            }
            if (!owned.has(phoneId)) {
                const match = await ChannelResolver.resolveConnection({
                    channel: 'whatsapp', metadata: { phoneNumberId: phoneId },
                }, supabaseAdmin)
                owned.set(phoneId, Boolean(match))
            }
            if (owned.get(phoneId)) changes.push(change)
        }
        entries.push({ ...entry, changes })
    }
    return { ...payload, entry: entries }
}

export async function processPersistedMetaWebhook(eventId: string): Promise<void> {
    const { data, error } = await supabaseAdmin.from('meta_webhook_events')
        .select('*').eq('id', eventId).single()
    if (error || !data) throw new Error('Webhook event unavailable')
    if (data.processed_at) return

    const payload = data.channel === 'whatsapp'
        ? await routableWhatsAppPayload(data.payload) : data.payload
    await processMetaControlEvents(payload)
    const channel = data.channel as ChannelType
    webhookManager.registerProvider(channel, new MetaProvider('', '', process.env.META_WEBHOOK_VERIFY_TOKEN || ''))
    const result = await webhookManager.handleParsed(channel, payload)
    if (!result.success) throw new Error('Meta webhook processing failed')

    const saved = await supabaseAdmin.from('meta_webhook_events')
        .update({ processed_at: new Date().toISOString() }).eq('id', eventId).is('processed_at', null)
    if (saved.error) throw new Error('Could not acknowledge webhook processing')
}
