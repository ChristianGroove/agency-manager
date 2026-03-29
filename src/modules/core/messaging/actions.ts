"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { MetaProvider } from "./providers/meta-provider"
import { inboxService } from "./inbox-service"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server"
import crypto from "crypto"

import { decryptObject } from "@/modules/core/integrations/encryption"
import { MESSAGING_STORAGE_BUCKET } from "./constants"

/**
 * Función para marcar una conversación como leída.
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
 * Obtiene los mensajes de una conversación. (Legacy support)
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
 * Función para enviar mensajes desde el motor de automatización (Outbound).
 */
export async function sendOutboundMessage(
    conversationId: string, 
    content: any, 
    channel: string = 'whatsapp', 
    connectionId?: string,
    sender: string = 'System'
) {
    const supabase = await createClient()
    const result = await internalSend({
        conversationId,
        content,
        sender,
        supabase,
        connectionIdOverride: connectionId
    })
    
    // El motor de automatización espera 'externalId' en el resultado
    return {
        success: result.success,
        externalId: result.messageId, // Usamos el ID interno como referencia si el envío es asíncrono
        error: result.error
    }
}

/**
 * Función interna unificada para el envío de mensajes a través de proveedores (Meta, Evolution, etc.)
 * Maneja la resolución de conexiones, persistencia inicial y envío en background.
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
        // 1. Get Conversation and Connection
        const { data: conversation, error: convError } = await supabase
            .from("conversations")
            .select("*, organization_id")
            .eq("id", conversationId)
            .single()

        if (convError || !conversation) throw new Error("Conversation not found")

        const connId = connectionIdOverride || conversation.connection_id
        const { data: connection, error: connError } = await supabaseAdmin
            .from("integration_connections")
            .select("*")
            .eq("id", connId)
            .single()

        if (connError || !connection) throw new Error("Connection not found")

        // 2. Prepare Provider
        let provider: any
        const credentials = typeof connection.credentials === 'string' 
            ? JSON.parse(connection.credentials) 
            : connection.credentials

        const providerKey = connection.provider_key
        const assetId = connection.metadata?.asset_id || connection.external_id

        if (['whatsapp_cloud', 'meta_whatsapp', 'facebook_page', 'instagram_dm', 'meta_business'].includes(providerKey)) {
            provider = new MetaProvider(
                credentials.accessToken || credentials.apiToken,
                assetId,
                credentials.verifyToken || 'pixy_webhook_2026'
            )
        } else if (providerKey === 'evolution_api') {
            const { EvolutionProvider } = await import("./providers/evolution-provider")
            provider = new EvolutionProvider({
                baseUrl: credentials.baseUrl,
                apiKey: credentials.apiKey,
                instanceName: credentials.instanceName
            })
        }

        if (!provider) throw new Error(`Unsupported provider type: ${providerKey}`)

        // 3. Normalize channel for DB constraint (messages_channel_check)
        const channelMap: Record<string, string> = {
            'whatsapp_cloud': 'whatsapp',
            'meta_whatsapp': 'whatsapp',
            'meta_business': 'whatsapp',
            'facebook_page': 'messenger',
            'instagram_dm': 'instagram',
            'evolution_api': 'evolution'
        }
        const dbChannel = channelMap[providerKey] || 'whatsapp'

        // 4. Persist Message Initial State
        const messageId = msgId || crypto.randomUUID()
        
        if (!isRetry) {
            await inboxService.saveOutboundMessage(
                conversationId,
                content,
                undefined, // externalId
                sender,
                messageId,
                dbChannel
            )
        }

        // 5. Background Sending
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

/**
 * Acciones Públicas
 */

export async function sendMessage(conversationId: string, content: any, sender: string, messageId?: string) {
    const supabase = await createClient()
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendAudioMessage(conversationId: string, audioUrl: string, duration: number, sender: string, messageId?: string) {
    const supabase = await createClient()
    const content = {
        type: 'audio',
        mediaUrl: audioUrl,
        duration: duration
    }
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendImageMessage(conversationId: string, imageUrl: string, caption: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const content = {
        type: 'image',
        mediaUrl: imageUrl,
        caption: caption
    }
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendProductCardMessage(conversationId: string, product: any, sender: string, messageId?: string) {
    const supabase = await createClient()

    const bodyContent = `*${product.name.toUpperCase()}*

${product.description || 'Ficha Técnica de producto'}

*Precio:* $${product.base_price?.toLocaleString() || 'N/A'}`;

    let content: any = {};
    if (product.image_url) {
        content = {
            type: 'image',
            mediaUrl: product.image_url,
            caption: bodyContent
        }
    } else {
        content = {
            type: 'text',
            text: bodyContent
        }
    }

    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function sendLocationMessage(conversationId: string, lat: number, lon: number, address: string | undefined, sender: string, messageId?: string) {
    const supabase = await createClient()
    const content = {
        type: 'location',
        latitude: lat,
        longitude: lon,
        address: address,
        name: address || 'Ubicación compartida'
    }
    const result = await internalSend({ conversationId, content, sender, supabase, messageId })
    revalidatePath(`/inbox/${conversationId}`)
    return result
}

export async function retryMessage(messageId: string) {
    const supabase = await createClient()
    
    // 1. Get Message
    const { data: message, error: msgError } = await supabase
        .from("messages")
        .select("*")
        .eq("id", messageId)
        .single()

    if (msgError || !message) return { success: false, error: "Message not found" }

    // 2. Clear old error and set status to sending
    await supabase.from('messages').update({ status: 'sending', metadata: { ...message.metadata, error: null } }).eq('id', messageId)

    // 3. Re-run internal send
    const result = await internalSend({
        conversationId: message.conversation_id,
        content: message.content,
        sender: message.sender_id,
        supabase,
        messageId: messageId,
        isRetry: true
    })

    revalidatePath(`/inbox/${message.conversation_id}`)
    return result
}

/**
 * Función para simular la recepción de un mensaje (solo para pruebas y desarrollo).
 */
export async function simulateInboundMessage(from: string, text: string = "Mensaje de prueba simulado") {
    const { inboxService } = await import("./inbox-service")
    const result = await inboxService.handleIncomingMessage({
        id: `sim_${Date.now()}`,
        externalId: `sim_ext_${Date.now()}`,
        from,
        content: { type: 'text', text },
        channel: 'whatsapp',
        timestamp: new Date()
    })
    return { success: !!result, message: result ? "Simulación exitosa" : "Error en simulación" }
}

/**
 * Obtiene el estado de las llamadas para una conversación (Permisos, Horarios, Ventana).
 */
export async function getCallStatus(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 1. Fetch Conversation
    const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('organization_id, connection_id, lead_id')
        .eq('id', conversationId)
        .single()

    if (convError || !conv) return { success: false, error: 'Conversation not found' }

    // 2. Fetch calling config for permission/hours check
    const callingEnabled = true
    const { data: connection } = await supabaseAdmin
        .from('integration_connections')
        .select('working_hours')
        .eq('id', conv.connection_id)
        .single()

    const { CallPermissionManager } = await import('@/lib/meta/calling/call-permission-manager')
    const { CallHoursManager } = await import('@/lib/meta/calling/call-hours-manager')

    const permissionManager = new CallPermissionManager()
    const hoursManager = new CallHoursManager(connection?.working_hours as any)

    // 3. Eval States
    const permResult = await permissionManager.canMakeCall(conversationId)
    const isWithinHours = await hoursManager.isWithinCallHours()
    const isSessionActive = true // Simplified fallback

    return {
        success: true,
        callingEnabled,
        permStatus: {
            hasPermission: permResult.allowed,
            expiresAt: permResult.expiresAt?.toISOString() || null,
            reason: permResult.reason
        },
        isWithinHours,
        isSessionActive
    }
}
