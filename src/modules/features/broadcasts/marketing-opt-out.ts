import type { SupabaseClient } from '@supabase/supabase-js'
import type { IncomingMessage } from '../messaging/providers/types'

const explicitRequests = new Set([
    'stop', 'unsubscribe', 'baja', 'baja_promociones', 'stop marketing messages',
    'unsubscribe from marketing', 'no quiero recibir promociones', 'no quiero recibir mas promociones',
    'no me envien mas promociones', 'dejen de enviarme promociones', 'quiero darme de baja',
    'quiero darme de baja de las promociones',
])

/** Fast filter only; persisted requests and recipient ownership are enforced by SQL. */
export function isMarketingOptOut(msg: IncomingMessage): boolean {
    if (msg.channel !== 'whatsapp' || !msg.externalId || msg.origin === 'outbound'
        || msg.metadata?.historical || msg.metadata?.is_echo) return false
    const content = typeof msg.content === 'object' ? msg.content as Record<string, any> : null
    const button = msg.buttonId ?? content?.raw?.button_reply?.id ?? content?.raw?.button?.payload
    if (typeof button === 'string' && button.trim().toUpperCase() === 'BAJA_PROMOCIONES') return true
    const text = typeof msg.content === 'string' ? msg.content : content?.text
    if (typeof text !== 'string') return false
    const normalized = text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').replace(/^[¿¡\s]+|[!?.,;:\s]+$/g, '')
    return explicitRequests.has(normalized)
}

/** Runs after message commit. A failed update leaves a durable request blocking marketing. */
export async function processIncomingMarketingOptOut(msg: IncomingMessage, messageId: string | undefined, db: SupabaseClient) {
    if (!messageId || !isMarketingOptOut(msg)) return
    try {
        const result = await db.rpc('process_marketing_opt_out_requests', { p_limit: 1, p_message: messageId })
        if (result.error || result.data?.failed) console.warn('[Marketing] Opt-out pending maintenance retry')
    } catch {
        // Preserve Inbox reception and its existing automations; never log message or recipient data.
        console.warn('[Marketing] Opt-out pending maintenance retry')
    }
}
