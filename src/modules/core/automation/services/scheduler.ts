'use server';

/**
 * Workflow Scheduler Service
 * 
 * Handles scheduling and resuming delayed workflow executions.
 * Used by the delay node to pause and resume workflows.
 */

import { createClient } from '@/lib/supabase-server';
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions';

interface ScheduledJob {
    id: string;
    organization_id: string;
    workflow_id: string;
    execution_id: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    scheduled_for: string;
    resume_from_node_id: string;
    context: Record<string, unknown>;
    attempts: number;
    max_attempts: number;
    last_error: string | null;
}

interface ScheduleJobParams {
    workflowId: string;
    executionId?: string;
    resumeFromNodeId: string;
    delayMinutes: number;
    context: Record<string, unknown>;
}

interface ScheduleJobResult {
    success: boolean;
    jobId?: string;
    scheduledFor?: string;
    error?: string;
}

/**
 * Schedule a workflow to resume after a delay
 */
export async function scheduleWorkflowResume(params: ScheduleJobParams): Promise<ScheduleJobResult> {
    const supabase = await createClient();
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
        return { success: false, error: 'Organization not found' };
    }

    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + params.delayMinutes);

    try {
        const { data, error } = await supabase
            .from('scheduled_workflow_jobs')
            .insert({
                organization_id: organizationId,
                workflow_id: params.workflowId,
                execution_id: params.executionId || null,
                resume_from_node_id: params.resumeFromNodeId,
                scheduled_for: scheduledFor.toISOString(),
                context: params.context,
                status: 'pending'
            })
            .select('id, scheduled_for')
            .single();

        if (error) {
            console.error('[Scheduler] Failed to schedule job:', error);
            return { success: false, error: error.message };
        }

        console.log(`[Scheduler] Job scheduled: ${data.id} for ${data.scheduled_for}`);

        return {
            success: true,
            jobId: data.id,
            scheduledFor: data.scheduled_for
        };
    } catch (error) {
        console.error('[Scheduler] Exception scheduling job:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Get pending jobs due for execution
 */
export async function getPendingJobs(batchSize: number = 10): Promise<ScheduledJob[]> {
    const supabase = await createClient();

    try {
        // Use the database function for atomic job claiming
        const { data, error } = await supabase
            .rpc('get_pending_scheduled_jobs', { batch_size: batchSize });

        if (error) {
            console.error('[Scheduler] Failed to get pending jobs:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[Scheduler] Exception getting pending jobs:', error);
        return [];
    }
}

/**
 * Mark a job as completed
 */
export async function completeJob(jobId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('scheduled_workflow_jobs')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (error) {
        console.error('[Scheduler] Failed to complete job:', error);
        return false;
    }

    return true;
}

/**
 * Mark a job as failed
 */
export async function failJob(jobId: string, errorMessage: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('scheduled_workflow_jobs')
        .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            last_error: errorMessage
        })
        .eq('id', jobId);

    if (error) {
        console.error('[Scheduler] Failed to mark job as failed:', error);
        return false;
    }

    return true;
}

/**
 * Retry a failed job (reset to pending)
 */
export async function retryJob(jobId: string, delayMinutes: number = 5): Promise<boolean> {
    const supabase = await createClient();

    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

    const { error } = await supabase
        .from('scheduled_workflow_jobs')
        .update({
            status: 'pending',
            scheduled_for: scheduledFor.toISOString(),
            started_at: null,
            completed_at: null
        })
        .eq('id', jobId);

    if (error) {
        console.error('[Scheduler] Failed to retry job:', error);
        return false;
    }

    return true;
}

/**
 * Cancel a pending job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('scheduled_workflow_jobs')
        .update({
            status: 'cancelled',
            completed_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending');

    if (error) {
        console.error('[Scheduler] Failed to cancel job:', error);
        return false;
    }

    return true;
}

/**
 * Get scheduled jobs for a workflow
 */
export async function getWorkflowScheduledJobs(workflowId: string): Promise<ScheduledJob[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('scheduled_workflow_jobs')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('scheduled_for', { ascending: true });

    if (error) {
        console.error('[Scheduler] Failed to get workflow jobs:', error);
        return [];
    }

    return data || [];
}

/**
 * Parse delay duration string to minutes
 * Supports: 5m, 2h, 1d, or just number (assumes minutes)
 */
export function parseDelayToMinutes(duration: string): number {
    const value = parseInt(duration);
    if (isNaN(value)) return 1;

    if (duration.endsWith('s')) return Math.max(1, Math.ceil(value / 60)); // Minimum 1 minute
    if (duration.endsWith('m')) return value;
    if (duration.endsWith('h')) return value * 60;
    if (duration.endsWith('d')) return value * 60 * 24;
    if (duration.endsWith('w')) return value * 60 * 24 * 7;

    return value; // Assume minutes if no suffix
}

/**
 * Format minutes to human-readable duration
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
    if (minutes < 60 * 24) {
        const hours = Math.floor(minutes / 60);
        return `${hours} hora${hours === 1 ? '' : 's'}`;
    }
    const days = Math.floor(minutes / (60 * 24));
    return `${days} día${days === 1 ? '' : 's'}`;
}
