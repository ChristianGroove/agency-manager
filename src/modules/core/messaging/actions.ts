"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { MetaProvider } from "./providers/meta-provider"
import { inboxService } from "./inbox-service"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { createClient } from "@/lib/supabase-server" // Add missing import if needed, assuming implicit or I should add it. Wait, sendMessage uses createClient.

// Ensure env vars are loaded/checked securely in a real app
const META_API_TOKEN = process.env.META_API_TOKEN!
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN!

/**
 * [WARNING] This function has been refactored for "after()" background processing 
 * to solve Inbox lag and persistence. However, the user reports it needs 
 * further THOROUGH REVIEW as it may not be completely solved yet.
 */
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

    // 3. Resolve Provider dynamically
    let provider: any = null;
    const channel = conversation.channel;

    if (channel !== 'whatsapp' && channel !== 'evolution' && channel !== 'messenger' && channel !== 'instagram') {
        throw new Error(`Channel ${channel} not supported for outbound yet`)
    }

    // Try to load connection from DB first (Preferred)
    let connection = null;

    // Strategy A: If conversation has explicit connection_id, USE IT.
    if ((conversation as any).connection_id) {
        console.log(`[sendMessage] Using bound connection_id: ${(conversation as any).connection_id}`);
        const { data: boundConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('id', (conversation as any).connection_id)
            .eq('status', 'active') // ENFORCE ACTIVE STATUS
            .single();

        connection = boundConn;
    }

    // Strategy B: Fallback to finding ANY active connection for channel (Legacy/Default)
    if (!connection) {
        // console.log(`[sendMessage] No bound connection, searching default for channel: ${channel}`);

        // Define possible provider keys for the channel
        let providerKeys: string[] = [];
        if (channel === 'messenger' || channel === 'instagram') {
            providerKeys = ['meta_business', 'meta_messenger', 'meta_instagram'];
        } else if (channel === 'evolution') {
            providerKeys = ['evolution_api'];
        } else {
            // WhatsApp: Try standard 'meta_whatsapp' (new) AND 'whatsapp_cloud' (legacy)
            providerKeys = ['meta_whatsapp', 'whatsapp_cloud'];
        }

        const { data: defaultConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('organization_id', conversation.organization_id)
            .in('provider_key', providerKeys)
            .eq('status', 'active')
            .order('created_at', { ascending: true }) // Pick OLDEST (usually the primary/original)
            .limit(1)
            .single();

        connection = defaultConn;
    }

    if (connection) {
        // use DB connection
        console.log(`[sendMessage] Using DB connection: ${connection.connection_name} (${connection.provider_key})`);
        const creds = connection.credentials as any; // Mock decrypted
        if (connection.provider_key === 'evolution_api') {
            const { EvolutionProvider } = await import("./providers/evolution-provider");
            provider = new EvolutionProvider({
                baseUrl: creds.baseUrl,
                apiKey: creds.apiKey,
                instanceName: creds.instanceName
            });
        } else {
            // Meta from DB (Manual or Mock)
            const { MetaProvider } = await import("./providers/meta-provider");
            if (creds.mock_auth) {
                // Fallback to Env if mock_auth
                provider = new MetaProvider(
                    process.env.META_API_TOKEN!,
                    process.env.META_PHONE_NUMBER_ID!,
                    process.env.META_VERIFY_TOKEN!
                )
            } else {
                // Real Credentials (Manual Flow)
                // Robust parsing if double-serialized
                const { decryptObject } = await import('@/modules/core/integrations/encryption');
                let finalCreds = creds;
                if (typeof creds === 'string') {
                    try { finalCreds = JSON.parse(creds) } catch (e) { }
                }
                finalCreds = decryptObject(finalCreds);

                if (!finalCreds) {
                    console.error("[sendMessage] Credentials decryption failed or empty for connection:", connection.id);
                    throw new Error("Invalid or missing credentials for this connection. Please re-configure.");
                }

                const metadata = (conversation as any).metadata || {};
                // Fix: Also check connection.metadata for legacy 'whatsapp_cloud' connections
                const connMetadata = (connection as any).metadata || {};

                const assetId = finalCreds.phoneNumberId ||
                    finalCreds.phone_number_id ||
                    metadata.phoneNumberId ||
                    metadata.pageId ||
                    metadata.instagramBusinessId ||
                    connMetadata.asset_id; // Added fallback

                const token = finalCreds.accessToken || finalCreds.access_token;

                if (!assetId || !token) {
                    console.error("[sendMessage] Missing AssetID or AccessToken in credentials/metadata:", { assetId, token, channel: (conversation as any).channel });
                    throw new Error("Incomplete credentials. Please re-configure the channel.");
                }

                provider = new MetaProvider(
                    token,
                    assetId,
                    process.env.META_VERIFY_TOKEN!
                )
            }
        }
    } else {
        // STRICT MODE: No Fallback to Env Vars in Production
        // If no DB connection, simply fail.
        throw new Error(`No active connection found for ${channel}. Please configure it in Settings > Integrations.`);
    }

    // 4. Parse Payload
    let content: any = { type: 'text', text: payload };
    try {
        const parsed = JSON.parse(payload);
        if (parsed.type) content = parsed;
    } catch (e) {}

    // 5. Build Provider Options
    const providerOptions: any = {
        to: recipientPhone,
        content: ['interactive_buttons', 'interactive_list', 'interactive_cta', 'interactive_call_request'].includes(content.type)
            ? content
            : {
                type: content.type,
                text: content.text,
                caption: content.caption || content.text,
                mediaUrl: content.url || content.mediaUrl || content.image_url,
                filename: content.filename || content.fileName
            },
        metadata: {
            channel: channel,
            leadId: conversation.lead_id,
            ...content.metadata
        }
    };

    if (channel === 'messenger' || channel === 'instagram') {
        providerOptions.metadata.features = { tag: 'HUMAN_AGENT' };
    }

    // 6. DB Persistence (CRITICAL: Must happen and commit BEFORE returning to prevent "disappearing" messages)
    const sender = user.email || 'Agent'
    const messageId = id || crypto.randomUUID()
    
    console.log('[sendMessage] Persisting message:', { conversationId, messageId })

    const { data: createdMessage, error: dbError } = await supabaseAdmin
        .from('messages')
        .insert({
            id: messageId,
            conversation_id: conversationId,
            organization_id: conversation.organization_id,
            direction: 'outbound',
            channel: channel,
            content: content,
            status: 'sent',
            sender: sender,
            metadata: {
                ...content.metadata,
                timestamp: new Date().toISOString()
            }
        })
        .select('*')
        .single();

    if (dbError) {
        console.error('[sendMessage] DB Insert Error:', dbError);
        return { success: false, error: "Failed to persist message. Please try again." }
    }

    // 7. Usage Check (Blocks if exceeded)
    if (content.type !== 'note') {
        const { assertUsageAllowed } = await import("@/modules/core/billing/usage-limiter");
        await assertUsageAllowed({ organizationId: conversation.organization_id, engine: 'messaging' });

        // 8. BACKGROUND: Send Message via Provider
        after(async () => {
            console.log('[sendMessage] [Background] Starting provider send for:', messageId);
            try {
                const result = await provider.sendMessage(providerOptions)

                if (result.success && result.messageId) {
                    await supabaseAdmin
                        .from('messages')
                        .update({ external_id: result.messageId })
                        .eq('id', messageId);
                    console.log('[sendMessage] [Background] Provider send SUCCESS:', result.messageId);
                } else {
                    await supabaseAdmin
                        .from('messages')
                        .update({ status: 'failed', metadata: { error: result.error } } as any)
                        .eq('id', messageId);
                    console.error('[sendMessage] [Background] Provider send FAILED:', result.error);
                }
            } catch (bgError: any) {
                console.error('[sendMessage] [Background] Exception:', bgError);
                await supabaseAdmin
                    .from('messages')
                    .update({ status: 'failed', metadata: { error: bgError.message } } as any)
                    .eq('id', messageId);
            }
        })
    }

    return { success: true, data: createdMessage }
}

// --- CALLING LOGIC (Meta 2026) ---

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

    // 2. Fetch Connection Config
    const { data: conn } = await supabase
        .from('integration_connections')
        .select('metadata')
        .eq('id', conv.connection_id!)
        .single()
    
    const connMetadata = (conn?.metadata as any) || {}
    const callingEnabled = connMetadata.calling_enabled !== false
    const callingConfig = connMetadata.calling_config // May be null/undefined

    // 3. Load Managers
    const { CallPermissionManager } = await import('@/lib/meta/calling/call-permission-manager')
    const { CallHoursManager } = await import('@/lib/meta/calling/call-hours-manager')
    const { InboxService } = await import('./inbox-service')

    const permissionManager = new CallPermissionManager()
    const hoursManager = new CallHoursManager(callingConfig)
    const inboxSvc = new InboxService()

    // 3. Eval States
    const permResult = await permissionManager.canMakeCall(conversationId)
    const isWithinHours = await hoursManager.isWithinCallHours()
    const isSessionActive = await inboxSvc.hasActiveSessionWindow(conversationId)

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

export async function simulateInboundMessage(fromPhone: string = '555001122', messageText: string = 'Hola, me interesa más información sobre sus servicios.') {
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
                    metadata: { display_phone_number: '15555555555', phone_number_id: '123456' },
                    contacts: [{ profile: { name: 'Demo User' }, wa_id: fromPhone }],
                    messages: [{
                        from: fromPhone,
                        id: `wamid.test_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: { body: messageText }
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

export async function sendOutboundMessage(conversationId: string, content: any, channel: string = 'whatsapp', connectionId?: string) {
    // Wrapper for automation to use the existing logic or simplified logic
    // We need to robustly handle the context where there might not be an active user session (automation)

    // For now, we reuse the logic but we need to bypass the "User Auth" check if it's a system action.
    // However, sendMessage heavily relies on `supabase.auth.getUser()`.
    // Let's create a specialized version for automation that uses supabaseAdmin or skips auth checks.

    const supabase = supabaseAdmin // Use Admin for automation to bypass RLS policies

    // 1. Fetch Conversation
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
            *,
            leads ( phone, name )
        `)
        .eq('id', conversationId)
        .single()

    if (convError || !conversation) {
        return { success: false, error: `Conversation not found: ${convError?.message}` }
    }

    const recipientPhone = conversation.leads?.phone || conversation.phone
    if (!recipientPhone) return { success: false, error: "No recipient phone" }

    // 2. Resolve Connection (Simple Default Strategy for Automation)
    // We assume default connection for the channel
    let provider: any = null
    const providerKeys = (channel === 'messenger' || channel === 'instagram')
        ? ['meta_business', 'meta_messenger', 'meta_instagram']
        : (channel === 'evolution' ? ['evolution_api'] : ['meta_whatsapp', 'whatsapp_cloud']);

    // Try bound connection first
    // Try bound connection first, or explicit override
    let connection: any = null
    const targetConnectionId = connectionId || (conversation as any).connection_id

    if (targetConnectionId) {
        const { data: boundConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('id', targetConnectionId)
            .eq('status', 'active') // ENFORCE ACTIVE STATUS
            .single()
        connection = boundConn
    }

    if (!connection) {
        const { data: defaultConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('organization_id', conversation.organization_id)
            .in('provider_key', providerKeys)
            .eq('status', 'active')
            .order('created_at', { ascending: true }) // Pick OLDEST
            .limit(1)
            .single()
        connection = defaultConn
    }

    // Initialize Provider
    if (connection) {
        const creds = connection.credentials as any
        if (channel === 'evolution') {
            const { EvolutionProvider } = await import("./providers/evolution-provider")
            provider = new EvolutionProvider({
                baseUrl: creds.baseUrl,
                apiKey: creds.apiKey,
                instanceName: creds.instanceName
            })
        } else {
            const { MetaProvider } = await import("./providers/meta-provider")
            if (creds.mock_auth) {
                provider = new MetaProvider(process.env.META_API_TOKEN!, process.env.META_PHONE_NUMBER_ID!, process.env.META_VERIFY_TOKEN!)
            } else {
                const { decryptObject } = await import('@/modules/core/integrations/encryption');
                let finalCreds = creds;
                if (typeof creds === 'string') {
                    try { finalCreds = JSON.parse(creds) } catch (e) { }
                }
                finalCreds = decryptObject(finalCreds);

                const metadata = (conversation as any).metadata || {};
                const pId = finalCreds.phoneNumberId ||
                    finalCreds.phone_number_id ||
                    metadata.phoneNumberId ||
                    metadata.pageId ||
                    metadata.instagramBusinessId;

                const token = finalCreds.accessToken || finalCreds.access_token;

                if (!pId || !token) {
                    console.error("[sendOutboundMessage] Missing AssetID or Token:", { pId, token: !!token });
                    // Fallback to env if allowed? No, we stick to DB strictness here or simple env fallback below
                }

                provider = new MetaProvider(token, pId, process.env.META_VERIFY_TOKEN!)
            }
        }
    } else {
        // STRICT MODE: No Fallback to Env Vars
        return { success: false, error: "No connection configuration found. Please enable the integration." }
    }

    // 3. Normalize Content & Send
    // Content is already an object (ButtonsNode passes object)
    const providerOptions: any = {
        to: recipientPhone,
        content: {
            type: content.type, // Remove incorrect 'document' -> 'image' mapping
            text: content.text || content.body || content.caption,
            caption: content.caption || content.text || content.body, // EXPLICITLY pass caption for media
            mediaUrl: content.url || content.mediaUrl,
            filename: content.filename, // Ensure filename is passed for documents
            // For interactive messages (buttons-node passes these)
            buttons: content.buttons,
            sections: content.sections,
            buttonText: content.buttonText,
            header: content.header,
            footer: content.footer
        }
    }

    // Special handling for interactive types in MetaProvider
    if (['interactive_buttons', 'interactive_list', 'interactive_cta'].includes(content.type)) {
        providerOptions.content = content // Pass the full structured object for MetaProvider to handle
    }

    try {
        const result = await provider.sendMessage(providerOptions)
        if (!result.success) throw new Error(result.error)

        // 4. Save to DB (As System/Bot)
        const senderId = 'System'
        const messageId = result.messageId || `auto_${Date.now()}`

        await inboxService.saveOutboundMessage(
            conversationId,
            content, // Save structured content
            messageId,
            senderId,
            undefined,
            channel
        )

        // 5. Sync Conversation Markers (Session Logic)
        // CRITICAL: This prevents the bot from looping on the same session
        const lastMessageText = typeof content === 'string' ? content : (content.text || content.body || 'Nuevo mensaje del bot');

        await supabase
            .from('conversations')
            .update({
                last_auto_reply_at: new Date().toISOString(),
                last_message: lastMessageText,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'open' // Re-open if it was closed
            })
            .eq('id', conversationId);

        return { success: true, externalId: messageId }

    } catch (e: any) {
        console.error('[sendOutboundMessage] Error:', e)
        return { success: false, error: e.message }
    }
}


export async function getMessages(conversationId: string) {
    const supabase = await createClient()
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Failed to fetch messages:", error)
        return []
    }

    return messages
}
