"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function getLeadsCount() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return 0

    const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

    if (error) {
        console.error("Error counting leads:", error)
        return 0
    }

    return count || 0
}

export async function deleteLeads(leadIds: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No authenticated organization" }

    if (!leadIds.length) return { success: true }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)
        .in('id', leadIds)

    if (error) {
        console.error("Error deleting leads:", error)
        return { success: false, error: error.message }
    }

    revalidatePath('/crm')
    return { success: true }
}

export async function deleteLeadsByPipeline(pipelineId: string) {
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
        .from('crm_stages')
        .select('id')
        .eq('pipeline_id', pipelineId)
        .eq('organization_id', orgId)

    if (!stages?.length) return { success: false, error: "No stages found for pipeline" }

    const stageIds = stages.map(s => s.id)

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)
        .in('stage_id', stageIds)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/crm')
    return { success: true }
}

export async function deleteAllLeads() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No authenticated organization" }

    const { error } = await supabase
        .from('leads')
        .delete()
        .eq('organization_id', orgId)

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/crm')
    return { success: true }
}
