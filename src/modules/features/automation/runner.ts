import { WorkflowEngine, WorkflowDefinition } from "./engine"
import { WaitInputNode } from "./nodes/wait-input-node"
import { IncomingMessage } from "@/modules/features/messaging/providers/types"
import { createClient } from "@/modules/core/database/supabase-server";

export async function resumeSuspendedWorkflow(
    executionId: string,
    pendingInputId: string,
    message: IncomingMessage
) {
    let engine: WorkflowEngine | null = null;
    let resumeOrganizationId: string | null = null;
    try {
        const supabase = (await createClient())

        // 1. Fetch Pending Input Record
        // (We might have passed it, but good to re-fetch/verify lock)
        const { data: pendingInput, error: pendingError } = await supabase
            .from('workflow_pending_inputs')
            .select('*')
            .eq('id', pendingInputId)
            .eq('execution_id', executionId)
            .single()

        if (pendingError || !pendingInput) {
            throw new Error(`Pending input not found: ${pendingError?.message}`)
        }
        resumeOrganizationId = pendingInput.organization_id
        if (!resumeOrganizationId) {
            throw new Error('Pending input missing organization')
        }

        if (pendingInput.status !== 'waiting') {
            console.log(`[Runner] Pending input ${pendingInputId} is not waiting (Status: ${pendingInput.status}). Ignoring.`)
            return { success: false, reason: 'Already processed' }
        }

        // 2. Process & Validate Input using the Node Logic
        const waitNode = new WaitInputNode({} as any)

        // Map IncomingMessage to WaitInputNode expected format (flat)
        const inputForProcessing = {
            type: message.content.type,
            content: message.content.text || '', // Extract text string
            buttonId: message.buttonId
        }

        const processResult = await waitNode.processInput(pendingInput, inputForProcessing)

        if (!processResult.success) {
            console.log(`[Runner] Input validation failed: ${processResult.error}`)
            return { success: false, reason: 'Validation failed', error: processResult.error }
        }

        // 3. Fetch Execution & Workflow Definition
        const { data: execution, error: execError } = await supabase
            .from('workflow_executions')
            .select(`
                *,
                workflows (
                    definition
                )
            `)
            .eq('id', executionId)
            .eq('organization_id', resumeOrganizationId)
            .single()

        if (execError || !execution) {
            throw new Error(`Execution not found: ${execError?.message}`)
        }

        const workflow = execution.workflows as any
        if (!workflow || !workflow.definition) {
            throw new Error("Workflow definition not found")
        }

        // Create response payload from process result
        const responsePayload = {
            content: processResult.userInput,
            buttonId: processResult.buttonId,
            nextBranchId: processResult.nextBranchId
        }

        // 4. Update Pending Input Record (Mark as Completed)
        await supabase
            .from('workflow_pending_inputs')
            .update({
                status: 'completed',
                response: responsePayload,
                completed_at: new Date().toISOString()
            })
            .eq('id', pendingInputId)
            .eq('organization_id', resumeOrganizationId)

        // 5. Resume Engine
        console.log(`[Runner] Resuming execution ${executionId} at step ${pendingInput.node_id}`)

        // Prepare Resume Context
        const context = execution.context || {}
        const resumeContext = {
            _resumedInputResponse: responsePayload,
            executionId: execution.id,
            organizationId: execution.organization_id,
            organization_id: execution.organization_id // Redundant safety
        }

        engine = new WorkflowEngine(workflow.definition as WorkflowDefinition, context)

        // We assume engine.resume matches the exact node that suspended it.
        // engine.ts: resume(stepId, additionalContext)
        await engine.resume(pendingInput.node_id, resumeContext)

        // If we get here, workflow COMPLETED successfully (no suspension)
        await supabase
            .from('workflow_executions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                context: (engine as any).context
            })
            .eq('id', executionId)
            .eq('organization_id', resumeOrganizationId)

        return { success: true }

    } catch (error: any) {
        // Handle Suspension (Normal flow)
        if (error.message === 'WORKFLOW_SUSPENDED') {
            console.log(`[Runner] Workflow ${executionId} suspended again.`)

            // We need to persist the context even if suspended
            if (engine && resumeOrganizationId) {
                const supabase = (await createClient())
                await supabase
                    .from('workflow_executions')
                    .update({
                        status: 'suspended',
                        context: (engine as any).context // Access the updated context from the engine instance
                    })
                    .eq('id', executionId)
                    .eq('organization_id', resumeOrganizationId)
            }
            return { success: true, status: 'suspended' }
        }

        console.error(`[Runner] Error resuming workflow:`, error)

        // Update Execution to Failed
        if (resumeOrganizationId) {
            const supabase = (await createClient())
            await supabase
                .from('workflow_executions')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    completed_at: new Date().toISOString()
                })
                .eq('id', executionId)
                .eq('organization_id', resumeOrganizationId)
        }

        return { success: false, error: error.message }
    }
}
