import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron Endpoint for Processing Scheduled Workflow Jobs
 * 
 * This endpoint should be called by a scheduler (Vercel Cron, etc.) every minute.
 * It processes pending delayed workflow executions.
 * 
 * Vercel Cron config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-workflows",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

// Use service role client for cron jobs
function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials for service role');
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {
        processed: 0,
        completed: 0,
        failed: 0,
        errors: [] as string[]
    };

    try {
        const supabase = getServiceClient();

        // Get pending jobs using the database function
        const { data: jobs, error: fetchError } = await supabase
            .rpc('get_pending_scheduled_jobs', { batch_size: 10 });

        if (fetchError) {
            console.error('[Cron] Failed to fetch pending jobs:', fetchError);
            return NextResponse.json({
                success: false,
                error: fetchError.message
            }, { status: 500 });
        }

        if (!jobs || jobs.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending jobs',
                duration: Date.now() - startTime
            });
        }

        console.log(`[Cron] Processing ${jobs.length} pending jobs`);

        // Process each job
        for (const job of jobs) {
            results.processed++;

            try {
                // Get the workflow definition
                const { data: workflow, error: workflowError } = await supabase
                    .from('workflows')
                    .select('id, name, definition, is_active')
                    .eq('id', job.workflow_id)
                    .single();

                if (workflowError || !workflow) {
                    throw new Error(`Workflow not found: ${job.workflow_id}`);
                }

                if (!workflow.is_active) {
                    // Skip inactive workflows
                    await supabase
                        .from('scheduled_workflow_jobs')
                        .update({
                            status: 'cancelled',
                            completed_at: new Date().toISOString(),
                            last_error: 'Workflow is inactive'
                        })
                        .eq('id', job.id);

                    console.log(`[Cron] Skipped inactive workflow for job ${job.id}`);
                    continue;
                }

                // Resume workflow execution from the saved node
                // This is a simplified version - in production, you'd use the WorkflowEngine
                console.log(`[Cron] Resuming workflow ${workflow.id} from node ${job.resume_from_node_id}`);
                console.log(`[Cron] Context:`, JSON.stringify(job.context).substring(0, 200));

                // Find the node to resume from
                const definition = workflow.definition as { nodes: any[], edges: any[] };
                const resumeNode = definition.nodes.find((n: any) => n.id === job.resume_from_node_id);

                if (!resumeNode) {
                    throw new Error(`Resume node not found: ${job.resume_from_node_id}`);
                }

                // Find next nodes to execute
                const nextEdges = definition.edges.filter((e: any) => e.source === job.resume_from_node_id);

                // For now, we'll just log the resumption
                // In production, you'd instantiate WorkflowEngine and call resume()
                console.log(`[Cron] Would execute ${nextEdges.length} next node(s) after delay`);

                // Update execution record if exists
                if (job.execution_id) {
                    await supabase
                        .from('workflow_executions')
                        .update({
                            status: 'running',
                            metadata: {
                                resumed_at: new Date().toISOString(),
                                resumed_from: job.resume_from_node_id
                            }
                        })
                        .eq('id', job.execution_id);
                }

                // Mark job as completed
                await supabase
                    .from('scheduled_workflow_jobs')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', job.id);

                results.completed++;
                console.log(`[Cron] Completed job ${job.id}`);

            } catch (jobError) {
                const errorMessage = jobError instanceof Error ? jobError.message : 'Unknown error';
                results.errors.push(`Job ${job.id}: ${errorMessage}`);
                results.failed++;

                // Check if we should retry
                if (job.attempts < job.max_attempts) {
                    // Reset to pending with a delay for retry
                    const retryAt = new Date();
                    retryAt.setMinutes(retryAt.getMinutes() + 5); // Retry in 5 minutes

                    await supabase
                        .from('scheduled_workflow_jobs')
                        .update({
                            status: 'pending',
                            scheduled_for: retryAt.toISOString(),
                            last_error: errorMessage
                        })
                        .eq('id', job.id);

                    console.log(`[Cron] Job ${job.id} scheduled for retry at ${retryAt.toISOString()}`);
                } else {
                    // Max attempts reached, mark as failed
                    await supabase
                        .from('scheduled_workflow_jobs')
                        .update({
                            status: 'failed',
                            completed_at: new Date().toISOString(),
                            last_error: errorMessage
                        })
                        .eq('id', job.id);

                    console.error(`[Cron] Job ${job.id} failed permanently: ${errorMessage}`);
                }
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[Cron] Processed ${results.processed} jobs in ${duration}ms`);

        return NextResponse.json({
            success: true,
            ...results,
            duration
        });

    } catch (error) {
        console.error('[Cron] Critical error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
        }, { status: 500 });
    }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
    return GET(request);
}
