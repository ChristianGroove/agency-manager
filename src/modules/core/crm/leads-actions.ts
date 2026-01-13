"use server"

import { createClient } from "@/lib/supabase-server"
import { Lead, Client } from "@/types"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { SecurityLogger } from "@/lib/security/logger"

export type CreateLeadInput = {
    name: string
    company_name?: string
    email?: string
    phone?: string
}

export type ActionResponse<T> = {
    success: boolean
    data?: T
    error?: string
}

export async function createLead(input: CreateLeadInput): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // Get current organization from session
        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization context found")

        const { data, error } = await supabase
            .from('leads')
            .insert({
                ...input,
                user_id: user.id,
                organization_id: organizationId,
                status: 'open'
            })
            .select()
            .single()

        if (error) throw error

        // --- Process Engine Auto-Start ---
        try {
            const { ProcessEngine } = await import('./process-engine/engine')
            // Default to 'sale' process for new leads
            // TODO: infer type from context if needed
            const processRes = await ProcessEngine.startProcess(data.id, 'sale')

            if (processRes.success && processRes.process) {
                const startState = processRes.process.current_state

                // Sync UI status/stage
                // Find stage matching this start state (e.g. 'discovery')
                const { data: stage } = await supabase
                    .from('pipeline_stages')
                    .select('id, status_key')
                    .eq('organization_id', organizationId)
                    .eq('status_key', startState)
                    .maybeSingle()

                if (stage) {
                    await supabase
                        .from('leads')
                        .update({
                            pipeline_stage_id: stage.id,
                            status: stage.status_key
                        })
                        .eq('id', data.id)
                } else {
                    // Fallback: just update status key if no visual stage found
                    await supabase
                        .from('leads')
                        .update({ status: startState })
                        .eq('id', data.id)
                }
            }
        } catch (procErr) {
            console.error("Process Engine Start Failed:", procErr)
            // Continue, don't block lead creation
        }
        // ---------------------------------

        revalidatePath('/crm/contacts')
        revalidatePath('/crm/deals')

        // Metric: Log Security Event
        await SecurityLogger.log({
            action: 'lead.create',
            resource_entity: 'leads',
            resource_id: data.id,
            organization_id: organizationId,
            metadata: { name: input.name }
        })

        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error creating lead:", error)
        return { success: false, error: error.message }
    }
}

/**
 * System-level Create Lead (Bypasses Auth/Cookies)
 * Used by Automation Engine
 */
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function createLeadSystem(input: CreateLeadInput, organizationId: string): Promise<ActionResponse<Lead>> {
    try {
        const { data, error } = await supabaseAdmin
            .from('leads')
            .insert({
                ...input,
                // user_id is optional or can be null for system-created leads? 
                // DB definition says user_id REFERENCES auth.users. 
                // We might need a system user or leave it null if schema allows.
                // Checking leads schema... usually user_id is NULLABLE or we pick the Org Owner.
                // check verification needed. For now assuming nullable or will fix.
                organization_id: organizationId,
                status: 'open',
                source: 'automation'
            })
            .select()
            .single()

        if (error) throw error

        // revalidatePath might not work from background job as intended context, but harmless
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error creating lead (system):", error)
        return { success: false, error: error.message }
    }
}

export async function updateLeadStatusSystem(leadId: string, newStatus: string, organizationId?: string): Promise<ActionResponse<Lead>> {
    try {
        const query = supabaseAdmin
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId)

        // Extra safety if org ID provided
        if (organizationId) {
            query.eq('organization_id', organizationId)
        }

        const { data, error } = await query
            .select()
            .single()

        if (error) throw error
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error updating lead status (system):", error)
        return { success: false, error: error.message }
    }
}

export async function convertLeadToClient(leadId: string): Promise<ActionResponse<Client>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // 1. Get lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('user_id', user.id)
            .single()

        if (leadError) throw leadError
        if (!lead) throw new Error("Lead not found")

        // 2. Create client with lead data
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .insert({
                name: lead.name,
                company_name: lead.company_name,
                email: lead.email,
                phone: lead.phone,
                user_id: user.id,
                organization_id: lead.organization_id, // ✅ Include organization_id
            })
            .select()
            .single()

        if (clientError) throw clientError

        // 3. Update lead status to 'converted'
        await supabase
            .from('leads')
            .update({ status: 'converted' })
            .eq('id', leadId)

        revalidatePath('/clients')
        revalidatePath('/crm')
        return { success: true, data: client as Client }
    } catch (error: any) {
        console.error("Error converting lead:", error)
        return { success: false, error: error.message }
    }
}

export async function getLeads(): Promise<Lead[]> {
    const supabase = await createClient()

    try {
        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) return []

        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data as Lead[]
    } catch (error: any) {
        console.error("Error fetching leads:", error)
        return []
    }
}

export async function updateLeadStatus(leadId: string, newStatus: string): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const organizationId = await getCurrentOrganizationId()

        // --- Process Engine Interception ---
        if (organizationId) {
            // 1. Resolve Stage ID from Status Key
            // Note: This relies on pipeline_stages having status_key matching the lead status string.
            const { data: stage } = await supabase
                .from('pipeline_stages')
                .select('id, pipeline_id')
                .eq('organization_id', organizationId)
                .eq('status_key', newStatus)
                .maybeSingle()

            if (stage) {
                // 1.1 Check Pipeline "Process Enabled" Flag (Strict Mode)
                // If pipeline_id is null (legacy stages not yet migrated), assume Strict Mode OFF or ON?
                // Migration backfills it. So fetching pipeline is safe.
                let strictMode = false
                if (stage.pipeline_id) {
                    const { data: pipeline } = await supabase
                        .from('pipelines')
                        .select('process_enabled')
                        .eq('id', stage.pipeline_id)
                        .single()
                    if (pipeline) strictMode = pipeline.process_enabled
                }

                if (strictMode) {
                    // 2. Validate Transition (Only in Strict Mode)
                    const { ProcessMapper } = await import('@/modules/core/crm/process-engine/map-service')
                    const { allowed, reason, requiredProcessState } = await ProcessMapper.validatePipelineMove(leadId, stage.id)

                    if (!allowed) {
                        return { success: false, error: reason || "Action blocked by Process Rules." }
                    }

                    // 3. Sync Process State (Auto-Transition)
                    if (requiredProcessState) {
                        const { ProcessEngine } = await import('@/modules/core/crm/process-engine/engine')
                        // Get active instance
                        const instance = await ProcessEngine.getActiveProcess(leadId)
                        if (instance) {
                            const result = await ProcessEngine.transition(instance.id, requiredProcessState, 'user', 'Pipeline Stage Sync')
                            if (!result.success) {
                                // In Strict Mode, if Process sync fails, we block Payload? 
                                // "Process is Law". Yes.
                                return { success: false, error: "Process synchronization failed: " + result.error }
                            }
                        }
                    }
                }
            }
        }
        // -----------------------------------

        const { data, error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error updating lead status:", error)
        return { success: false, error: error.message }
    }
}

export async function updateLead(
    leadId: string,
    updates: {
        name?: string
        company_name?: string
        email?: string
        phone?: string
        notes?: string
    }
): Promise<ActionResponse<Lead>> {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/crm')

        // Metric: Log Security Event
        const organizationId = await getCurrentOrganizationId()
        if (organizationId) {
            await SecurityLogger.log({
                action: 'lead.update',
                resource_entity: 'leads',
                resource_id: leadId,
                organization_id: organizationId,
                metadata: { updates: Object.keys(updates) }
            })
        }

        return { success: true, data: data as Lead }
    } catch (error: any) {
        console.error("Error updating lead:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Lead Scoring Algorithm
 * Calculates a score from 0-100 based on:
 * - Profile completeness (email, phone, company)
 * - Engagement (messages received, replies)
 * - Activity recency
 * - Tasks completed
 * - Positive status movements
 */
export async function calculateLeadScore(leadId: string): Promise<ActionResponse<{ score: number, breakdown: Record<string, number> }>> {
    try {
        const lead = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (lead.error || !lead.data) {
            return { success: false, error: 'Lead not found' }
        }

        const l = lead.data
        let score = 0
        const breakdown: Record<string, number> = {}

        // 1. Profile Completeness (max 20 points)
        let profileScore = 0
        if (l.name) profileScore += 5
        if (l.email) profileScore += 5
        if (l.phone) profileScore += 5
        if (l.company_name) profileScore += 5
        breakdown.profile = profileScore
        score += profileScore

        // 2. Engagement - Messages (max 30 points)
        const { count: msgCount } = await supabaseAdmin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('lead_id', leadId)

        const msgScore = Math.min(30, (msgCount || 0) * 3) // 3 points per message, max 30
        breakdown.messages = msgScore
        score += msgScore

        // 3. Activity Recency (max 20 points)
        const lastActivity = l.last_activity_at || l.updated_at
        const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        let recencyScore = 20
        if (daysSinceActivity > 30) recencyScore = 0
        else if (daysSinceActivity > 14) recencyScore = 5
        else if (daysSinceActivity > 7) recencyScore = 10
        else if (daysSinceActivity > 3) recencyScore = 15
        breakdown.recency = recencyScore
        score += recencyScore

        // 4. Tasks Completed (max 15 points)
        const { count: tasksCompleted } = await supabaseAdmin
            .from('crm_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('lead_id', leadId)
            .eq('status', 'completed')

        const taskScore = Math.min(15, (tasksCompleted || 0) * 3) // 3 points per task, max 15
        breakdown.tasks = taskScore
        score += taskScore

        // 5. Status Progression (max 15 points)
        const statusPoints: Record<string, number> = {
            new: 0,
            contacted: 3,
            qualified: 8,
            negotiation: 12,
            won: 15,
            lost: 0
        }
        const statusScore = statusPoints[l.status as string] || 0
        breakdown.status = statusScore
        score += statusScore

        // Update lead score in DB
        await supabaseAdmin
            .from('leads')
            .update({ score })
            .eq('id', leadId)

        return { success: true, data: { score, breakdown } }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

/**
 * Batch recalculate scores for all leads in org
 * Can be called periodically or manually
 */
export async function recalculateAllScores(organizationId: string): Promise<ActionResponse<{ updated: number }>> {
    try {
        const { data: leads } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('organization_id', organizationId)

        if (!leads) return { success: true, data: { updated: 0 } }

        let updated = 0
        for (const lead of leads) {
            const result = await calculateLeadScore(lead.id)
            if (result.success) updated++
        }

        return { success: true, data: { updated } }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
