"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { MetaProvider } from "./providers/meta-provider"
import { inboxService } from "./inbox-service"

// Ensure env vars are loaded/checked securely in a real app
const META_API_TOKEN = process.env.META_API_TOKEN!
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!

export async function sendMessage(conversationId: string, payload: string, id?: string) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error("Unauthorized")
    }

    // 2. Fetch Conversation & Details to get Recipient
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
            *,
            leads (
                phone,
                name
            )
        `)
        .eq('id', conversationId)
        .single()

    console.log('[sendMessage] Query result:', {
        conversationId,
        found: !!conversation,
        error: convError,
        leadPhone: conversation?.leads?.phone
    })

    if (convError || !conversation) {
        console.error('[sendMessage] Conversation lookup failed:', {
            conversationId,
            error: convError?.message,
            code: convError?.code,
            details: convError?.details
        })
        throw new Error(`Conversation not found: ${conversationId}`)
    }

    // Resolve Recipient Phone
    // Try lead phone first, fallback to conversation phone
    const recipientPhone = conversation.leads?.phone || conversation.phone

    console.log('[sendMessage] Recipient phone:', {
        leadPhone: conversation.leads?.phone,
        conversationPhone: conversation.phone,
        finalPhone: recipientPhone
    })

    if (!recipientPhone) {
        throw new Error("Target contact has no phone number")
    }

    // 3. Instantiate Provider
    if (conversation.channel !== 'whatsapp') {
        throw new Error(`Channel ${conversation.channel} not supported for outbound yet`)
    }

    // Ensure we have a token
    const token = process.env.META_API_TOKEN;
    if (!token || !token.startsWith('EAA')) {
        console.warn('[sendMessage] WARNING: META_API_TOKEN seems invalid or missing (does not start with EAA). Check .env.local');
    }

    const provider = new MetaProvider(
        META_API_TOKEN,
        META_PHONE_NUMBER_ID,
        META_VERIFY_TOKEN
    )

    // 4. Parse Payload
    let content: any = { type: 'text', text: payload };
    try {
        const parsed = JSON.parse(payload);
        if (parsed.type && (parsed.text || parsed.url || parsed.mediaUrl)) {
            content = parsed;
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }

    // Normalize for Provider
    const providerOptions: any = {
        to: recipientPhone,
        content: {
            type: content.type === 'document' ? 'image' : content.type, // Map doc to image or text for now if provider limited, but types.ts allows image
            text: content.text || content.caption,
            mediaUrl: content.url || content.mediaUrl
        }
    }

    if (content.type === 'image' || content.type === 'video' || content.type === 'audio') {
        providerOptions.content.type = 'image'; // MetaProvider currently only has explicit support for text/image/template in buildPayload. 
        // We might need to extend MetaProvider for video/audio, but for now map to image or just rely on it handling 'image' type structure if generic
    }

    // 5. Send Message via Provider
    try {
        const result = await provider.sendMessage(providerOptions)

        if (!result.success) {
            throw new Error(result.error || "Failed to send message")
        }

        // 6. Save to Database
        // Use user email or 'Agent' as sender
        const senderId = user.email || 'Agent'
        await inboxService.saveOutboundMessage(
            conversationId,
            content,
            result.messageId,
            senderId,
            id // Pass explicit ID
        )

        revalidatePath('/inbox')
        return { success: true }

    } catch (e: any) {
        console.error("SendMessage Error:", e)
        return { success: false, error: e.message }
    }
}

export async function markConversationAsRead(conversationId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)

    if (error) {
        console.error("Failed to mark as read:", error)
        return { success: false }
    }

    revalidatePath('/inbox')
    return { success: true }
}

export async function simulateInboundMessage(fromPhone: string = '555001122') {
    // Dynamically import to avoid circular dependency issues at top level if any
    const { webhookManager } = await import('./webhook-handler')
    const { MetaProvider } = await import('./providers/meta-provider')

    // Ensure the provider is registered for this simulation context
    // In a real webhook request, this is done by the route handler
    // But server actions run in isolation
    const metaProvider = new MetaProvider(
        process.env.META_API_TOKEN!,
        process.env.META_PHONE_NUMBER_ID!,
        process.env.META_VERIFY_TOKEN!
    )
    webhookManager.registerProvider('whatsapp', metaProvider)

    // Create a mock Meta WhatsApp Payload
    // This structure matches what Meta sends, which our MetaProvider parses
    const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: '109283742',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '1555555555', phone_number_id: '123456' },
                    contacts: [{ profile: { name: 'Demo User' }, wa_id: fromPhone }],
                    messages: [{
                        from: fromPhone,
                        id: `wamid.test_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: { body: 'Hola, me interesa más información sobre sus servicios.' }
                    }]
                },
                field: 'messages'
            }]
        }]
    }

    try {
        // We use handleParsed to bypass signature validation for internal simulation
        const result = await webhookManager.handleParsed('whatsapp', mockPayload)

        revalidatePath('/inbox')
        return result
    } catch (error: any) {
        console.error('Simulation Failed:', error)
        return { success: false, message: error.message }
    }
}
