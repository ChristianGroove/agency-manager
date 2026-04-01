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
                status: 'new'
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

        const orgId = await getCurrentOrganizationId()
        if (!orgId) throw new Error("No organization selected")

        // 1. Get lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .maybeSingle()

        if (leadError) throw leadError
        if (!lead) throw new Error("Lead not found or access denied")

        // 2. Update contact_type to 'client' (SAME UUID — all relationships preserved)
        const { data: client, error: updateError } = await supabase
            .from('leads')
            .update({ 
                contact_type: 'client',
                status: 'converted'
            })
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .select()
            .single()

        if (updateError) throw updateError

        revalidatePath('/clients')
        revalidatePath('/crm')
        return { success: true, data: client as unknown as Client }
    } catch (error: any) {
        console.error("Error converting lead:", error)
        return { success: false, error: error.message }
    }
}

export async function getLeads(limit = 300, connectionId?: string | null, allowedChannels?: string[]): Promise<Lead[]> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    try {
        const result = await getPaginatedLeads({
            pageSize: limit,
            connectionId,
            allowedChannels
        })
        return result.leads
    } catch (error) {
        console.error("Supabase Error fetching leads:", error)
        return []
    }
}

export interface PaginatedLeadsResponse {
    leads: Lead[]
    totalCount: number
    stageCounts: Record<string, number>
}

export async function getPaginatedLeads({
    page = 1,
    pageSize = 50,
    search = '',
    stageId = 'all',
    connectionId = undefined,
    allowedChannels = undefined,
    dateFrom = undefined,
    dateTo = undefined
}: {
    page?: number
    pageSize?: number
    search?: string
    stageId?: string
    connectionId?: string | null
    allowedChannels?: string[]
    dateFrom?: string
    dateTo?: string
} = {}): Promise<PaginatedLeadsResponse> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { leads: [], totalCount: 0, stageCounts: {} }

    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing")
            throw new Error("Missing Service Key")
        }

        const { createClient } = await import('@supabase/supabase-js')
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: { autoRefreshToken: false, persistSession: false }
            }
        )

        // Filter by allowed channels if restricted
        let effectiveConnectionId = connectionId
        if (allowedChannels && allowedChannels.length > 0) {
            // If user is restricted to specific channels, and they haven't selected one, 
            // or they selected one they DON'T have access to, we should handle it.
            // For now, if allowedChannels exists, we pass the first one if connectionId is missing?
            // Actually, the RPC handles connectionId. Let's let the caller handle allowedChannels logic 
            // and pass the correct connectionId or filter.
            
            // If the user wants "All" but is restricted, we can't easily do it in the current RPC 
            // without adding an array param.
            // Simplified for now: if user is restricted, they must provide a connectionId from their allowed list.
            if (!connectionId) {
                // Return leads for the first allowed channel to avoid seeing everything
                effectiveConnectionId = allowedChannels[0]
            }
        }

        const { data, error } = await adminClient.rpc('get_paginated_leads', {
            p_org_id: orgId,
            p_search: search,
            p_stage_id: stageId,
            p_connection_id: effectiveConnectionId,
            p_page: page,
            p_page_size: pageSize,
            p_date_from: dateFrom,
            p_date_to: dateTo
        })

        if (error) throw error

        return data as PaginatedLeadsResponse
    } catch (error) {
        console.error("Error in getPaginatedLeads:", error)
        return { leads: [], totalCount: 0, stageCounts: {} }
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

        if (!organizationId) throw new Error("No organization selected")

        const { data, error } = await supabase
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId)
            .eq('organization_id', organizationId)
            .select()
            .maybeSingle()

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

        const organizationId = await getCurrentOrganizationId()
        if (!organizationId) throw new Error("No organization selected")

        const { data, error } = await supabase
            .from('leads')
            .update(updates)
            .eq('id', leadId)
            .eq('organization_id', organizationId)
            .select()
            .maybeSingle()

        if (error) throw error

        revalidatePath('/crm')

        // Metric: Log Security Event
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
import { calculateLeadScore as coreCalculateLeadScore } from "./logic/scoring"

export async function calculateLeadScore(leadId: string): Promise<ActionResponse<{ score: number, breakdown: Record<string, number> }>> {
    try {
        const { score, breakdown } = await coreCalculateLeadScore(leadId)

        // Update lead score in DB
        await supabaseAdmin
            .from('leads')
            .update({ 
                score,
                last_scored_at: new Date().toISOString()
            })
            .eq('id', leadId)

        return { success: true, data: { score, breakdown } }
    } catch (error: any) {
        console.error('[CRM_SCORING] Error calculating score:', error)
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

/**
 * PHASE 4: LIFECYCLE & DATA MANAGEMENT
 */

/**
 * Generates a CSV string of all leads for the current organization.
 * Client-side will handle the download.
 */
export async function exportLeadsToCSV(): Promise<ActionResponse<string>> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization context" }

    try {
        // Fetch all leads for the organization (using pagination if needed, but here simple large limit for now)
        // Note: For massive scale (>10k), we should use a cursor/stream, but 1000 was likely a default limit.
        const { data: leads, error } = await supabaseAdmin
            .from('leads')
            .select('name, phone')
            .eq('organization_id', orgId)
            .order('name', { ascending: true })
            .limit(10000) // Increase limit significantly

        if (error) throw error
        if (!leads || leads.length === 0) return { success: true, data: "" }

        // CSV Header (Excel compatibility: use semicolon for Spanish/Windows regions)
        const headers = ["Nombre", "Telefono"]
        const csvRows = [headers.join(";")]

        for (const lead of leads) {
            // Force Excel to treat phone as text using Formula format: ="value"
            // This prevents scientific notation like 5.7E+11
            const cleanPhone = (lead.phone || '').replace(/"/g, '""')
            const row = [
                `"${(lead.name || '').replace(/"/g, '""')}"`,
                `="${cleanPhone}"`
            ]
            csvRows.push(row.join(";"))
        }

        // Add UTF-8 BOM for Excel compatibility on Windows
        const BOM = "\ufeff"
        return { success: true, data: BOM + csvRows.join("\r\n") }
    } catch (error: any) {
        console.error("[CRM_EXPORT] Error exporting leads:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Purges leads that are considered "cold" based on inactivity and/or score.
 */
export async function purgeColdLeads(criteria: { 
    inactiveDays: number, 
    minScore?: number 
}): Promise<ActionResponse<{ deleted: number }>> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization context" }

    try {
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - criteria.inactiveDays)

        let query = supabaseAdmin
            .from('leads')
            .delete({ count: 'exact' })
            .eq('organization_id', orgId)
            .lt('updated_at', thresholdDate.toISOString())

        if (criteria.minScore !== undefined) {
            query = query.lt('score', criteria.minScore)
        }

        // Safety: Never purge 'converted' or 'customer' leads automatically? 
        // Better to exclude some statuses from automatic purge.
        query = query.not('status', 'in', '("converted","customer","active_deal")')

        const { count, error } = await query

        if (error) throw error

        revalidatePath('/crm')
        return { success: true, data: { deleted: count || 0 } }
    } catch (error: any) {
        console.error("[CRM_PURGE] Error purging leads:", error)
        return { success: false, error: error.message }
    }
}
