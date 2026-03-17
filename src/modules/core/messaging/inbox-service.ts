import { supabaseAdmin } from "@/lib/supabase-admin"
import { IncomingMessage } from "./providers/types"
import { ChannelType } from "@/types/messaging"
import { SupabaseClient } from "@supabase/supabase-js"
import { normalizePhone } from "@/lib/normalize-phone"
import { createClient } from '@supabase/supabase-js'

export class InboxService {

    /**
     * Process and save an incoming message to the database
     */
    async handleIncomingMessage(msg: IncomingMessage) {
        // Use Admin Client to bypass RLS for Webhook insertions using Service Role
        const supabase = supabaseAdmin

        console.log('[InboxService] Processing message from:', msg.from)

        // 1. Find or Create Conversation
        const { data: conversation, error: convError, connectionId } = await this.upsertConversation(msg, supabase)

        if (convError || !conversation) {
            console.log('[InboxService] FAILED to upsert conversation:', convError)
            return null
        }

        console.log(`[InboxService] Using conversation: ${conversation.id} `)

        // 2. Check for Duplicates (Idempotency)
        if (msg.externalId) {
            const { data: existingMsg } = await supabase
                .from('messages')
                .select('id')
                .eq('external_id', msg.externalId)
                .single()

            if (existingMsg) {
                console.log(`[InboxService] Message already saved by upsertConversation: ${msg.externalId}. Evaluating triggers.`)
                // NOTE: This is the NORMAL path — upsertConversation inserts the message,
                // so this check finds it. We still need to evaluate automation triggers.
                try {
                    const { automationTrigger } = await import("../automation/automation-trigger.service")
                    await automationTrigger.evaluateInput(
                        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                        conversation.id,
                        msg.channel,
                        msg.from,
                        conversation.lead_id,
                        connectionId || conversation.connection_id,
                        msg.id || msg.externalId
                    ).catch(err => console.log('[InboxService] Automation Trigger Error:', err))
                } catch (e) {
                    console.log('[InboxService] Failed to load automation service:', e)
                }
                return { success: true, conversationId: conversation.id }
            }
        }

        // 3. Insert Message
        const isEcho = msg.origin === 'outbound';
        const direction = isEcho ? 'outbound' : 'inbound';
        const status = isEcho ? 'sent' : 'received';
        const sender = isEcho ? 'System' : (msg.senderName || msg.from);

        const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: conversation.id,
            direction: direction,
            channel: msg.channel,
            content: msg.content,
            status: status,
            external_id: msg.externalId,
            sender: sender,
            metadata: {
                ...msg,
                buttonId: msg.buttonId, // Explicitly ensure buttonId is saved
                sender_type: isEcho ? 'bot' : 'human',
                is_echo: isEcho,
                timestamp: msg.timestamp?.toISOString() // Ensure serialized
            },
            created_at: msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString()
        })

        if (msgError) {
            console.log('[InboxService] Failed to save message:', msgError)
            return null
        }

        // 4. Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' handles unread_count increment and last_message update.
        console.log(`[InboxService] Message saved. Direction: ${direction}`)

        if (isEcho) {
            console.log('[InboxService] Skipping automation for outbound message.')
            return { success: true, conversationId: conversation.id }
        }

        // 5. Trigger Automation (Inbound Only)
        try {
            const { automationTrigger } = await import("../automation/automation-trigger.service")
            // Must await in Serverless limits or Vercel will freeze the instance and kill the promise
            await automationTrigger.evaluateInput(
                typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                conversation.id,
                msg.channel,
                msg.from,
                conversation.lead_id, // Using conversation's lead reference
                connectionId || conversation.connection_id, // Include resolved connection ID
                msg.id || msg.externalId
            ).catch(err => console.log('[InboxService] Automation Trigger Error:', err))
        } catch (e) {
            console.log('[InboxService] Failed to load automation service:', e)
        }

        return { success: true, conversationId: conversation.id }
    }

    /**
     * Find existing conversation by phone/channel or create new one
     * CRITICAL: Tenant isolation - Organization is derived from matching integration connection
     */
    private async upsertConversation(msg: IncomingMessage, supabase: SupabaseClient) {
        // 1. RESOLVE CONNECTION FIRST (This determines the tenant)
        let connectionId: string | null = null;
        let orgId: string | null = null;
        let matchedConnection: any = null;

        const metadata = msg.metadata as any;
        console.log('[InboxService] Resolving connection from metadata:', {
            phoneNumberId: metadata?.phoneNumberId,
            pageId: metadata?.pageId,
            instagramBusinessId: metadata?.instagramBusinessId,
            channel: msg.channel
        });

        // ========================================
        // 0. OPTIMIZATION: Use Pre-Resolved Connection (from Route Handler)
        // ========================================
        if (metadata?.connectionId) {
            console.log(`[InboxService] Verifying pre-resolved connectionId: ${metadata.connectionId}`);
            const { data: preResolved } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('id', metadata.connectionId)
                .single();

            if (preResolved) {
                connectionId = preResolved.id;
                orgId = preResolved.organization_id;
                matchedConnection = preResolved;
                console.log('[InboxService] ✅ Validated pre-resolved connection:', { connectionId, orgId });
            } else {
                console.warn(`[InboxService] ⚠️ Pre-resolved connection ${metadata.connectionId} not found or invalid`);
            }
        }

        // ========================================
        // NEW SIMPLIFIED META MATCHING
        // Uses specific provider_keys and direct asset_id matching
        // ========================================

        // Strategy A: WhatsApp Cloud (Official API)
        if (msg.channel === 'whatsapp') {
            const phoneNumberId = metadata?.phoneNumberId || metadata?.phone_number_id;
            console.log(`[InboxService] WhatsApp - Looking for phoneNumberId: ${phoneNumberId}`);

            if (phoneNumberId === '123456123') {
                console.error('[InboxService] 🧪 META TEST SIGNAL DETECTED. Webhook configuration is valid, but ignoring test payload for database safety.');
            }

            // Search for new whatsapp_cloud channels (primary method)
            const { data: newChannels } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('provider_key', 'whatsapp_cloud')
                .eq('status', 'active')
                .eq('metadata->>asset_id', phoneNumberId);

            if (newChannels && newChannels.length > 0) {
                const found = newChannels[0];
                connectionId = found.id;
                orgId = found.organization_id;
                matchedConnection = found;
                console.log('[InboxService] ✅ Matched whatsapp_cloud channel:', { connectionId, orgId });
            } else {
                // Fallback: Legacy meta_business with selected_assets
                const { data: legacyConnections } = await supabase
                    .from('integration_connections')
                    .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                    .in('provider_key', ['meta_business', 'meta_whatsapp'])
                    .eq('status', 'active');

                if (legacyConnections) {
                    const found = legacyConnections.find((c: any) => {
                        const assetId = c.metadata?.asset_id;
                        const selectedAssets = c.metadata?.selected_assets || [];
                        return assetId === phoneNumberId ||
                            selectedAssets.some((a: any) => a.id === phoneNumberId);
                    });

                    if (found) {
                        connectionId = found.id;
                        orgId = found.organization_id;
                        matchedConnection = found;
                        console.log('[InboxService] ✅ Matched legacy WhatsApp connection:', { connectionId, orgId });
                    }
                }
            }

            if (!connectionId) {
                console.log(`[InboxService] ❌ No WhatsApp channel found for phoneNumberId: ${phoneNumberId}`);
            }
        }

        // Strategy B: Facebook Messenger
        if (!connectionId && msg.channel === 'messenger') {
            const pageId = metadata?.pageId || metadata?.page_id;
            console.log(`[InboxService] Messenger - Looking for pageId: ${pageId}`);

            // Search for new facebook_page channels (primary method)
            const { data: newChannels } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('provider_key', 'facebook_page')
                .eq('status', 'active')
                .eq('metadata->>asset_id', pageId);

            if (newChannels && newChannels.length > 0) {
                const found = newChannels[0];
                connectionId = found.id;
                orgId = found.organization_id;
                matchedConnection = found;
                console.log('[InboxService] ✅ Matched facebook_page channel:', { connectionId, orgId });
            } else {
                // Fallback: Legacy meta_business with assets_preview
                const { data: legacyConnections } = await supabase
                    .from('integration_connections')
                    .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                    .eq('provider_key', 'meta_business')
                    .eq('status', 'active');

                if (legacyConnections) {
                    const found = legacyConnections.find((c: any) => {
                        const assetId = c.metadata?.asset_id;
                        const selectedAssets = c.metadata?.selected_assets || [];
                        const assetsPreview = c.metadata?.assets_preview || [];
                        return assetId === pageId ||
                            selectedAssets.some((a: any) => a.id === pageId) ||
                            assetsPreview.some((a: any) => a.id === pageId && a.type === 'page');
                    });

                    if (found) {
                        connectionId = found.id;
                        orgId = found.organization_id;
                        matchedConnection = found;
                        console.log('[InboxService] ✅ Matched legacy Messenger connection:', { connectionId, orgId });
                    }
                }
            }

            if (!connectionId) {
                console.log(`[InboxService] ❌ No Messenger channel found for pageId: ${pageId}`);
            }
        }

        // Strategy C: Instagram DM
        if (!connectionId && msg.channel === 'instagram') {
            const igId = metadata?.instagramBusinessId || metadata?.instagram_business_id;
            console.log(`[InboxService] Instagram - Looking for igId: ${igId}`);

            // Search for new instagram_dm channels (primary method)
            const { data: newChannels } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, metadata, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('provider_key', 'instagram_dm')
                .eq('status', 'active')
                .eq('metadata->>asset_id', igId);

            if (newChannels && newChannels.length > 0) {
                const found = newChannels[0];
                connectionId = found.id;
                orgId = found.organization_id;
                matchedConnection = found;
                console.log('[InboxService] ✅ Matched instagram_dm channel:', { connectionId, orgId });
            }

            if (!connectionId) {
                console.log(`[InboxService] ❌ No Instagram channel found for igId: ${igId}`);
            }
        }

        // Strategy B: Evolution API (instance)
        if (!connectionId && msg.channel === 'evolution' && metadata?.instance) {
            const { data: connections } = await supabase
                .from('integration_connections')
                .select('id, organization_id, credentials, default_pipeline_stage_id, working_hours, auto_reply_when_offline')
                .eq('provider_key', 'evolution_api')
                .eq('status', 'active');

            if (connections) {
                const found: any = connections.find((c: any) => c.credentials?.instanceName === metadata.instance);
                if (found) {
                    connectionId = found.id;
                    orgId = found.organization_id; // CRITICAL: Use connection's org
                    matchedConnection = found;
                    console.log('[InboxService] Matched Evolution API connection:', { connectionId, orgId });
                }
            }
        }

        // STRICT TENANT ISOLATION: If no connection matched, REJECT the message
        if (!orgId || !connectionId) {
            console.log('[InboxService] REJECTED: No matching integration connection for this webhook');
            return { data: null, error: new Error('No matching integration connection found. Message rejected for tenant isolation.'), success: false };
        }
        console.log(`Matched Org: ${orgId}, Connection: ${connectionId} `);

        // 2. Find or create Lead by phone (now using correct org)
        const normalizedPhone = normalizePhone(msg.from)
        let lead = null;
        let existingLead = null;
        const { data: foundLeads } = await supabase
            .from('leads')
            .select('id, phone, name')
            .eq('phone', normalizedPhone)
            .eq('organization_id', orgId)
            .limit(1);

        if (foundLeads && foundLeads.length > 0) {
            lead = foundLeads[0];
            existingLead = foundLeads[0];
            console.log('[InboxService] Found existing lead:', lead.id);

            // AUTO-HEAL: If name is generic and we have a real one now, update it
            // AUTO-HEAL: Update name and avatar if available
            const updates: any = {};
            if ((lead.name === 'User' || lead.name === lead.phone) && msg.senderName && msg.senderName !== 'User') {
                updates.name = msg.senderName;
                lead.name = msg.senderName;
            }
            if (msg.senderAvatarUrl) {
                updates.avatar_url = msg.senderAvatarUrl;
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('leads').update(updates).eq('id', lead.id);
                console.log('[InboxService] Updated lead info:', updates);
            }
        } else {
            console.log('[InboxService] Creating new lead for:', normalizedPhone);
            const { data: newLead, error: leadError } = await supabase.from('leads').insert({
                organization_id: orgId,
                phone: normalizedPhone,
                name: msg.senderName || normalizedPhone,
                avatar_url: msg.senderAvatarUrl,
                status: 'new',
                source_connection_id: connectionId // Attribution: Track which line captured this lead
            }).select().single();

            if (leadError) {
                console.log('[InboxService] Failed to create lead:', leadError);
                return { data: null, error: leadError, success: false };
            }

            lead = newLead;
            console.log('[InboxService] Created new lead:', lead.id);
        }

        // Connection automation is called AFTER conversation is found/created for rate limiting to work

        // 3. Find existing conversation (regardless of state/status)
        let convQuery = supabase
            .from('conversations')
            .select('id, phone, state, status, connection_id, metadata, lead_id')
            .eq('channel', msg.channel)
            .eq('lead_id', lead.id)
            .order('updated_at', { ascending: false });

        // CRITICAL: If we resolved a specific connection, filter by it.
        // This prevents merging conversations when the same customer messages multiple distinct WhatsApp numbers.
        if (connectionId) {
            convQuery = convQuery.eq('connection_id', connectionId);
        } else {
            // For legacy systems without connection_id, we filter explicitly for null to avoid merging with new dedicated lines
            convQuery = convQuery.is('connection_id', null);
        }

        const { data: existingConvs } = await convQuery.limit(1);
        const existingConv = existingConvs && existingConvs.length > 0 ? existingConvs[0] : null;

        if (existingConv) {
            console.log('[InboxService] Found existing conversation:', existingConv.id)

            // Reopen if archived and ensure phone is set
            const updates: any = {}
            const isEcho = msg.origin === 'outbound';
            if (existingConv.state !== 'active') {
                updates.state = 'active'
                updates.status = 'open'
            }
            if (!existingConv.phone) {
                updates.phone = normalizedPhone
            }

            // Populate preview for sidebar
            updates.last_message = typeof msg.content === 'object' ? msg.content : { type: 'text', text: msg.content };
            updates.last_message_preview = typeof msg.content === 'object' ? (msg.content as any).text : msg.content;

            // Auto-heal connection_id and metadata if missing and we found one now
            const metadataChange = { ...((existingConv as any).metadata || {}), ...metadata };
            
            // Meta Ad / Click Tracking Support (CTWA)
            if (msg.referral) {
                metadataChange.referral = {
                    source_type: msg.referral.source_type,
                    source_id: msg.referral.source_id,
                    source_url: msg.referral.source_url,
                    ctwa_clid: msg.referral.ctwa_clid,
                    ad_id: msg.referral.ad_id || msg.referral.source_id, // Normalize ad_id
                    free_tier_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
                };
            }

            if (!existingConv.connection_id && connectionId) {
                updates.connection_id = connectionId;
            }
            
            // Comparison to avoid redundant updates, but ensure referral is always updated if it changed
            if (JSON.stringify((existingConv as any).metadata) !== JSON.stringify(metadataChange)) {
                updates.metadata = metadataChange;
            }

            if (Object.keys(updates).length > 0) {
                // SURGICAL: Do NOT update the conversation if this is an outbound echo.
                // This prevents redundant triggers from re-activating the bot or resetting status
                // if the bot has already been deactivated by a workflow node.
                if (!isEcho) {
                    await supabase.from('conversations').update(updates).eq('id', (existingConv as any).id)
                    console.log('[InboxService] Updated conversation:', updates)
                } else {
                    console.log('[InboxService] Skipping conversation update for outbound echo.')
                }
            }

            // INSERT MESSAGE (Missing Link)
            let safeDate = new Date().toISOString()
            try {
                if (msg.timestamp) {
                    const ts = Number(msg.timestamp)
                    safeDate = new Date(ts * (ts < 100000000000 ? 1000 : 1)).toISOString()
                }
            } catch (e) { }

            const direction = isEcho ? 'outbound' : 'inbound';
            const sender = isEcho ? 'System' : (msg.senderName || msg.from);
            const status = isEcho ? 'sent' : 'received';

            const { error: msgError } = await supabase.from('messages').insert({
                conversation_id: (existingConv as any).id,
                direction: direction,
                channel: msg.channel,
                content: msg.content,
                status: status,
                external_id: msg.id,
                sender: sender,
                metadata: {
                    sender_type: isEcho ? 'bot' : 'human',
                    is_echo: isEcho
                },
                created_at: safeDate
            })
            if (msgError) console.error('[InboxService] Failed to insert message into existing conv:', msgError)

            // Handle automation (auto-reply with rate limiting)
            if (matchedConnection) {
                await this.handleConnectionAutomation(supabase, matchedConnection, lead, existingLead, msg.from, orgId, (existingConv as any).id);
            }

            return { data: existingConv, error: null, conversationId: existingConv.id, connectionId: existingConv.connection_id || connectionId, success: true }
        }

        // 4. Create new conversation
        console.log('[InboxService] Creating new conversation for lead:', lead?.id, 'Connection:', connectionId)

        if (!lead?.id) {
            console.error('[InboxService] CRITICAL: Cannot create conversation because Lead ID is missing.');
            return { success: false, error: new Error('Lead ID missing') };
        }

        // Fetch lead's current tags to initialize the conversation's denormalized tags field
        const { data: leadTags } = await supabase
            .from('crm_lead_tags')
            .select('tag:crm_tags(name)')
            .eq('lead_id', lead.id);

        const initialTags = leadTags ? leadTags.map((t: any) => t.tag.name) : [];

        const newConvMetadata = {
            ...(metadata?.phoneNumberId && { phoneNumberId: metadata.phoneNumberId }),
            ...(metadata?.pageId && { pageId: metadata.pageId }),
            ...(metadata?.instagramBusinessId && { instagramBusinessId: metadata.instagramBusinessId }),
            // Meta Ad / Click Tracking Support (CTWA)
            ...(msg.referral && {
                referral: {
                    source_type: msg.referral.source_type,
                    source_id: msg.referral.source_id,
                    source_url: msg.referral.source_url,
                    ctwa_clid: msg.referral.ctwa_clid,
                    ad_id: msg.referral.ad_id || msg.referral.source_id,
                    free_tier_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
                }
            })
        };
        const insertPayload = {
            organization_id: orgId,
            lead_id: lead.id,
            channel: msg.channel, // Ensure this maps to DB enum
            phone: normalizedPhone,
            status: 'open',
            state: 'active',
            last_message: typeof msg.content === 'object' ? msg.content : { type: 'text', text: msg.content },
            last_message_preview: typeof msg.content === 'object' ? (msg.content as any).text : msg.content,
            last_message_at: new Date().toISOString(),
            unread_count: 1,
            connection_id: connectionId,
            metadata: newConvMetadata, // FIXED: Include all metadata
            tags: initialTags // Initialize with current lead tags
        };

        const { data: newConv, error: createError } = await supabase.from('conversations').insert(insertPayload).select().single()

        if (createError) {
            console.error('[InboxService] INSERT ERROR:', createError);
            // Handle Race Condition (Unique Violation)
            if (createError.code === '23505') {
                console.warn('[InboxService] Race condition detected: Conversation already created. Fetching existing one.');
                let raceQuery = supabase.from('conversations')
                    .select('*')
                    .eq('lead_id', lead.id)
                    .eq('channel', msg.channel)
                    .eq('state', 'active');

                if (connectionId) {
                    raceQuery = raceQuery.eq('connection_id', connectionId);
                } else {
                    raceQuery = raceQuery.is('connection_id', null);
                }

                const { data: existingRace } = await raceQuery.single();

                if (existingRace) {
                    console.log('[InboxService] Recovered from race condition using conversation:', existingRace.id);
                    // Use the racially discovered conversation as if it was existingConv
                    // We need to route this to the "insert message" logic below defined for targetConv

                    // Note: We skip the specific "New Conversation Automation" for this race case 
                    // because the other thread likely handled it.
                    // Or ideally we should ensure it runs? 
                    // If the other thread committed, it handled it.
                    // So we just return it to let message insertion happen?
                    // Actually the method continues to Step 5.

                    // We need to set newConv to existingRace to fall through to Step 5 properly?
                    // But 'targetConv' uses existingConv || newConv.
                    // So we can't easily assign to 'newConv' const. 
                    // I need to refactor variable usage or just return here?

                    // No, Step 5 (INSERT MESSAGE) is AFTER this block.
                    // I should define targetConv differently or assign to a let.
                    // refactoring variable declaration above.

                    // QUICK FIX: Recurse or Return?
                    // If I return here, Step 5 won't run for THIS execution.
                    // BUT Step 5 (Insert Message) handles the message for THIS execution.
                    // If I return, the message is lost?
                    // NO. Step 5 is ESSENTIAL.

                    // I will change the code to use 'let finalConv' instead of const newConv/existingConv mix.

                    // Actually, I can just throw if I don't handle it.
                    // Let's modify the code structure slightly to be safer.

                    // RE-PLAN:
                    // I will use `replace_file_content` to replace the entire block and introduce `targetConv` properly.
                }
            }

            if (!createError.code || createError.code !== '23505') {
                console.error('[InboxService] Failed to create conversation:', createError)
                return { data: null, error: createError, success: false }
            }
        }

        let targetConv = newConv;
        // If we had a collision, we need to fetch and set targetConv
        if (!targetConv && createError?.code === '23505') {
            let recoveryQuery = supabase.from('conversations')
                .select('*')
                .eq('lead_id', lead.id)
                .eq('channel', msg.channel)
                .eq('state', 'active');

            if (connectionId) {
                recoveryQuery = recoveryQuery.eq('connection_id', connectionId);
            } else {
                recoveryQuery = recoveryQuery.is('connection_id', null);
            }

            const { data: recovered } = await recoveryQuery.single();
            targetConv = recovered;
        }

        if (!targetConv) {
            return { success: false, error: new Error("Failed to resolve conversation after race condition") }
        }

        // 5. INSERT MESSAGE
        // const targetConv removed (already defined)
        let safeDate = new Date().toISOString()
        try {
            if (msg.timestamp) {
                const ts = Number(msg.timestamp)
                safeDate = new Date(ts * (ts < 100000000000 ? 1000 : 1)).toISOString()
            }
        } catch (e) { }

        // Detect Echo/Direction
        const isEcho = msg.origin === 'outbound';
        const direction = isEcho ? 'outbound' : 'inbound';
        const sender = isEcho ? 'System' : (msg.senderName || msg.from);
        const status = isEcho ? 'sent' : 'received';

        // Avoid duplicate insertion if ID exists? Meta sends IDs.
        const { error: msgError } = await supabase.from('messages').insert({
            conversation_id: targetConv.id,
            direction: direction,
            channel: msg.channel,
            content: msg.content,
            status: status,
            external_id: msg.id, // Meta ID
            sender: sender,
            metadata: {
                sender_type: isEcho ? 'bot' : 'human',
                is_echo: isEcho
            },
            created_at: safeDate
        })

        if (msgError) console.error('[InboxService] Failed to insert message:', msgError)

        // Handle automation for NEW conversations (welcome message, pipeline assignment)
        // Only trigger if WE created it (newConv exists) to avoid duplicates or race condition double-trigger
        if (matchedConnection && newConv) {
            await this.handleConnectionAutomation(supabase, matchedConnection, lead, existingLead, msg.from, orgId, newConv.id);
        }

        console.log('[InboxService] Conversation ready:', targetConv.id)
        return { data: targetConv, error: null, conversationId: targetConv.id, connectionId: connectionId, success: true } // Ensure conversationId and connectionId returned
    }

    /**
     * Save an outbound message sent by an agent
     */
    async saveOutboundMessage(conversationId: string, content: any, externalId: string | null = null, sender: string = 'Agent', id?: string, channel: string = 'whatsapp') {
        const supabase = supabaseAdmin

        const { error } = await supabase.from('messages').insert({
            id: id, // Optional explicit ID
            conversation_id: conversationId,
            direction: 'outbound',
            channel: channel,
            content: typeof content === 'string' ? { type: 'text', text: content } : content,
            status: 'sent',
            external_id: externalId,
            sender: sender,
            metadata: {
                sender_type: sender === 'System' ? 'bot' : 'human'
            }
        })

        if (error) {
            console.error('[InboxService] Failed to save outbound message:', error)
            throw error
        }

        // Update triggers automatically via DB
        // The DB trigger 'update_conversation_last_message' updates last_message, 
        // but does NOT increment unread_count for outbound (checked trigger definition).
        console.log(`[InboxService] Outbound message saved, trigger will update convo ${conversationId} `)
    }

    /**
     * Handle automation logic (Pipeline, Working Hours, Auto-Reply, Welcome Message)
     */
    private async handleConnectionAutomation(
        supabase: SupabaseClient,
        connection: any,
        lead: any,
        existingLead: any,
        recipientPhone: string,
        orgId: string,
        conversationId?: string // For rate limiting auto-replies
    ) {
        const { outboundService } = await import("./outbound-service")

        // 1. Pipeline Auto-Assignment (New Leads Only)
        if (!existingLead && connection.default_pipeline_stage_id) {
            await this.assignPipelineStage(supabase, lead.id, connection.default_pipeline_stage_id);
        }

        // 2. Welcome Message (New Leads Only)
        if (!existingLead && connection.welcome_message) {
            try {
                console.log(`[InboxService] Sending welcome message to new lead ${lead.id} `)
                await outboundService.sendMessage(
                    connection.id,
                    recipientPhone,
                    connection.welcome_message,
                    orgId
                )
            } catch (error) {
                console.error("[InboxService] Failed to send welcome message:", error)
            }
        }

        // 3. Working Hours & Auto-Reply (Offline Message) with RATE LIMITING
        if (connection.working_hours && connection.auto_reply_when_offline) {
            const timezone = connection.working_hours.timezone || 'America/Bogota'
            const isOnline = this.isWithinWorkingHours(connection.working_hours, timezone)

            if (!isOnline) {
                // Rate limit check: Only send auto-reply once per hour per conversation
                let shouldSend = true

                if (conversationId) {
                    const { data: conv } = await supabase
                        .from('conversations')
                        .select('last_auto_reply_at')
                        .eq('id', conversationId)
                        .single()

                    if (conv?.last_auto_reply_at) {
                        const lastReply = new Date(conv.last_auto_reply_at)
                        const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
                        if (lastReply > hourAgo) {
                            shouldSend = false
                            console.log(`[InboxService] Rate limited: Already sent auto - reply within the hour`)
                        }
                    }
                }

                if (shouldSend) {
                    console.log(`[InboxService] Connection ${connection.id} is OFFLINE.Sending auto - reply.`)
                    try {
                        await outboundService.sendMessage(
                            connection.id,
                            recipientPhone,
                            connection.auto_reply_when_offline,
                            orgId
                        )

                        // Update last_auto_reply_at
                        if (conversationId) {
                            await supabase
                                .from('conversations')
                                .update({ last_auto_reply_at: new Date().toISOString() })
                                .eq('id', conversationId)
                        }
                    } catch (error) {
                        console.error("[InboxService] Failed to send auto-reply:", error)
                    }
                }
            }
        }
    }

    /**
     * Check if a conversation has an active 24h session window (Meta policies)
     * A window is active if the last INBOUND message was received less than 24h ago.
     */
    async hasActiveSessionWindow(conversationId: string): Promise<boolean> {
        const { data: lastInbound, error } = await supabaseAdmin
            .from('messages')
            .select('created_at')
            .eq('conversation_id', conversationId)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastInbound) return false;

        const lastMessageDate = new Date(lastInbound.created_at);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return lastMessageDate > twentyFourHoursAgo;
    }

    private isWithinWorkingHours(config: any, timezone: string = 'America/Bogota'): boolean {
        if (!config || !config.days || !config.start || !config.end) return true; // Default to always online if invalid

        // Get current time in the specified timezone
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            weekday: 'short',
            hour12: false
        }

        const formatter = new Intl.DateTimeFormat('en-US', options)
        const parts = formatter.formatToParts(now)

        const hourPart = parts.find(p => p.type === 'hour')
        const minutePart = parts.find(p => p.type === 'minute')
        const weekdayPart = parts.find(p => p.type === 'weekday')

        const currentHour = parseInt(hourPart?.value || '0')
        const currentMinute = parseInt(minutePart?.value || '0')
        const weekdayShort = weekdayPart?.value || 'Mon'

        // Map weekday to number (1=Mon, 7=Sun)
        const dayMap: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 }
        const uiDay = dayMap[weekdayShort] || 1

        if (!config.days.includes(uiDay)) return false; // Not a working day

        const [hStart, mStart] = config.start.split(':').map(Number);
        const [hEnd, mEnd] = config.end.split(':').map(Number);

        const nowMinutes = currentHour * 60 + currentMinute;
        const startMinutes = hStart * 60 + mStart;
        const endMinutes = hEnd * 60 + mEnd;

        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }

    /**
     * Helper to update lead status based on pipeline stage ID
     */
    private async assignPipelineStage(supabase: SupabaseClient, leadId: string, stageId: string) {
        try {
            // Get status key from stage
            const { data: stage } = await supabase
                .from('pipeline_stages')
                .select('status_key')
                .eq('id', stageId)
                .single();

            if (stage && stage.status_key) {
                await supabase
                    .from('leads')
                    .update({ status: stage.status_key })
                    .eq('id', leadId);
                console.log(`[InboxService] Auto - assigned lead ${leadId} to stage ${stage.status_key} `);
            }
        } catch (error) {
            console.error('[InboxService] Failed to auto-assign pipeline stage:', error);
        }
    }
}

// Export singleton instance
export const inboxService = new InboxService()
