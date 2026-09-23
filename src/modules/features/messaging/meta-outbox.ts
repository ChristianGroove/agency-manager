import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { assertMetaSendAllowed } from '@/modules/infrastructure/meta/services/send-policy'
import { integrationRegistry } from '@/modules/infrastructure/integrations/registry'
import { inngest } from '@/modules/infrastructure/automation/inngest/client'
import { PRIVATE_CHAT_MEDIA_BUCKET } from './constants'

export type OutboxStatus = 'queued' | 'sending' | 'accepted' | 'unknown' | 'failed'
export interface OutboxResult {
    outboxId: string
    messageId: string | null
    status: OutboxStatus
    externalId: string | null
}

/** The database function inserts the visible message and delivery record atomically. */
export async function enqueueMetaOutbound(input: {
    organizationId: string
    connectionId: string
    conversationId?: string | null
    messageId?: string | null
    operationKey: string
    recipient: string
    content: any
    sender: string
    channel: 'whatsapp' | 'messenger' | 'instagram'
    notify?: boolean
}): Promise<OutboxResult> {
    const content = typeof input.content === 'string' ? { type: 'text', text: input.content } : input.content
    const { data, error } = await supabaseAdmin.rpc('enqueue_meta_outbound', {
        p_organization_id: input.organizationId,
        p_connection_id: input.connectionId,
        p_conversation_id: input.conversationId || null,
        p_message_id: input.messageId || null,
        p_operation_key: input.operationKey,
        p_recipient: input.recipient,
        p_content: content,
        p_sender: input.sender,
        p_channel: input.channel,
    })
    const row = Array.isArray(data) ? data[0] : data
    if (error || !row) throw new Error('Could not queue outbound message')
    const result: OutboxResult = {
        outboxId: row.outbox_id,
        messageId: row.message_id,
        status: row.delivery_status,
        externalId: row.external_id,
    }
    if (result.status === 'queued' && input.notify !== false) {
        // The cron sweep recovers a committed row if Inngest is unavailable here.
        try { await inngest.send({ name: 'meta/outbound.queued', data: { outboxId: result.outboxId } }) }
        catch { console.warn('[MetaOutbox] Event dispatch unavailable; cron will recover queued message') }
    }
    return result
}

async function finish(outboxId: string, status: 'accepted' | 'unknown' | 'failed', externalId?: string, errorKind?: string) {
    const result = await supabaseAdmin.rpc('finish_meta_outbound', {
        p_outbox_id: outboxId, p_status: status,
        p_external_id: externalId || null, p_error_kind: errorKind || null,
    })
    if (result.error || result.data !== true) throw new Error('Could not reconcile outbound result')
}

/** One queued-to-sending claim; never automatically re-send an ambiguous HTTP result. */
export async function dispatchMetaOutbound(outboxId: string): Promise<OutboxResult> {
    const { data: pending, error: lookupError } = await supabaseAdmin.from('meta_outbound_outbox')
        .select('*').eq('id', outboxId).single()
    if (lookupError || !pending) throw new Error('Outbound operation unavailable')
    if (pending.status !== 'queued') {
        return { outboxId, messageId: pending.message_id, status: pending.status, externalId: pending.external_id }
    }

    const { data: connection } = await supabaseAdmin.from('integration_connections')
        .select('*').eq('id', pending.connection_id).eq('organization_id', pending.organization_id).maybeSingle()
    if (!connection || connection.status !== 'active') {
        if (connection?.status === 'temporarily_offboarded') {
            await supabaseAdmin.from('meta_outbound_outbox')
                .update({ available_at: new Date(Date.now() + 15 * 60_000).toISOString() })
                .eq('id', outboxId).eq('status', 'queued')
            return { outboxId, messageId: pending.message_id, status: 'queued', externalId: null }
        }
        const { data: canceled, error: cancelError } = await supabaseAdmin.from('meta_outbound_outbox')
            .update({ status: 'sending', claimed_at: new Date().toISOString() })
            .eq('id', outboxId).eq('status', 'queued').select('id').maybeSingle()
        if (cancelError) throw new Error('Could not cancel outbound operation')
        if (canceled) await finish(outboxId, 'failed', undefined, 'channel_unavailable')
        return { outboxId, messageId: pending.message_id, status: 'failed', externalId: null }
    }

    const { data: claimed, error: claimError } = await supabaseAdmin.from('meta_outbound_outbox')
        .update({ status: 'sending', claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', outboxId).eq('status', 'queued').select('*').maybeSingle()
    if (claimError) throw new Error('Could not claim outbound operation')
    if (!claimed) return dispatchMetaOutbound(outboxId)

    const { data: currentConnection } = await supabaseAdmin.from('integration_connections')
        .select('status').eq('id', claimed.connection_id).eq('organization_id', claimed.organization_id).maybeSingle()
    if (currentConnection?.status !== 'active') {
        if (currentConnection?.status === 'temporarily_offboarded') {
            const { error } = await supabaseAdmin.from('meta_outbound_outbox').update({ status: 'queued', claimed_at: null,
                available_at: new Date(Date.now() + 15 * 60_000).toISOString() })
                .eq('id', outboxId).eq('status', 'sending')
            if (error) throw new Error('Could not defer suspended Meta send')
            return { outboxId, messageId: claimed.message_id, status: 'queued', externalId: null }
        }
        await finish(outboxId, 'failed', undefined, 'channel_unavailable')
        return { outboxId, messageId: claimed.message_id, status: 'failed', externalId: null }
    }

    let conversation: any = null
    try {
        if (claimed.conversation_id) {
            const { data, error } = await supabaseAdmin.from('conversations').select('*')
                .eq('id', claimed.conversation_id).eq('organization_id', claimed.organization_id)
                .eq('connection_id', claimed.connection_id).single()
            if (error || !data) throw new Error('Outbound conversation unavailable')
            conversation = data
        }
        await assertMetaSendAllowed(connection, conversation, claimed.content)
    } catch (error) {
        await finish(outboxId, 'failed', undefined, 'policy_or_context')
        return { outboxId, messageId: claimed.message_id, status: 'failed', externalId: null }
    }

    const adapter = integrationRegistry.getAdapter(connection.provider_key)
    if (!adapter?.sendMessage) {
        await finish(outboxId, 'failed', undefined, 'unsupported_channel')
        return { outboxId, messageId: claimed.message_id, status: 'failed', externalId: null }
    }

    const connMeta = connection.metadata || {}
    const convMeta = conversation?.metadata || {}
    const metadata = claimed.channel === 'whatsapp'
        ? { channel: 'whatsapp', phoneNumberId: connMeta.asset_id || connMeta.phone_number_id,
            organizationId: claimed.organization_id }
        : claimed.channel === 'messenger'
            ? { channel: 'messenger', pageId: connMeta.asset_id || connMeta.page_id }
            : { channel: 'instagram', pageId: connMeta.asset_id || convMeta.instagramBusinessId || connMeta.instagram_business_id }

    try {
        let sendContent = claimed.content
        if (claimed.channel !== 'whatsapp' && typeof sendContent?.mediaUrl === 'string'
            && sendContent.mediaUrl.startsWith('/api/media/chat/')) {
            const mediaPath = decodeURIComponent(sendContent.mediaUrl.slice('/api/media/chat/'.length))
            if (!mediaPath.startsWith(`${claimed.organization_id}/`)) throw new Error('Media ownership mismatch')
            // Meta fetches social attachments server-to-server; the authenticated
            // Pixy preview URL cannot be used as the Graph attachment URL.
            const { data, error } = await supabaseAdmin.storage.from(PRIVATE_CHAT_MEDIA_BUCKET)
                .createSignedUrl(mediaPath, 60 * 60)
            if (error || !data?.signedUrl) throw new Error('Could not authorize social attachment')
            sendContent = { ...sendContent, mediaUrl: data.signedUrl, url: data.signedUrl }
        }
        const sent = await adapter.sendMessage(connection.credentials, claimed.recipient, sendContent, metadata)
        if (!sent?.messageId) throw new Error('Graph response has no message identifier')
        await finish(outboxId, 'accepted', sent.messageId)
        return { outboxId, messageId: claimed.message_id, status: 'accepted', externalId: sent.messageId }
    } catch (error) {
        // A timeout or lost ACK can mean Meta accepted the send. Never retry it blindly.
        try { await finish(outboxId, 'unknown', undefined, 'graph_or_reconciliation') }
        catch { console.error('[MetaOutbox] Could not mark an ambiguous send for reconciliation') }
        console.warn('[MetaOutbox] Send outcome requires reconciliation', {
            reason: error instanceof Error ? error.name : typeof error,
        })
        return { outboxId, messageId: claimed.message_id, status: 'unknown', externalId: null }
    }
}
