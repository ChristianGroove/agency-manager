import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { InboxService } from "@/modules/core/messaging/inbox-service"

/**
 * Evolution API Webhook Handler
 * 
 * Receives events from Evolution instances for:
 * - connection.update: Connection state changes
 * - messages.upsert: Incoming messages
 * - messages.update: Message status updates (read, delivered, etc)
 */

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { event, instance, data } = body

        // Evolution v2 uses 'event' field, some versions use 'type'
        const eventType = event || body.type
        const instanceName = instance || body.instance?.instanceName

        console.log(`[Webhook:Evolution] Received: ${eventType} from ${instanceName}`)

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

        // 1. Connection Update
        if (eventType === 'connection.update' || eventType === 'CONNECTION_UPDATE') {
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
        if (eventType === 'messages.upsert' || eventType === 'MESSAGES_UPSERT') {
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
                const messageContent: { type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'unknown'; text?: string; mediaUrl?: string; raw?: unknown } = {
                    type: contentType === 'text' ? 'text' :
                        contentType === 'image' ? 'image' :
                            contentType === 'video' ? 'video' :
                                contentType === 'audio' ? 'audio' :
                                    contentType === 'document' ? 'document' : 'unknown',
                    text: content,
                    raw: message.message
                }

                // Send to InboxService
                await inboxService.handleIncomingMessage({
                    id: message.key?.id || `evo_${Date.now()}`,
                    externalId: message.key?.id || `evo_${Date.now()}`,
                    channel: 'whatsapp',
                    from: senderPhone,
                    senderName: pushName,
                    content: messageContent,
                    timestamp: new Date(message.messageTimestamp ? Number(message.messageTimestamp) * 1000 : Date.now()),
                    metadata: {
                        instanceName,
                        connectionId: channel.id,
                        pushName,
                        rawMessage: message
                    }
                })
            }

            return NextResponse.json({ status: 'ok', event: 'messages_processed', count: messages.length })
        }

        // 3. Messages Update (Status changes)
        if (eventType === 'messages.update' || eventType === 'MESSAGES_UPDATE') {
            // TODO: Update message status in DB (delivered, read, etc)
            console.log(`[Webhook:Evolution] Message status update (not yet implemented)`)
            return NextResponse.json({ status: 'ok', event: 'status_update_ack' })
        }

        // Unknown event type - just acknowledge
        console.log(`[Webhook:Evolution] Unhandled event type: ${eventType}`)
        return NextResponse.json({ status: 'ok', event: 'unknown_ack' })

    } catch (error: any) {
        console.error('[Webhook:Evolution] Error:', error)
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
    }
}

// Evolution may send GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'evolution-webhook' })
}
