
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fileLogger } from "@/lib/file-logger"
import { WorkflowEngine } from "./engine"
import { WorkflowDefinition } from "./engine"

/**
 * Service to evaluate incoming events and trigger workflows.
 * Serves as the "Glue" between Inbox/CRM and the Automation Engine.
 */
export class AutomationTriggerService {

    /**
     * Evaluate an incoming message to see if it triggers any workflow.
     * @param messageContent The text content of the message
     * @param conversationId The ID of the conversation
     * @param channel The channel (whatsapp, etc)
     * @param sender The phone number or sender ID
     */
    async evaluateInput(messageContent: string, conversationId: string, channel: string, sender: string, leadId: string, connectionId?: string) {
        fileLogger.log(`[AutomationTrigger] Evaluating input: "${messageContent}" for conv: ${conversationId}`)

        // 1. Fetch Active Workflows with 'keyword' or 'message_received' triggers
        // We filter in memory for now if trigger_config is JSONB, or use simple query if optimized

        // Fetch ALL active workflows for the organization (optimizable by trigger_type later)
        // For MVP, we need the Org ID. We can get it from the conversation, but for speed let's just query workflows that are active.
        // Wait, RLS would block if we used client, but we use admin. We should ideally filter by Org.

        // Let's first get the conversation to know the Org
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('organization_id, connection_id') // Fetch connection_id if not passed
            .eq('id', conversationId)
            .single()

        if (!conversation) {
            console.error('[AutomationTrigger] Conversation not found')
            return
        }

        const orgId = conversation.organization_id
        // Prefer passed connectionId (from message), fallback to conversation's
        const finalConnectionId = connectionId || conversation.connection_id

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

        for (const wf of workflows) {
            const config = wf.trigger_config as any
            let match = false

            // Check Keyword Trigger
            if (wf.trigger_type === 'keyword' && config.keyword) {
                const keyword = config.keyword.toLowerCase()
                const text = messageContent.toLowerCase()

                if (config.matchType === 'exact') {
                    match = text === keyword
                } else if (config.matchType === 'contains') {
                    match = text.includes(keyword)
                } else {
                    // Default to contains
                    match = text.includes(keyword)
                }
            }

            // Check Generic "Message Received" (All messages)
            if (wf.trigger_type === 'message_received') {
                match = true // Triggers on ANY message
            }

            // Check "First Contact" - Only NEW leads
            if (wf.trigger_type === 'first_contact') {
                // Check if this lead has any PRIOR conversations (before this one)
                const { count: priorConvCount } = await supabaseAdmin
                    .from('conversations')
                    .select('id', { count: 'exact', head: true })
                    .eq('lead_id', leadId)
                    .neq('id', conversationId) // Exclude current conversation

                if (priorConvCount === 0) {
                    fileLogger.log(`[AutomationTrigger] First contact detected for lead: ${leadId}`)
                    match = true
                } else {
                    fileLogger.log(`[AutomationTrigger] Lead ${leadId} has ${priorConvCount} prior conversations, skipping first_contact trigger`)
                }
            }

            // Check "Business Hours" - Only during open hours
            if (wf.trigger_type === 'business_hours') {
                const now = new Date()
                const currentHour = now.getHours()
                const currentDay = now.getDay() // 0=Sunday, 6=Saturday

                // Default: Mon-Fri 9AM-6PM (can be customized via config)
                const startHour = config.start_hour ?? 9
                const endHour = config.end_hour ?? 18
                const workDays = config.work_days ?? [1, 2, 3, 4, 5] // Mon-Fri

                const isWorkDay = workDays.includes(currentDay)
                const isWorkHour = currentHour >= startHour && currentHour < endHour

                if (isWorkDay && isWorkHour) {
                    fileLogger.log(`[AutomationTrigger] Within business hours (${startHour}:00 - ${endHour}:00)`)
                    match = true
                } else {
                    fileLogger.log(`[AutomationTrigger] Outside business hours, skipping trigger`)
                }
            }

            // Check "Outside Hours" - Only outside business hours (for auto-replies)
            if (wf.trigger_type === 'outside_hours') {
                const now = new Date()
                const currentHour = now.getHours()
                const currentDay = now.getDay()

                const startHour = config.start_hour ?? 9
                const endHour = config.end_hour ?? 18
                const workDays = config.work_days ?? [1, 2, 3, 4, 5]

                const isWorkDay = workDays.includes(currentDay)
                const isWorkHour = currentHour >= startHour && currentHour < endHour

                if (!isWorkDay || !isWorkHour) {
                    fileLogger.log(`[AutomationTrigger] Outside business hours - triggering auto-reply`)
                    match = true
                }
            }

            // Check "Media Received" - Triggers on images, videos, audio, documents
            if (wf.trigger_type === 'media_received') {
                // Parse message content to detect media type
                let msgData: any = {}
                try {
                    msgData = typeof messageContent === 'string' ? JSON.parse(messageContent) : messageContent
                } catch (e) {
                    // Not JSON, treat as plain text
                }

                const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker', 'location']
                const detectedType = msgData.type || 'text'

                if (mediaTypes.includes(detectedType)) {
                    fileLogger.log(`[AutomationTrigger] Media detected: ${detectedType}`)

                    // If config specifies allowed types, check
                    const allowedTypes = config.media_types || mediaTypes
                    if (allowedTypes.includes(detectedType)) {
                        match = true
                    }
                }
            }

            // Check "Webhook" (Legacy/Fallback)
            if (wf.trigger_type === 'webhook') {
                // If config has keyword, treat as keyword trigger
                if (config.keyword && config.keyword.trim() !== '') {
                    const keyword = config.keyword.toLowerCase()
                    const text = messageContent.toLowerCase()
                    match = text.includes(keyword)
                } else {
                    // Otherwise, treat as "Any Message"
                    match = true;
                }
            }

            // COOLDOWN CHECK - Prevent spam triggers
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
                    fileLogger.log(`[AutomationTrigger] Cooldown active for workflow ${wf.id}, lead ${leadId}. Skipping.`)
                    match = false
                }
            }

            if (match) {
                fileLogger.log(`[AutomationTrigger] 🚀 Triggering Workflow: ${wf.name} (${wf.id})`)
                this.executeWorkflow(wf, {
                    organization_id: orgId,
                    conversation: { id: conversationId, channel },
                    message: { content: messageContent, sender },
                    lead: { id: leadId },
                    connection_id: finalConnectionId // PASS CONNECTION ID
                })
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
            // Note: start() is async. In a real system, we might offload this to a queue (Redis/Bull).
            // For MVP, we run it in the background of the request (fire and forget promise).
            engine.start().then(async () => {
                fileLogger.log(`[AutomationTrigger] Workflow ${workflow.id} completed.`)
                await supabaseAdmin
                    .from('workflow_executions')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', execution.id)
            }).catch(async (err) => {
                console.error(`[AutomationTrigger] Workflow ${workflow.id} failed:`, err)
                await supabaseAdmin
                    .from('workflow_executions')
                    .update({
                        status: 'failed',
                        error_message: err.message,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', execution.id)
            })

        } catch (err) {
            console.error('[AutomationTrigger] Critical error executing workflow:', err)
        }
    }
}

export const automationTrigger = new AutomationTriggerService()
