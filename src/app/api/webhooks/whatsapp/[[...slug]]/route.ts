import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { InboxService } from "@/modules/core/messaging/inbox-service"

/**
 * Evolution API Webhook Handler (Catch-all)
 * 
 * Handles both:
 * - /api/webhooks/whatsapp
 * - /api/webhooks/whatsapp/[event-name] (e.g. /messages-upsert)
 */

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
    const { slug } = await params

    try {
        const body = await req.json();

        // original code continues... but I need to replace line 16?
        // Replace ONLY line 16? No, I am replacing lines 14-16.

        // Let's rewrite carefully.
        // Original:
        // 14:     const { slug } = await params
        // 15:     try {
        // 16:         const body = await req.json()

        // Replacement must provide `body`.

        const { event, instance, data } = body

        // Evolution v2 uses 'event' field, some versions use 'type'
        // If missing in body, check the URL slug (catch-all)
        let eventType = event || body.type

        if (!eventType && slug && slug.length > 0) {
            // Map slug (e.g. "messages-upsert") to standard event name if needed
            const slugEvent = slug[0].replace(/-/g, '.').toUpperCase()
            eventType = slugEvent
            console.log(`[Webhook:Evolution] Derived event type from slug: ${slug[0]} -> ${eventType}`)
        }

        const instanceName = instance || body.instance?.instanceName

        console.log(`[Webhook:Evolution] Received: ${eventType} from ${instanceName} (Slug: ${slug?.join('/') || 'none'})`)

        if (!instanceName) {
            console.warn('[Webhook:Evolution] No instance name in payload')
            return NextResponse.json({ status: 'ignored', reason: 'no_instance' })
        }

        // Find the channel for this instance
        const { data: channel, error: channelError } = await supabaseAdmin
            .from('integration_connections')
            .select('id, organization_id')
            .contains('credentials', { instanceName: instanceName })
            .single()

        if (channelError || !channel) {
            console.warn(`[Webhook:Evolution] Channel not found for instance: ${instanceName}`)
            return NextResponse.json({ status: 'ignored', reason: 'channel_not_found' })
        }

        const normalizedEvent = (eventType || '').toUpperCase().replace(/\./g, '_')

        // 1. Connection Update
        if (normalizedEvent === 'CONNECTION_UPDATE' || normalizedEvent === 'STATE_CHANGE') {
            const state = data?.state || data?.instance?.state

            let channelStatus = 'unknown'
            if (state === 'open') channelStatus = 'active'
            if (state === 'close') channelStatus = 'disconnected'
            if (state === 'connecting') channelStatus = 'connecting'

            await supabaseAdmin
                .from('integration_connections')
                .update({
                    status: channelStatus,
                    last_synced_at: new Date().toISOString()
                })
                .eq('id', channel.id)

            console.log(`[Webhook:Evolution] Connection update: ${instanceName} -> ${channelStatus}`)
            return NextResponse.json({ status: 'ok', event: 'connection_processed' })
        }

        // 2. Messages Upsert (Incoming Messages)
        if (normalizedEvent === 'MESSAGES_UPSERT' || normalizedEvent === 'SEND_MESSAGE') {
            const messages = data?.messages || (Array.isArray(data) ? data : [data])

            if (!messages || messages.length === 0) {
                console.log('[Webhook:Evolution] messages.upsert but no messages in payload')
                return NextResponse.json({ status: 'ok', event: 'no_messages' })
            }

            const inboxService = new InboxService()

            for (const message of messages) {
                // Skip outgoing messages (sent by us)
                if (message.key?.fromMe) {
                    continue
                }

                // Extract sender info
                const remoteJid = message.key?.remoteJid || ''
                const senderPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '')

                // Extract message content
                let content = ''
                let contentType = 'text'

                let buttonId = undefined

                if (message.message?.conversation) {
                    content = message.message.conversation
                } else if (message.message?.extendedTextMessage?.text) {
                    content = message.message.extendedTextMessage.text
                } else if (message.message?.imageMessage) {
                    content = message.message.imageMessage.caption || '[Image]'
                    contentType = 'image'
                } else if (message.message?.videoMessage) {
                    content = message.message.videoMessage.caption || '[Video]'
                    contentType = 'video'
                } else if (message.message?.audioMessage) {
                    content = '[Audio]'
                    contentType = 'audio'
                } else if (message.message?.documentMessage) {
                    content = message.message.documentMessage.fileName || '[Document]'
                    contentType = 'document'
                } else if (message.message?.buttonsResponseMessage) {
                    contentType = 'interactive'
                    buttonId = message.message.buttonsResponseMessage.selectedButtonId
                    content = message.message.buttonsResponseMessage.selectedDisplayText || `[Botón: ${buttonId}]`
                } else if (message.message?.listResponseMessage) {
                    contentType = 'interactive'
                    buttonId = message.message.listResponseMessage.singleSelectReply?.selectedRowId
                    content = message.message.listResponseMessage.title || message.message.listResponseMessage.description || `[Lista: ${buttonId}]`
                } else if (message.message?.stickerMessage) {
                    content = '[Sticker]'
                    contentType = 'sticker'
                } else {
                    content = '[Unsupported message type]'
                }

                // Get push name (sender's name in WhatsApp)
                const pushName = message.pushName || message.verifiedBizName || ''

                console.log(`[Webhook:Evolution] Processing message from ${senderPhone}: ${content.substring(0, 50)}...`)

                // Build correct content structure for IncomingMessage
                const messageContent: any = {
                    type: contentType === 'text' ? 'text' :
                        contentType === 'image' ? 'image' :
                            contentType === 'video' ? 'video' :
                                contentType === 'audio' ? 'audio' :
                                    contentType === 'document' ? 'document' :
                                        contentType === 'sticker' ? 'sticker' : 'unknown',
                    text: content,
                    raw: message.message
                }

                // Send to InboxService
                const incomingMessage = {
                    id: message.key?.id || `evo_${Date.now()}`,
                    externalId: message.key?.id || `evo_${Date.now()}`,
                    channel: 'evolution' as any,
                    from: senderPhone,
                    senderName: pushName,
                    content: messageContent,
                    buttonId: buttonId, // Pass extracted buttonId
                    timestamp: new Date(message.messageTimestamp ? Number(message.messageTimestamp) * 1000 : Date.now()),
                    metadata: {
                        instance: instanceName,
                        instanceName: instanceName,
                        connectionId: channel.id,
                        pushName,
                        rawMessage: message
                    }
                };

                const result = await inboxService.handleIncomingMessage(incomingMessage, supabaseAdmin)

                if (result && result.success && result.conversationId && buttonId) {
                    console.log(`[Webhook:Evolution] InboxService SUCCESS. Checking for button process...`)
                    // If it's a call permission button, pass it to WebhookManager for processing
                    if (buttonId.startsWith('approve_call_perm') || buttonId.startsWith('deny_call_perm')) {
                         try {
                            const { webhookManager } = await import('@/modules/core/messaging/webhook-handler')
                            // Mocking normalized provider to use WebhookManager logic
                            await (webhookManager as any).processMessage(incomingMessage, 'whatsapp' as any);
                         } catch (err) {
                            console.error('[Webhook:Evolution] Failed to process button logic via WebhookManager:', err)
                         }
                    }
                }
            }

            return NextResponse.json({ status: 'ok', event: 'messages_processed', count: messages.length })
        }

        // 3. Messages Update (Status changes)
        if (normalizedEvent === 'MESSAGES_UPDATE' || normalizedEvent === 'MESSAGES_SET') {
            // TODO: Update message status in DB (delivered, read, etc)
            // console.log(`[Webhook:Evolution] Message status update (not yet implemented)`)
            return NextResponse.json({ status: 'ok', event: 'status_update_ack' })
        }

        // Unknown event type - just acknowledge
        console.log(`[Webhook:Evolution] Unhandled event type: ${eventType} (${normalizedEvent})`)
        return NextResponse.json({ status: 'ok', event: 'unknown_ack' })

    } catch (error: any) {
        console.error('[Webhook:Evolution] Error:', error)
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }
}

// Evolution may send GET for webhook verification
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug?: string[] }> }
) {
    // Await params even if not used to satisfy Next.js types
    await params
    return NextResponse.json({ status: 'active', service: 'evolution-webhook' })
}
