"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { messagingCleanupService } from "@/modules/features/messaging/cleanup-service"

const PUBLIC_LEAD_MANAGEMENT_ERROR = "No se pudo completar la accion de gestion de leads"

type LeadManagementResponse = { success: true } | { success: false; error: string }

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeLeadManagementError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logLeadManagementError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeLeadManagementError(error) : error)
}

function leadManagementFailure(label: string, error: unknown): LeadManagementResponse {
    logLeadManagementError(label, error)
    if (isDeployedRuntime()) return { success: false, error: PUBLIC_LEAD_MANAGEMENT_ERROR }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_LEAD_MANAGEMENT_ERROR }
}

async function getCrmServices() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    return { supabase, orgId }
}

export async function getLeadsCount(userId?: string) {
    const { supabase, orgId } = await getCrmServices()
    if (!orgId) return 0

    try {
        let query = supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId)
        
        if (userId) {
            query = query.eq('user_id', userId)
        }
            
        const { count, error } = await query
        if (error) throw error
        return count || 0
    } catch (e) {
        logLeadManagementError("Error counting leads:", e)
        return 0
    }
}

export async function deleteLeads(leadIds: string[]): Promise<LeadManagementResponse> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No authenticated organization" }

    if (!leadIds.length) return { success: true }

    const { data: scopedLeads, error: scopedLeadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', orgId)
        .in('id', leadIds)

    if (scopedLeadsError) {
        return leadManagementFailure("Error validating leads for deletion:", scopedLeadsError)
    }

    const scopedLeadIds = (scopedLeads || []).map(lead => lead.id)
    if (!scopedLeadIds.length) return { success: true }

    // 1. CLEANUP PHYSICAL MEDIA (Prevent orphans in Storage)
    try { await messagingCleanupService.deleteLeadsMedia(scopedLeadIds, orgId); } catch (e) { logLeadManagementError("[LeadActions] Media cleanup error:", e); }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)
        .in('id', scopedLeadIds)

    if (error) {
        return leadManagementFailure("Error deleting leads:", error)
    }

    revalidatePath('/crm')
    return { success: true }
}

export async function deleteLeadsByPipeline(pipelineId: string): Promise<LeadManagementResponse> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No authenticated organization" }

    // First find stages for this pipeline to be safe, or just relying on pipeline_id if leads have it?
    // Leads usually have `stage_id`. Stages link to Pipeline.
    // So we need to find all leads where stage_id is in (select id from stages where pipeline_id = X)

    // We can do this in one query if RLS allows.
    // However, leads might not have direct pipeline_id column? Check schema?
    // Assuming standard: Lead -> Stage -> Pipeline.

    // Let's verify if leads have pipeline_id. If not, use subquery.
    // For now, assuming subquery via join is safest.

    const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('status_key')
        .eq('pipeline_id', pipelineId)
        .eq('organization_id', orgId)

    if (!stages?.length) return { success: false, error: "No stages found for pipeline" }

    const statusKeys = stages.map(s => s.status_key)

    // 1. CLEANUP PHYSICAL MEDIA (Find leads first by status)
    const { data: leadsToDelete } = await supabase.from('leads').select('id').eq('organization_id', orgId).in('status', statusKeys);
    if (leadsToDelete?.length) {
        try { await messagingCleanupService.deleteLeadsMedia(leadsToDelete.map(l => l.id), orgId); } catch (e) { logLeadManagementError("[LeadActions] Pipeline media cleanup error:", e); }
    }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)
        .in('status', statusKeys)

    if (error) {
        return leadManagementFailure("Error deleting leads by pipeline:", error)
    }

    revalidatePath('/crm')
    return { success: true }
}

export async function deleteAllLeads(): Promise<LeadManagementResponse> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No authenticated organization" }

    // 1. CLEANUP ALL PHYSICAL MEDIA FOR THIS ORG
    const { data: leads } = await supabase.from('leads').select('id').eq('organization_id', orgId);
    if (leads?.length) {
        try { await messagingCleanupService.deleteLeadsMedia(leads.map(l => l.id), orgId); } catch (e) { logLeadManagementError("[LeadActions] All leads media cleanup error:", e); }
    }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)

    if (error) {
        return leadManagementFailure("Error deleting all leads:", error)
    }

    revalidatePath('/crm')
    return { success: true }
}

