'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { WorkflowDefinition } from "./engine"

export async function saveWorkflow(id: string, name: string, description: string, definition: WorkflowDefinition, isActive: boolean = false) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // Extract Trigger Config from Nodes to sync with SQL columns
        // This is crucial for the WebhookManager to find this workflow efficiently
        const triggerNode = definition.nodes.find((n: any) => n.type === 'trigger');
        let triggerType = 'webhook'; // Default
        let triggerConfig: Record<string, unknown> = { channel: 'whatsapp' }; // Default

        if (triggerNode && triggerNode.data) {
            triggerType = (triggerNode.data.triggerType as string) || 'webhook';
            triggerConfig = {
                channel: (triggerNode.data.channel as string) || 'whatsapp',
                keyword: (triggerNode.data.keyword as string) || undefined
            };
        }

        // Check if exists
        const { data: existing } = await supabase
            .from('workflows')
            .select('id')
            .eq('id', id)
            .single()

        let result;

        if (existing) {
            // Update
            result = await supabase
                .from('workflows')
                .update({
                    name,
                    description,
                    definition,
                    is_active: isActive,
                    // Sync trigger columns
                    trigger_type: triggerType,
                    trigger_config: triggerConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
        } else {
            // Create
            result = await supabase
                .from('workflows')
                .insert({
                    id,
                    organization_id: orgId,
                    name,
                    description,
                    definition,
                    is_active: isActive,
                    // Sync trigger columns
                    trigger_type: triggerType,
                    trigger_config: triggerConfig
                })
                .select()
        }

        if (result.error) throw result.error

        revalidatePath('/dashboard/automations')
        return { success: true, data: result.data[0] }

    } catch (error) {
        console.error("Error saving workflow:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

export async function getWorkflow(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single()

    if (error) return null
    return data
}

export async function queueWorkflowForResume(executionId: string, stepId: string, resumeAt: Date) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('automation_queue')
        .insert({
            execution_id: executionId,
            step_id: stepId,
            resume_at: resumeAt.toISOString(),
            status: 'pending'
        })

    // Update execution status to waiting
    await supabase
        .from('workflow_executions')
        .update({ status: 'waiting' })
        .eq('id', executionId)

    if (error) {
        console.error("Error queuing workflow:", error)
        throw new Error("Failed to queue workflow")
    }
    return { success: true }
}

export async function getWorkflowStats(workflowId?: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { total: 0, success: 0, failed: 0, avgDuration: 0 }

    let query = supabase
        .from('workflow_executions')
        .select('status, started_at, completed_at', { count: 'exact' })
        .eq('organization_id', orgId)

    if (workflowId) {
        query = query.eq('workflow_id', workflowId)
    }

    const { data, error, count } = await query

    if (error || !data) return { total: 0, success: 0, failed: 0, avgDuration: 0 }

    const total = count || 0
    const success = data.filter(e => e.status === 'completed').length
    const failed = data.filter(e => e.status === 'failed').length

    // Calculate avg duration for completed runs
    const durations = data
        .filter(e => e.status === 'completed' && e.started_at && e.completed_at)
        .map(e => new Date(e.completed_at).getTime() - new Date(e.started_at).getTime())

    const totalDuration = durations.reduce((a, b) => a + b, 0)
    const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0

    return {
        total,
        success,
        failed,
        avgDuration
    }
}

export async function getExecutionHistory(limit: number = 50) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data } = await supabase
        .from('workflow_executions')
        .select(`
            id,
            status,
            started_at,
            completed_at,
            workflows (name)
        `)
        .eq('organization_id', orgId)
        .order('started_at', { ascending: false })
        .limit(limit)

    return data || []
}

export async function createWorkflowVersion(workflowId: string, name?: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    // 1. Get current workflow
    const { data: workflow, error: wfError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('organization_id', orgId)
        .single()

    if (wfError || !workflow) throw new Error("Workflow not found")

    // 2. Get next version number
    const { data: latestVersion } = await supabase
        .from('workflow_versions')
        .select('version_number')
        .eq('workflow_id', workflowId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single()

    const versionNumber = (latestVersion?.version_number || 0) + 1

    // 3. Create version
    const { error: insertError } = await supabase
        .from('workflow_versions')
        .insert({
            workflow_id: workflowId,
            version_number: versionNumber,
            definition: workflow.definition,
            name: name || `Version ${versionNumber}`,
            created_by: (await supabase.auth.getUser()).data.user?.id
        })

    if (insertError) {
        console.error("Error creating version:", insertError)
        throw new Error("Failed to create version")
    }

    revalidatePath(`/automations/${workflowId}`)
    return { success: true, version: versionNumber }
}

export async function getWorkflowVersions(workflowId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    // Verify ownership via workflow lookup first or use RLS (RLS is safer)
    // Here we rely on RLS policies we created.

    const { data, error } = await supabase
        .from('workflow_versions')
        .select('id, version_number, name, created_at, created_by')
        .eq('workflow_id', workflowId)
        .order('version_number', { ascending: false })

    if (error) {
        console.error("Error fetching versions:", error)
        return []
    }

    return data
}

export async function restoreWorkflowVersion(workflowId: string, versionId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Unauthorized")

    // 1. Get the version definition
    const { data: version, error: vError } = await supabase
        .from('workflow_versions')
        .select('definition, version_number')
        .eq('id', versionId)
        .single()

    if (vError || !version) throw new Error("Version not found")

    // 2. Update workflow with this definition
    // Note: We might want to save a backup of current state before restoring?
    // For now, we trust the user's intent.

    const { error: updateError } = await supabase
        .from('workflows')
        .update({
            definition: version.definition,
            updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .eq('organization_id', orgId) // Extra safety

    if (updateError) {
        console.error("Error restoring version:", updateError)
        throw new Error("Failed to restore version")
    }

    revalidatePath(`/dashboard/automations/${workflowId}`)
    return { success: true, versionNumber: version.version_number }
}

export async function executeAIAction(userPrompt: string, model: string, systemPrompt?: string) {
    // Simulate AI Latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In real implementation, this would call OpenAI/Anthropic API
    console.log(`[AI-Mock] Executing: ${model}`);
    console.log(`[AI-Mock] System: ${systemPrompt}`);
    console.log(`[AI-Mock] User: ${userPrompt}`);

    return {
        success: true,
        output: `[AI Output (${model})] processed: "${userPrompt.substring(0, 30)}..."`,
        usage: { tokens: userPrompt.length }
    };
}

// Get list of active workflows for manual triggering
export async function getActiveWorkflows() {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { data, error } = await supabase
            .from('workflows')
            .select('id, name, description, is_active, trigger_type')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name')

        if (error) throw error

        return { success: true, workflows: data || [] }
    } catch (error) {
        console.error("Error fetching active workflows:", error)
        return { success: false, error: String(error), workflows: [] }
    }
}

// Manually trigger a workflow for a specific lead
export async function triggerWorkflowForLead(workflowId: string, leadId: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // Get the workflow
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .select('id, name, definition, is_active')
            .eq('id', workflowId)
            .eq('organization_id', orgId)
            .single()

        if (wfError || !workflow) {
            throw new Error('Workflow not found')
        }

        if (!workflow.is_active) {
            throw new Error('Workflow is not active')
        }

        // Get the lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('id, name, email, phone, company_name')
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .single()

        if (leadError || !lead) {
            throw new Error('Lead not found')
        }

        // Create an execution record
        const executionId = crypto.randomUUID()
        const { error: execError } = await supabase
            .from('workflow_executions')
            .insert({
                id: executionId,
                workflow_id: workflowId,
                organization_id: orgId,
                status: 'running',
                context: {
                    trigger: 'manual',
                    lead_id: leadId,
                    lead_name: lead.name,
                    lead_email: lead.email,
                    lead_phone: lead.phone,
                    lead_company: lead.company_name
                },
                started_at: new Date().toISOString()
            })

        if (execError) throw execError

        console.log(`[Workflow] Manually triggered ${workflow.name} for lead ${lead.name}`)

        // In a real implementation, this would start the workflow engine
        // For now, we mark it as completed after a simulated delay
        setTimeout(async () => {
            const supabaseInternal = await createClient()
            await supabaseInternal
                .from('workflow_executions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', executionId)
        }, 2000)

        return {
            success: true,
            executionId,
            message: `Workflow "${workflow.name}" triggered for ${lead.name}`
        }
    } catch (error) {
        console.error("Error triggering workflow:", error)
        return { success: false, error: String(error) }
    }
}
