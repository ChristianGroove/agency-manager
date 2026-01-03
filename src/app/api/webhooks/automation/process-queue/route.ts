import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { WorkflowEngine, WorkflowDefinition } from "@/modules/core/automation/engine"

// Force dynamic to ensure we always check the DB for latest items
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
    const supabase = await createClient()

    try {
        // 1. Fetch pending items from queue that are due
        // We join with executions and workflows to get all necessary data to resume
        const { data: items, error } = await supabase
            .from('automation_queue')
            .select(`
                id,
                step_id,
                execution_id,
                workflow_executions (
                    id,
                    context,
                    workflow_id
                ),
                workflow_executions:execution_id (
                     workflows (
                        definition
                     )
                )
            `)
            .eq('status', 'pending')
            .lte('resume_at', new Date().toISOString())
            .limit(10) // Process in batches

        if (error) {
            console.error("Error fetching queue items:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ processed: 0, message: "No items to process" })
        }

        console.log(`[Queue Processor] Found ${items.length} items to process`)

        const results = []

        // 2. Process each item
        for (const item of items) {
            const execution = item.workflow_executions as any
            const workflow = execution?.workflows as any

            if (!execution || !workflow) {
                console.error(`[Queue] Invalid data for item ${item.id}`, item)
                await supabase.from('automation_queue').update({ status: 'failed', error_message: 'Missing execution or workflow data' }).eq('id', item.id)
                results.push({ id: item.id, status: 'failed', reason: 'Missing data' })
                continue
            }

            try {
                // Mark as processing
                await supabase.from('automation_queue').update({ status: 'processing' }).eq('id', item.id)
                await supabase.from('workflow_executions').update({ status: 'running' }).eq('id', execution.id)

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

                await supabase.from('automation_queue').update({ status: 'completed' }).eq('id', item.id)

                // Check if we should mark execution as completed?
                // The engine doesn't explicitly return "Completed". 
                // We can assume if no error and no new suspension, it finished?
                // Ideally engine should return status. 
                // For now, we leave execution as 'running' or update to 'completed' if we want.
                // Let's mark as completed for now, unless engine threw suspended.
                await supabase.from('workflow_executions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', execution.id)

                results.push({ id: item.id, status: 'success' })

            } catch (err: any) {
                if (err.message === 'WORKFLOW_SUSPENDED') {
                    console.log(`[Queue] Execution ${execution.id} suspended again (chained delay)`)
                    await supabase.from('automation_queue').update({ status: 'completed' }).eq('id', item.id)
                    // Execution status remains 'waiting' (set by engine/action)
                    results.push({ id: item.id, status: 'suspended_again' })
                } else {
                    console.error(`[Queue] Error processing item ${item.id}:`, err)
                    await supabase.from('automation_queue').update({ status: 'failed', error_message: err.message }).eq('id', item.id)
                    await supabase.from('workflow_executions').update({ status: 'failed', error_message: err.message }).eq('id', execution.id)
                    results.push({ id: item.id, status: 'failed', reason: err.message })
                }
            }
        }

        return NextResponse.json({ processed: items.length, results })

    } catch (e: any) {
        console.error("Critical Queue Error:", e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
