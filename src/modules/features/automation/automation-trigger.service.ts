
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { fileLogger } from "@/modules/infrastructure/logging/services/file-logger"
import { WorkflowEngine } from "./engine"
import { WorkflowDefinition } from "./engine"
import { BusinessHoursEngine } from "@/modules/features/messaging/business-hours"

/**
 * Service to evaluate incoming events and trigger workflows.
 * Serves as the "Glue" between Inbox/CRM and the Automation Engine.
 */
export class AutomationTriggerService {
    // In-memory lock to prevent immediate webhook race conditions.
    // In a multi-instance production environment, this should ideally be Redis.
    private processingLocks: Set<string> = new Set();

    /**
     * Evaluate an incoming message to see if it triggers any workflow.
     * @param messageContent The text content of the message
     * @param conversationId The ID of the conversation
     * @param channel The channel (whatsapp, etc)
     * @param sender The phone number or sender ID
     */
    async evaluateInput(messageContent: string, conversationId: string, channel: string, sender: string, leadId: string, connectionId?: string, messageId?: string) {
        console.log(`[AutomationTrigger] 🚀 evaluateInput STARTED for conv: ${conversationId}, Channel: ${channel}, Connection: ${connectionId}`)
        fileLogger.log(`[AutomationTrigger] Evaluating input: "${messageContent}" (ID: ${messageId}) for conv: ${conversationId}`)

        // 1. Fetch Active Workflows with 'keyword' or 'message_received' triggers
        // We filter in memory for now if trigger_config is JSONB, or use simple query if optimized

        // Fetch ALL active workflows for the organization (optimizable by trigger_type later)
        // For MVP, we need the Org ID. We can get it from the conversation, but for speed let's just query workflows that are active.
        // Wait, RLS would block if we used client, but we use admin. We should ideally filter by Org.

        // Let's first get the conversation to know the Org
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('organization_id, connection_id, last_auto_reply_at, metadata, assigned_to, is_bot_active, integration_connections(working_hours)') // Fetch connection hours
            .eq('id', conversationId)
            .single()

        if (!conversation) {
            console.error('[AutomationTrigger] Conversation not found')
            return
        }

        // Meta 2026: Bot activity check.
        // We evaluate keyword triggers regardless to allow "re-activation" via commands like "restart bot" or "start".
        // However, we skip generic "message_received" (catch-all) triggers if the bot is explicitly deactivated.
        const botExplicitlyDisabled = conversation.is_bot_active === false;

        const orgId = conversation.organization_id
        // Prefer passed connectionId (from message), fallback to conversation's
        const finalConnectionId = connectionId || conversation.connection_id
        const finalMessageId = messageId || (typeof messageContent === 'object' ? (messageContent as any).id : `auto_${Date.now()}`);

        if (finalMessageId) {
            if (this.processingLocks.has(finalMessageId)) {
                fileLogger.log(`[AutomationTrigger] Lock active for message ${finalMessageId}. Skipping concurrent execution.`);
                return;
            }
            this.processingLocks.add(finalMessageId);

            // Auto-release lock after 10 seconds just in case
            setTimeout(() => this.processingLocks.delete(finalMessageId), 10000);
        }

        const { data: workflows } = await supabaseAdmin
            .from('workflows')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .in('trigger_type', ['keyword', 'message_received', 'webhook', 'first_contact', 'business_hours', 'outside_hours', 'media_received', 'meta_ads'])

        if (!workflows || workflows.length === 0) {
            fileLogger.log('[AutomationTrigger] No active message triggers found.')
            return
        }

        fileLogger.log(`[AutomationTrigger] Found ${workflows.length} active message workflows. Checking conditions...`)

        // Attempt to parse text if messageContent is a JSON string (from InboxService)
        let actualText = messageContent
        try {
            const parsed = JSON.parse(messageContent)
            if (parsed.text) actualText = parsed.text
            else if (parsed.body) actualText = parsed.body
            else if (parsed.caption) actualText = parsed.caption
        } catch (e) { }

        const metadata = conversation.metadata as any || {}
        const lastAutoReply = conversation.last_auto_reply_at ? new Date(conversation.last_auto_reply_at).getTime() : 0
        const resolvedAt = metadata.resolved_at ? new Date(metadata.resolved_at).getTime() : 0
        const now = Date.now()

        // A session is considered "Expired" or "Reset" if:
        // 1. Bot never replied before (lastAutoReply === 0)
        // 2. Human explicitly resolved the chat AFTER the bot last spoke (resolvedAt > lastAutoReply)
        // 3. More than 12 hours have passed since the last bot interaction (Cooldown)
        const isSessionExpired = lastAutoReply === 0 ||
            resolvedAt > lastAutoReply ||
            (now - lastAutoReply) > (12 * 60 * 60 * 1000);

        // CHANNEL WORKING HOURS CHECK
        const connectionHours = (conversation as any).integration_connections?.working_hours;
        const isOnline = BusinessHoursEngine.isOnline(connectionHours);

        // Safety: Ignore messages that arrived within 2 seconds of a bot reply 
        // to prevent potential echo loops (some providers echo sent messages back)
        const isEcho = lastAutoReply > 0 && (now - lastAutoReply) < 2000;

        for (const wf of workflows) {
            const config = wf.trigger_config as any
            let match = false
            let skipReason = ''

            // Meta 2026: Resolve the actual trigger type from node data fallback to table data
            const triggerNode = wf.definition.nodes.find((n: any) => n.id === wf.trigger_id || n.type === 'trigger')
            const nodeData = triggerNode?.data || {}
            let workflowTriggerType = nodeData.triggerType || wf.trigger_type

            // If node says 'webhook' but DB says 'message_received' or 'keyword', we trust the DB's intent
            if (workflowTriggerType === 'webhook' && ['message_received', 'keyword'].includes(wf.trigger_type)) {
                console.log(`[AutomationTrigger] 🔄 Overriding 'webhook' with '${wf.trigger_type}' for workflow "${wf.name}"`)
                workflowTriggerType = wf.trigger_type
            }

            if (isEcho) {
                fileLogger.log(`[AutomationTrigger] Potential echo detected for workflow ${wf.id}. Skipping.`)
                continue;
            }

            // 1. Keyword Trigger
            if (workflowTriggerType === 'keyword' && config.keyword) {
                if (config.keyword && config.keyword.trim() !== '') {
                    const keyword = config.keyword.toLowerCase()
                    const text = actualText.toLowerCase()

                    if (config.matchType === 'exact') {
                        match = text === keyword
                    } else if (config.matchType === 'contains') {
                        match = text.includes(keyword)
                    } else {
                        match = text.includes(keyword)
                    }
                    if (!match) skipReason = `Keyword mismatch (Wanted: ${keyword}, Got: ${text})`
                } else {
                    // Empty keyword acts like "Any Message", but we apply session/activity restriction
                    match = isSessionExpired && !botExplicitlyDisabled;
                    if (!match) skipReason = `Session active or Bot disabled (Rate limiting "Any Message" keyword)`
                }
            }

            // 2. Generic "Message Received" OR "Webhook"
            else if (workflowTriggerType === 'message_received' || workflowTriggerType === 'webhook') {
                if (workflowTriggerType === 'webhook' && config.keyword && config.keyword.trim() !== '') {
                    const keyword = config.keyword.toLowerCase()
                    const text = actualText.toLowerCase()
                    match = text.includes(keyword)
                    if (!match) skipReason = `Webhook keyword mismatch`
                } else {
                    // It's a "Catch All" trigger. Apply session and activity logic to avoid infinite loops.
                    match = isSessionExpired && !botExplicitlyDisabled;
                    if (!match) skipReason = `Session active or Bot disabled (Rate limiting catch-all ${workflowTriggerType})`
                }
            }

            // 3. "First Contact"
            else if (workflowTriggerType === 'first_contact') {
                // Check if this workflow has EVER run for this lead
                const { data: lastExecution } = await supabaseAdmin
                    .from('workflow_executions')
                    .select('started_at')
                    .eq('workflow_id', wf.id)
                    .contains('context', { lead: { id: leadId } })
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .single()

                if (!lastExecution) {
                    // Never executed → first contact confirmed
                    match = true
                    fileLogger.log(`[AutomationTrigger] First contact confirmed for lead: ${leadId} (No prior executions)`)
                } else {
                    // Was executed before — only re-trigger if:
                    // 1. Conversation was resolved/closed AFTER last execution
                    // 2. OR this is a fresh conversation (bot never replied here = old conv was deleted)
                    const lastExecTime = new Date(lastExecution.started_at).getTime()
                    const wasResolved = resolvedAt > lastExecTime
                    const isFreshConversation = lastAutoReply === 0 // Bot never replied in current conversation (deleted & recreated)

                    if (wasResolved || isFreshConversation) {
                        match = true
                        fileLogger.log(`[AutomationTrigger] First contact re-enabled for lead: ${leadId} (Resolved: ${wasResolved}, Fresh: ${isFreshConversation})`)
                    } else {
                        skipReason = `Already triggered for this lead (Last exec: ${lastExecution.started_at}). Resolve or delete the conversation to re-enable.`
                    }
                }
            }

            // 4. "Business Hours" (Specific Node Trigger)
            else if (workflowTriggerType === 'business_hours') {
                // If it's a dedicated Business Hours trigger, check if we are currently online
                match = isOnline;
                if (!match) skipReason = 'Currently outside office hours (Channel level)'
            }

            // 5. "Outside Hours" (Specific Node Trigger)
            else if (workflowTriggerType === 'outside_hours') {
                // If it's a dedicated Outside Hours trigger, check if we are currently offline
                match = !isOnline;
                if (!match) skipReason = 'Currently inside office hours (Channel level)'
            }
            
            // Global check for message-based triggers
            // We block everything EXCEPT the dedicated 'outside_hours' trigger if we are offline
            if (match && workflowTriggerType !== 'outside_hours') {
                if (!isOnline) {
                    match = false;
                    skipReason = 'Channel is OFFLINE. Triggers paused (Master Toggle).';
                }
            }

            // 6. "Media Received"
            else if (wf.trigger_type === 'media_received') {
                let msgData: any = {}
                try {
                    msgData = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent
                } catch (e) { }

                const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker', 'location']
                const detectedType = msgData.type || 'text'

                if (mediaTypes.includes(detectedType)) {
                    const allowedTypes = config.media_types || mediaTypes
                    if (allowedTypes.includes(detectedType)) {
                        match = true
                    } else {
                        skipReason = `Media Not Allowed: ${detectedType}`
                    }
                } else {
                    skipReason = 'Not Media'
                }
            }

            // 7. "Meta Ads"
            else if (wf.trigger_type === 'meta_ads') {
                const convMetadata = conversation.metadata as any || {}
                // Support both structured (referral.ad_id) and flat (ad_id) metadata
                const referral = convMetadata.referral || convMetadata
                const adId = referral.ad_id || referral.source_id
                const campaignId = referral.source_id || referral.campaign_id

                if (adId || (referral && referral.ctwa_clid)) {
                    // It's a Meta Ad lead.
                    // If trigger config has specific Ad ID or Campaign filters, apply them
                    const adIdMatch = !config.ad_id || config.ad_id === adId
                    const campaignMatch = !config.campaign_id || config.campaign_id === campaignId

                    if (adIdMatch && campaignMatch) {
                        match = true
                    } else {
                        skipReason = `Meta Ad mismatch (Ad: ${adId}, Campaign: ${campaignId})`
                    }
                } else {
                    skipReason = 'Not a Meta Ad lead (No referral data found)'
                }
            }

            if (!match && !skipReason) {
                skipReason = `Type ${workflowTriggerType} not handled or condition failed`
            }

            // Logs for matching or skipping
            if (!match) {
                console.log(`[AutomationTrigger] ❌ SKIPPED Workflow: ${wf.id} (${wf.name}). Reason: ${skipReason}`)
                fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id} (${wf.name}). Reason: ${skipReason}`)
            }


            // --- CHANNEL FILTERING LOGIC (2026 REFINEMENT) ---
            // This ensures that the automation only triggers for the intended messaging channels.
            // It supports both legacy single-channel config ('channel') and new multi-channel ('channels').
            if (match) {
                const configChannels = config.channels as string[] | undefined;
                const configChannel = config.channel as string | undefined;

                // Priority: empty array [] means MUTE > non-empty array [IDs] > legacy channel string > fallback all
                let effectiveChannels: string[] = [];
                if (Array.isArray(configChannels)) {
                    effectiveChannels = configChannels;
                } else if (configChannel) {
                    effectiveChannels = [configChannel];
                } else {
                    effectiveChannels = ['all'];
                }

                if (effectiveChannels.length > 0) {
                    const allowedSet = new Set(effectiveChannels.map(c => String(c).trim().toLowerCase()));
                    
                    if (!allowedSet.has('all')) {
                        const currentId = String(finalConnectionId).trim().toLowerCase();
                        
                        // Check for exact match or Meta composite ID match (connectionId:assetId)
                        const isChannelAllowed = Array.from(allowedSet).some(selectedId => 
                            selectedId === currentId || selectedId.startsWith(`${currentId}:`)
                        );

                        if (!isChannelAllowed) {
                            match = false;
                            skipReason = `Channel ID ${currentId} is not in the allowed list: [${Array.from(allowedSet).join(', ')}]`;
                            fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id}. Reason: ${skipReason}`);
                        }
                    }
                } else {
                    // Explicitly empty array means MUTE
                    match = false;
                    skipReason = `Workflow ${wf.name} is muted (no channels selected).`;
                    fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id}. Reason: ${skipReason}`);
                }
            }

            // COOLDOWN CHECK
            if (match && config.cooldown_minutes && config.cooldown_minutes > 0) {
                const cooldownMs = config.cooldown_minutes * 60 * 1000
                const cutoffTime = new Date(Date.now() - cooldownMs).toISOString()
                const { count: recentExecCount } = await supabaseAdmin
                    .from('workflow_executions')
                    .select('id', { count: 'exact', head: true })
                    .eq('workflow_id', wf.id)
                    .gte('started_at', cutoffTime)
                    .contains('context', { lead: { id: leadId } })

                if (recentExecCount && recentExecCount > 0) {
                    match = false
                    skipReason = `Cooldown active`
                    fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id}. Reason: ${skipReason}`)
                }
            }

            if (match) {
                console.log(`[AutomationTrigger] ✅ MATCH found for flow ${wf.name} (${wf.id})`)
                // Fetch lead details for richer context (e.g. {{lead.name}})
                const { data: fullLead } = await supabaseAdmin
                    .from('leads')
                    .select('*')
                    .eq('id', leadId)
                    .single()

                // Enrich lead with ad data for easier variable access {{lead.ad_id}}
                if (fullLead) {
                    const convMetadata = conversation.metadata as any || {}
                    const referral = convMetadata.referral
                    if (referral) {
                        fullLead.ad_id = referral.ad_id || referral.source_id
                        fullLead.ad_campaign = referral.source_id
                        fullLead.ad_source = referral.source_type
                        fullLead.ad_url = referral.source_url
                        fullLead.ad_ctwa_clid = referral.ctwa_clid
                    }
                }

                // DEDUPLICATION
                const finalMessageId = messageId || (messageContent as any).id || (typeof messageContent === 'object' ? (messageContent as any).id : `auto_${Date.now()}`);

                if (finalMessageId) {
                    const { count } = await supabaseAdmin
                        .from('workflow_executions')
                        .select('id', { count: 'exact', head: true })
                        .contains('context', { message: { id: finalMessageId } })
                        .eq('workflow_id', wf.id) // Scope to flow

                    if (count && count > 0) {
                        fileLogger.log(`[AutomationTrigger] Duplicate trigger for ${finalMessageId} on ${wf.id}. Skipping.`)
                        continue;
                    }
                }

                console.log(`[AutomationTrigger] 🚀 Triggering Workflow: ${wf.name} (${wf.id})`, {
                    leadName: fullLead?.name,
                    leadId: leadId
                })
                // SURGICAL: Mark bot as active during execution to pause agent response timer
                await supabaseAdmin
                    .from('conversations')
                    .update({ 
                        is_bot_active: true, 
                        last_auto_reply_at: new Date().toISOString(),
                        updated_at: new Date().toISOString() 
                    })
                    .eq('id', conversationId)

                // MUST AWAIT in Serverless
                await this.executeWorkflow(wf, {
                    organization_id: orgId,
                    conversation: { id: conversationId, channel },
                    message: { content: messageContent, sender, id: finalMessageId },
                    lead: fullLead || { id: leadId },
                    connection_id: finalConnectionId
                })
            } else {
                // verbose debug only
                // fileLogger.log(`[AutomationTrigger] Skipped ${wf.id}: ${skipReason}`)
            }
        }
    }

    /**
     * Execute a workflow instance
     */
    private async executeWorkflow(workflow: any, context: any) {
        try {
            // 1. Create Execution Record
            const { data: execution, error } = await supabaseAdmin
                .from('workflow_executions')
                .insert({
                    organization_id: workflow.organization_id,
                    workflow_id: workflow.id,
                    status: 'running',
                    context: context,
                    started_at: new Date().toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error('[AutomationTrigger] Failed to create execution:', error)
                return
            }

            console.log(`[AutomationTrigger] Execution started: ${execution.id}`)

            // 2. Initialize Engine
            const definition = workflow.definition as WorkflowDefinition
            // Merge initial context with execution context
            const fullContext = { ...context, executionId: execution.id }

            const engine = new WorkflowEngine(definition, fullContext)

            // 3. Run
            // Awaiting engine.start() is REQUIRED in Vercel Serverless environment 
            // otherwise the lambda will freeze before HTTP requests are dispatched.
            try {
                await engine.start()
                fileLogger.log(`[AutomationTrigger] Workflow ${workflow.id} completed.`)
                await supabaseAdmin
                    .from('workflow_executions')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', execution.id)
            } catch (err: any) {
                const supabase = supabaseAdmin;
                if (err.message === 'WORKFLOW_SUSPENDED') {
                    fileLogger.log(`[AutomationTrigger] Workflow ${workflow.id} suspended to wait for input.`)
                    await supabase
                        .from('workflow_executions')
                        .update({ status: 'suspended' })
                        .eq('id', execution.id)
                } else {
                    console.error(`[AutomationTrigger] Workflow ${workflow.id} failed:`, err)
                    await supabase
                        .from('workflow_executions')
                        .update({
                            status: 'failed',
                            error_message: err.message,
                            completed_at: new Date().toISOString()
                        })
                        .eq('id', execution.id)
                }
            }

        } catch (err) {
            console.error('[AutomationTrigger] Critical error executing workflow:', err)
        }
    }
}

export const automationTrigger = new AutomationTriggerService()
