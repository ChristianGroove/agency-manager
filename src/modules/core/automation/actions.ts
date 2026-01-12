'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { inngest } from "@/lib/inngest/client"
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
            const rawType = (triggerNode.data.triggerType as string) || 'webhook';
            const keyword = (triggerNode.data.keyword as string) || '';
            const hasKeyword = keyword.trim() !== '';

            // Build trigger config - only include keyword if it has a value
            triggerConfig = {
                channel: (triggerNode.data.channel as string) || 'whatsapp',
                ...(hasKeyword ? { keyword: keyword.trim() } : {}),
                // Include other config options based on trigger type
                ...(rawType === 'business_hours' || rawType === 'outside_hours' ? {
                    start_hour: (triggerNode.data.start_hour as number) ?? 9,
                    end_hour: (triggerNode.data.end_hour as number) ?? 18
                } : {}),
                ...(triggerNode.data.cooldown_minutes ? { cooldown_minutes: triggerNode.data.cooldown_minutes } : {})
            };

            // Map UI types to Backend types
            // 'webhook' in UI -> 'keyword' (if keyword exists) OR 'message_received' (catch-all)
            if (rawType === 'webhook') {
                if (hasKeyword) {
                    triggerType = 'keyword';
                } else {
                    triggerType = 'message_received';
                }
            } else {
                triggerType = rawType;
            }

            console.log('[saveWorkflow] Mapped trigger:', { rawType, triggerType, hasKeyword, triggerConfig });
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

export async function deleteWorkflow(id: string) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // Check if exists and belongs to org
        const { error: deleteError } = await supabase
            .from('workflows')
            .delete()
            .eq('id', id)
            .eq('organization_id', orgId)

        if (deleteError) throw deleteError

        revalidatePath('/dashboard/automations')
        revalidatePath('/crm/automations')
        return { success: true }
    } catch (error) {
        console.error("Error deleting workflow:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
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
            workflow_id,
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



        const { assertUsageAllowed } = await import("@/modules/core/billing/usage-limiter");
        await assertUsageAllowed({ organizationId: orgId, engine: 'automation' });

        // Create an execution record
        const executionId = crypto.randomUUID()
        const { error: execError } = await supabase
            .from('workflow_executions')
            .insert({
                id: executionId,
                workflow_id: workflowId,
                organization_id: orgId,
                status: 'pending', // Pending worker pickup
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

        console.log(`[Workflow] Dispatching Inngest event for ${workflow.name}`)

        // DISPATCH WORKER
        await inngest.send({
            name: "automation.execute",
            data: {
                executionId,
                organizationId: orgId,
                workflowId,
                workflowVersionId: 'latest' // we should track versions ideally
            }
        })

        return {
            success: true,
            executionId,
            message: `Workflow "${workflow.name}" queued for execution`
        }
    } catch (error) {
        console.error("Error triggering workflow:", error)
        return { success: false, error: String(error) }
    }
}

// --- Quick Actions for List View ---

export async function toggleWorkflow(id: string, isActive: boolean) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        const { error } = await supabase
            .from('workflows')
            .update({
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('organization_id', orgId)

        if (error) throw error

        revalidatePath('/dashboard/automations')
        return { success: true }
    } catch (error) {
        console.error("Error toggling workflow:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}

export async function updateWorkflowChannel(id: string, channelId: string | null) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("Unauthorized")

        // 1. Fetch current definition to keep in sync
        const { data: workflow, error: fetchError } = await supabase
            .from('workflows')
            .select('definition, trigger_config')
            .eq('id', id)
            .eq('organization_id', orgId)
            .single()

        if (fetchError || !workflow) throw new Error("Workflow not found")

        let definition = workflow.definition as WorkflowDefinition;
        // Ensure triggerConfig is treated as object
        let triggerConfig: Record<string, unknown> = (workflow.trigger_config && typeof workflow.trigger_config === 'object')
            ? workflow.trigger_config as Record<string, unknown>
            : {};

        // 2. Update Trigger Node in Definition
        if (definition && definition.nodes) {
            definition.nodes = definition.nodes.map((node: any) => {
                if (node.type === 'trigger') {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            channel: channelId
                        }
                    };
                }
                return node;
            });
        }

        // 3. Update Trigger Config
        triggerConfig = {
            ...triggerConfig,
            channel: channelId || 'whatsapp' // Fallback
        };

        // 4. Save updates
        const { error: updateError } = await supabase
            .from('workflows')
            .update({
                definition,
                trigger_config: triggerConfig,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (updateError) throw updateError

        revalidatePath('/dashboard/automations')
        return { success: true }

    } catch (error) {
        console.error("Error updating workflow channel:", error)
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
}
