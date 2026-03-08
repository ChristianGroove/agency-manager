
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fileLogger } from "@/lib/file-logger"
import { WorkflowEngine } from "./engine"
import { WorkflowDefinition } from "./engine"

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
        fileLogger.log(`[AutomationTrigger] Evaluating input: "${messageContent}" (ID: ${messageId}) for conv: ${conversationId}`)

        // 1. Fetch Active Workflows with 'keyword' or 'message_received' triggers
        // We filter in memory for now if trigger_config is JSONB, or use simple query if optimized

        // Fetch ALL active workflows for the organization (optimizable by trigger_type later)
        // For MVP, we need the Org ID. We can get it from the conversation, but for speed let's just query workflows that are active.
        // Wait, RLS would block if we used client, but we use admin. We should ideally filter by Org.

        // Let's first get the conversation to know the Org
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('organization_id, connection_id, last_auto_reply_at, metadata') // Fetch markers
            .eq('id', conversationId)
            .single()

        if (!conversation) {
            console.error('[AutomationTrigger] Conversation not found')
            return
        }

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
            .in('trigger_type', ['keyword', 'message_received', 'webhook', 'first_contact', 'business_hours', 'outside_hours', 'media_received'])

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

        // Safety: Ignore messages that arrived within 2 seconds of a bot reply 
        // to prevent potential echo loops (some providers echo sent messages back)
        const isEcho = lastAutoReply > 0 && (now - lastAutoReply) < 2000;

        for (const wf of workflows) {
            const config = wf.trigger_config as any
            let match = false
            let skipReason = ''

            if (isEcho) {
                fileLogger.log(`[AutomationTrigger] Potential echo detected for workflow ${wf.id}. Skipping.`)
                continue;
            }

            // 1. Keyword Trigger
            if (wf.trigger_type === 'keyword' && config.keyword) {
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
                    // Empty keyword acts like "Any Message", but we apply session restriction
                    match = isSessionExpired;
                    if (!match) skipReason = `Session still active (Rate limiting "Any Message" keyword)`
                }
            }

            // 2. Generic "Message Received" OR "Webhook" (Legacy/Any)
            else if (wf.trigger_type === 'message_received' || wf.trigger_type === 'webhook') {
                if (wf.trigger_type === 'webhook' && config.keyword && config.keyword.trim() !== '') {
                    const keyword = config.keyword.toLowerCase()
                    const text = actualText.toLowerCase()
                    match = text.includes(keyword)
                    if (!match) skipReason = `Webhook keyword mismatch`
                } else {
                    // It's a "Catch All" trigger. Apply session logic to avoid infinite loops.
                    match = isSessionExpired;
                    if (!match) skipReason = `Session still active (Rate limiting catch-all ${wf.trigger_type})`
                }
            }

            // 3. "First Contact" — TRUE once-per-lead with reset on resolve/delete
            else if (wf.trigger_type === 'first_contact') {
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

            // 4. "Business Hours"
            else if (wf.trigger_type === 'business_hours') {
                const now = new Date()
                const currentHour = now.getHours()
                const currentDay = now.getDay()
                const startHour = config.start_hour ?? 9
                const endHour = config.end_hour ?? 18
                const workDays = config.work_days ?? [1, 2, 3, 4, 5]

                const isWorkDay = workDays.includes(currentDay)
                const isWorkHour = currentHour >= startHour && currentHour < endHour

                if (isWorkDay && isWorkHour) {
                    match = true
                } else {
                    skipReason = 'Outside business hours'
                }
            }

            // 5. "Outside Hours"
            else if (wf.trigger_type === 'outside_hours') {
                const now = new Date()
                const currentHour = now.getHours()
                const currentDay = now.getDay()
                const startHour = config.start_hour ?? 9
                const endHour = config.end_hour ?? 18
                const workDays = config.work_days ?? [1, 2, 3, 4, 5]

                const isWorkDay = workDays.includes(currentDay)
                const isWorkHour = currentHour >= startHour && currentHour < endHour

                if (!isWorkDay || !isWorkHour) {
                    match = true
                } else {
                    skipReason = 'Inside business hours'
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

            if (!match && !skipReason) {
                skipReason = `Type ${wf.trigger_type} not handled or condition failed`
            }

            // Logs for matching or skipping
            if (!match) {
                console.log(`[AutomationTrigger] ❌ SKIPPED Workflow: ${wf.id} (${wf.name}). Reason: ${skipReason}`)
                fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id} (${wf.name}). Reason: ${skipReason}`)
            }


            // CHANNEL CHECK (ROBUST MULTI-CHANNEL EVALUATION)
            if (match && config.channels && Array.isArray(config.channels) && config.channels.length > 0) {
                if (finalConnectionId) {
                    const allowedChannels = config.channels.map((c: any) => String(c).trim());
                    const currentId = String(finalConnectionId).trim();

                    if (!allowedChannels.includes('all')) {
                        const isAllowed = allowedChannels.some((ch: string) => {
                            // Exact match
                            if (ch === currentId) return true;
                            // Substring / composite ID fallbacks
                            if (ch.includes(currentId)) return true;
                            if (currentId.includes(ch)) return true;
                            return false;
                        });

                        if (!isAllowed) {
                            match = false;
                            skipReason = `Channel mismatch (${currentId}) - Allowed: [${allowedChannels.join(', ')}]`;
                            fileLogger.log(`[AutomationTrigger]   ❌ SKIPPED Workflow: ${wf.id}. Reason: ${skipReason}`);
                        }
                    }
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
                    .update({ is_bot_active: true, updated_at: new Date().toISOString() })
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
