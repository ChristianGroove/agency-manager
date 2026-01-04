
import { supabaseAdmin } from "@/lib/supabase-admin"
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
    async evaluateInput(messageContent: string, conversationId: string, channel: string, sender: string, leadId: string) {
        console.log(`[AutomationTrigger] Evaluating input: "${messageContent}" for conv: ${conversationId}`)

        // 1. Fetch Active Workflows with 'keyword' or 'message_received' triggers
        // We filter in memory for now if trigger_config is JSONB, or use simple query if optimized

        // Fetch ALL active workflows for the organization (optimizable by trigger_type later)
        // For MVP, we need the Org ID. We can get it from the conversation, but for speed let's just query workflows that are active.
        // Wait, RLS would block if we used client, but we use admin. We should ideally filter by Org.

        // Let's first get the conversation to know the Org
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('organization_id')
            .eq('id', conversationId)
            .single()

        if (!conversation) {
            console.error('[AutomationTrigger] Conversation not found')
            return
        }

        const orgId = conversation.organization_id

        const { data: workflows } = await supabaseAdmin
            .from('workflows')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .in('trigger_type', ['keyword', 'message_received'])

        if (!workflows || workflows.length === 0) {
            console.log('[AutomationTrigger] No active message triggers found.')
            return
        }

        console.log(`[AutomationTrigger] Found ${workflows.length} active message workflows. Checking conditions...`)

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

            if (match) {
                console.log(`[AutomationTrigger] 🚀 Triggering Workflow: ${wf.name} (${wf.id})`)
                this.executeWorkflow(wf, {
                    organization_id: orgId,
                    conversation: { id: conversationId, channel },
                    message: { content: messageContent, sender },
                    lead: { id: leadId }
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
                console.log(`[AutomationTrigger] Workflow ${workflow.id} completed.`)
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
