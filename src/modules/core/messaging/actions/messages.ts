"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { MetaProvider } from "../providers/meta-provider"
import { MessagingPersistence } from "../services/persistence"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import crypto from "crypto"

/**
 * FunciÃ³n para marcar una conversaciÃ³n como leÃ­da.
 */
export async function markConversationAsRead(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", id)

    if (error) console.error("[markConversationAsRead] Error:", error)
    revalidatePath("/inbox")
    return { success: !error }
}

/**
 * Obtiene los mensajes de una conversaciÃ³n.
 */
export async function getMessages(conversationId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

    if (error) {
        console.error("[getMessages] Error:", error)
        return []
    }
    return data as any[]
}

/**
 * FunciÃ³n unificada para el envÃ­o de mensajes a travÃ©s de proveedores
 */
async function internalSend({
    conversationId,
    content,
    sender,
    supabase,
    messageId: msgId,
    isRetry = false,
    connectionIdOverride
}: {
    conversationId: string,
    content: any,
    sender: string,
    supabase: any,
    messageId?: string,
    isRetry?: boolean,
    connectionIdOverride?: string
}) {
    try {
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("*, organization_id")
            .eq("id", conversationId)
            .single()

        if (convError || !conversation) throw new Error("Conversation not found")

        const connId = connectionIdOverride || conversation.connection_id
        const { data: connection } = await supabaseAdmin
            .from("integration_connections")
            .select("*")
            .eq("id", connId)
            .single()

        if (!connection) throw new Error("Connection not found")

        const credentials = typeof connection.credentials === 'string' 
            ? JSON.parse(connection.credentials) 
            : connection.credentials

        const providerKey = connection.provider_key
        const assetId = connection.metadata?.asset_id || connection.external_id

        let provider: any
        if (['whatsapp_cloud', 'meta_whatsapp', 'facebook_page', 'instagram_dm', 'meta_business'].includes(providerKey)) {
            provider = new MetaProvider(
                credentials.accessToken || credentials.apiToken,
                assetId,
                credentials.verifyToken || 'pixy_webhook_2026'
            )
        } else if (providerKey === 'evolution_api') {
            const { EvolutionProvider } = await import("../providers/evolution-provider")
            provider = new EvolutionProvider({
                baseUrl: credentials.baseUrl,
                apiKey: credentials.apiKey,
                instanceName: credentials.instanceName
            })
        }

        if (!provider) throw new Error(`Unsupported provider type: ${providerKey}`)

        const channelMap: Record<string, string> = {
            'whatsapp_cloud': 'whatsapp',
            'meta_whatsapp': 'whatsapp',
            'meta_business': 'whatsapp',
            'facebook_page': 'messenger',
            'instagram_dm': 'instagram',
            'evolution_api': 'evolution'
        }
        const dbChannel = channelMap[providerKey] || 'whatsapp'
        const messageId = msgId || crypto.randomUUID()
        
        if (!isRetry) {
            await MessagingPersistence.saveOutboundMessage({
                conversationId,
                content,
                sender,
                messageId,
                channel: dbChannel
            })
        }

        const recipientPhone = conversation.metadata?.phone || conversation.metadata?.external_id || (conversation as any).phone
        const providerOptions = {
            to: recipientPhone,
            content: content,
            credentials: connection.credentials,
            metadata: {
                channel: providerKey,
                conversationId: conversationId,
                organizationId: conversation.organization_id
            }
        }

        after(async () => {
            try {
                const result = await provider.sendMessage(providerOptions)
                if (result.success && result.messageId) {
                    await supabaseAdmin.from('messages').update({ external_id: result.messageId, status: 'sent' }).eq('id', messageId)
                } else {
                    await supabaseAdmin.from('messages').update({ status: 'failed', metadata: { error: result.error } } as any).eq('id', messageId)
                }
            } catch (bgError: any) {
                await supabaseAdmin.from('messages').update({ status: 'failed', metadata: { error: bgError.message } } as any).eq('id', messageId)
            }
        })

        return { success: true, messageId }
    } catch (error: any) {
        console.error("[internalSend] Error:", error)
        return { success: false, error: error.message }
    }
}

export async function sendMessage(conversationId: string, content: any, sender: string, messageId?: string) {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendOutboundMessage(conversationId: string, content: any, channel: string = 'whatsapp', connectionId?: string, sender: string = 'System') {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content, sender, supabase, connectionIdOverride: connectionId })
    return { success: result.success, externalId: result.messageId, error: result.error }
}

export async function sendAudioMessage(conversationId: string, audioUrl: string, duration: number, sender: string, messageId?: string) {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content: { type: 'audio', mediaUrl: audioUrl, duration }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendImageMessage(conversationId: string, imageUrl: string, caption: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content: { type: 'image', mediaUrl: imageUrl, caption }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendLocationMessage(conversationId: string, lat: number, lon: number, address: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content: { type: 'location', latitude: lat, longitude: lon, address, name: address || 'UbicaciÃ³n' }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function retryMessage(messageId: string) {
    const supabase = await createClient()
    const { data: message } = await supabase.from("messages").select("*").eq("id", messageId).single()
    if (!message) return { success: false, error: "Message not found" }
    await supabase.from('messages').update({ status: 'sending', metadata: { ...message.metadata, error: null } }).eq('id', messageId)
    const result = await internalSend({ conversationId: message.conversation_id, content: message.content, sender: message.sender_id, supabase, messageId, isRetry: true })
    revalidatePath(`/inbox/${message.conversation_id}`)
    return result
}

export async function sendProductCardMessage(conversationId: string, product: any, sender: string, messageId?: string, extraText?: string) {
    const parts = [`*${product.name.toUpperCase()}*`];
    if (product.description) parts.push(`\n${product.description}`);
    const features = product.metadata?.portal_card?.features || [];
    if (features.length > 0) parts.push(`\n*CARACTERÃSTICAS*\n` + features.map((f: any) => `âœ… ${f}`).join('\n'));
    parts.push(`\n*Precio:* $${product.base_price?.toLocaleString() || 'N/A'}`);
    if (extraText) parts.push(`\n---\n_${extraText}_`);
    
    const bodyContent = parts.join('\n');
    const content = product.image_url ? { type: 'image', mediaUrl: product.image_url, caption: bodyContent } : { type: 'text', text: bodyContent };
    
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function simulateInboundMessage(from: string, text: string = "Mensaje simulado") {
    const { inboxService } = await import("../inbox-service")
    const result = await inboxService.handleIncomingMessage({
        id: `sim_${Date.now()}`,
        externalId: `sim_ext_${Date.now()}`,
        from,
        content: { type: 'text', text },
        channel: 'whatsapp',
        timestamp: new Date()
    })
    return { success: !!result }
}
