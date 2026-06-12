import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { NextResponse } from "next/server"
import { WorkflowEngine, WorkflowDefinition } from "@/modules/features/automation/engine"
import { isProductionRuntime, requireCronSecret } from "@/app/api/_guards/request-guards"

// Force dynamic to ensure we always check the DB for latest items
export const dynamic = 'force-dynamic'

const PUBLIC_QUEUE_ERROR = 'Automation queue processing failed'
const PUBLIC_QUEUE_FETCH_ERROR = 'Failed to fetch automation queue'

function logQueueError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function queueErrorMessage(error: unknown, fallback = PUBLIC_QUEUE_ERROR) {
    if (isProductionRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return fallback
}

export async function POST(req: Request) {
    const unauthorized = requireCronSecret(req)
    if (unauthorized) return unauthorized

    const supabase = supabaseAdmin

    try {
        // 1. Fetch pending items from queue that are due
        // We join with executions and workflows to get all necessary data to resume
        const { data: items, error } = await supabase
            .from('automation_queue')
            .select(`
                id,
                step_id,
                execution_id,
                workflow_executions:execution_id (
                    id,
                    organization_id,
                    context,
                    workflow_id,
                    workflows (
                        definition
                    )
                )
            `)
            .eq('status', 'pending')
            .lte('resume_at', new Date().toISOString())
            .limit(10) // Process in batches

        if (error) {
            logQueueError("Error fetching queue items:", error)
            return NextResponse.json({ error: queueErrorMessage(error, PUBLIC_QUEUE_FETCH_ERROR) }, { status: 500 })
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ processed: 0, message: "No items to process" })
        }

        console.log(`[Queue Processor] Found ${items.length} items to process`)

        const results = []
        const scopeQueueItem = (query: any, item: any) =>
            query.eq('id', item.id).eq('execution_id', item.execution_id)
        const scopeExecution = (query: any, execution: any) => {
            let scoped = query.eq('id', execution.id)
            if (execution.organization_id) {
                scoped = scoped.eq('organization_id', execution.organization_id)
            }
            return scoped
        }

        // 2. Process each item
        for (const item of items) {
            const execution = item.workflow_executions as any
            const workflow = execution?.workflows as any

            if (!execution || !workflow) {
                console.error(`[Queue] Invalid data for item ${item.id}`, item)
                await scopeQueueItem(
                    supabase.from('automation_queue').update({ status: 'failed', error_message: 'Missing execution or workflow data' }),
                    item
                )
                results.push({ id: item.id, status: 'failed', reason: 'Missing data' })
                continue
            }

            try {
                // Mark as processing
                await scopeQueueItem(supabase.from('automation_queue').update({ status: 'processing' }), item)
                await scopeExecution(supabase.from('workflow_executions').update({ status: 'running' }), execution)

                // Initialize Engine
                const definition = workflow.definition as WorkflowDefinition
                const context = execution.context || {}

                // Add executionId to context just in case
                context.executionId = execution.id

                const engine = new WorkflowEngine(definition, context)

                console.log(`[Queue] Resuming execution ${execution.id} at step ${item.step_id}`)

                // Resume Execution
                // Note: engine.resume is async and runs the rest of the flow
                await engine.resume(item.step_id)

                // If we get here without error, the sub-flow completed (or hit another delay)
                // Note: If it hit another delay, engine throws WORKFLOW_SUSPENDED, check for that?
                // Actually engine.ts currently throws "WORKFLOW_SUSPENDED" error. 
                // We need to catch that here to distinguish between "Finished" and "Paused Again".

                await scopeQueueItem(supabase.from('automation_queue').update({ status: 'completed' }), item)

                // Check if we should mark execution as completed?
                // The engine doesn't explicitly return "Completed". 
                // We can assume if no error and no new suspension, it finished?
                // Ideally engine should return status. 
                // For now, we leave execution as 'running' or update to 'completed' if we want.
                // Let's mark as completed for now, unless engine threw suspended.
                await scopeExecution(
                    supabase.from('workflow_executions').update({ status: 'completed', completed_at: new Date().toISOString() }),
                    execution
                )

                results.push({ id: item.id, status: 'success' })

            } catch (err: any) {
                if (err.message === 'WORKFLOW_SUSPENDED') {
                    console.log(`[Queue] Execution ${execution.id} suspended again (chained delay)`)
                    await scopeQueueItem(supabase.from('automation_queue').update({ status: 'completed' }), item)
                    // Execution status remains 'waiting' (set by engine/action)
                    results.push({ id: item.id, status: 'suspended_again' })
                } else {
                    logQueueError(`[Queue] Error processing item ${item.id}:`, err)
                    const safeError = queueErrorMessage(err)
                    await scopeQueueItem(supabase.from('automation_queue').update({ status: 'failed', error_message: safeError }), item)
                    await scopeExecution(supabase.from('workflow_executions').update({ status: 'failed', error_message: safeError }), execution)
                    results.push({ id: item.id, status: 'failed', reason: safeError })
                }
            }
        }

        return NextResponse.json({ processed: items.length, results })

    } catch (e: any) {
        logQueueError("Critical Queue Error:", e)
        return NextResponse.json({ error: queueErrorMessage(e) }, { status: 500 })
    }
}
