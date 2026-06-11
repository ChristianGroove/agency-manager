"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { MetaProvider } from "../providers/meta-provider"
import { MessagingPersistence } from "../services/persistence"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { createClient } from "@/modules/core/database/supabase-server"
import crypto from "crypto"

const PUBLIC_MESSAGE_SEND_ERROR = "Message could not be sent"
const PUBLIC_MESSAGE_SIMULATION_ERROR = "Failed to handle message"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function sanitizeMessageActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'connectionId',
        'conversationId',
        'from',
        'messageId',
        'organizationId',
        'recipientPhone',
        'sender',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeMessageActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
        }
    }

    return { type: typeof error }
}

function logMessageActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...sanitizeMessageActionLogDetails(details),
        detail: summarizeMessageActionError(error),
    })
}

function publicMessageActionError(error: unknown, fallback = PUBLIC_MESSAGE_SEND_ERROR) {
    if (isDeployedRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (typeof error === 'string' && error.length > 0) {
        return error
    }

    return fallback
}

async function rejectUnauthenticatedMessageAction(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" } as const
    return null
}

/**
 * FunciÃ³n para marcar una conversaciÃ³n como leÃ­da.
 */
export async function markConversationAsRead(id: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

    const { error } = await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", id)

    if (error) logMessageActionError("[markConversationAsRead] Error:", error, { conversationId: id })
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
        logMessageActionError("[getMessages] Error:", error, { conversationId })
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
            .eq("organization_id", conversation.organization_id)
            .single()

        if (!connection) throw new Error("Connection not found")

        const credentials = typeof connection.credentials === 'string' 
            ? JSON.parse(connection.credentials) 
            : connection.credentials

        const providerKey = connection.provider_key
        const assetId = connection.metadata?.asset_id || connection.external_id

        let provider: any
        if (['whatsapp_cloud', 'meta_whatsapp', 'facebook_page', 'instagram_dm', 'instagram_dme', 'meta_business'].includes(providerKey)) {
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
            'instagram_dme': 'instagram',
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
                    await supabaseAdmin
                        .from('messages')
                        .update({ external_id: result.messageId, status: 'sent' })
                        .eq('id', messageId)
                        .eq('conversation_id', conversationId)
                } else {
                    await supabaseAdmin
                        .from('messages')
                        .update({
                            status: 'failed',
                            metadata: { error: publicMessageActionError(result.error) }
                        } as any)
                        .eq('id', messageId)
                        .eq('conversation_id', conversationId)
                }
            } catch (bgError: any) {
                await supabaseAdmin
                    .from('messages')
                    .update({
                        status: 'failed',
                        metadata: { error: publicMessageActionError(bgError) }
                    } as any)
                    .eq('id', messageId)
                    .eq('conversation_id', conversationId)
            }
        })

        return { success: true, messageId }
    } catch (error: any) {
        logMessageActionError("[internalSend] Error:", error, {
            connectionId: connectionIdOverride,
            conversationId,
            messageId: msgId,
            sender,
        })
        return { success: false, error: publicMessageActionError(error) }
    }
}

export async function sendMessage(conversationId: string, content: any, sender: string, messageId?: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

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
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

    const result = await internalSend({ conversationId, content: { type: 'audio', mediaUrl: audioUrl, duration }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendImageMessage(conversationId: string, imageUrl: string, caption: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

    const result = await internalSend({ conversationId, content: { type: 'image', mediaUrl: imageUrl, caption }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendLocationMessage(conversationId: string, lat: number, lon: number, address: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized
    const result = await internalSend({ conversationId, content: { type: 'location', latitude: lat, longitude: lon, address, name: address || 'UbicaciÃ³n' }, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function retryMessage(messageId: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

    const { data: message } = await supabase.from("messages").select("*").eq("id", messageId).single()
    if (!message) return { success: false, error: "Message not found" }
    await supabase.from('messages').update({ status: 'sending', metadata: { ...message.metadata, error: null } }).eq('id', messageId)
    const result = await internalSend({ conversationId: message.conversation_id, content: message.content, sender: message.sender_id, supabase, messageId, isRetry: true })
    revalidatePath(`/inbox/${message.conversation_id}`)
    return result
}

export async function sendProductCardMessage(conversationId: string, product: any, sender: string, messageId?: string, extraText?: string) {
    const supabase = await createClient()
    const unauthorized = await rejectUnauthenticatedMessageAction(supabase)
    if (unauthorized) return unauthorized

    const parts = [`*${product.name.toUpperCase()}*`];
    if (product.description) parts.push(`\n${product.description}`);
    const features = product.metadata?.portal_card?.features || [];
    if (features.length > 0) parts.push(`\n*CARACTERÃSTICAS*\n` + features.map((f: any) => `âœ… ${f}`).join('\n'));
    parts.push(`\n*Precio:* $${product.base_price?.toLocaleString() || 'N/A'}`);
    if (extraText) parts.push(`\n---\n_${extraText}_`);
    
    const bodyContent = parts.join('\n');
    const content = product.image_url ? { type: 'image', mediaUrl: product.image_url, caption: bodyContent } : { type: 'text', text: bodyContent };
    
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function simulateInboundMessage(from: string, text: string = "Mensaje simulado") {
    if (isProductionRuntime()) {
        return { success: false, error: PUBLIC_MESSAGE_SIMULATION_ERROR }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const { inboxService } = await import("../inbox-service")
        const result = await inboxService.handleIncomingMessage({
            id: `sim_${Date.now()}`,
            externalId: `sim_ext_${Date.now()}`,
            from,
            content: { type: 'text', text },
            channel: 'whatsapp',
            timestamp: new Date()
        })
        return { success: !!result, error: result ? undefined : "Failed to handle message" }
    } catch (error: any) {
        logMessageActionError('[simulateInboundMessage] Failed:', error, { from })
        return { success: false, error: publicMessageActionError(error, PUBLIC_MESSAGE_SIMULATION_ERROR) }
    }
}
