
"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getPipelineStages } from "./pipeline-actions"
import { revalidatePath } from "next/cache"

export async function fixLeadsStatus() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No Org" }

    // 1. Get Valid Stages
    const stages = await getPipelineStages()
    if (stages.length === 0) return { success: false, error: "No Stages Configured" }

    const firstStageKey = stages[0].status_key
    const validKeys = new Set(stages.map(s => s.status_key))

    // 2. Get All Leads
    const { data: leads } = await supabase
        .from('leads')
        .select('id, status')
        .eq('organization_id', orgId)

    if (!leads) return { success: true, count: 0 }

    // 3. Find Orphans
    const orphans = leads.filter(l => !validKeys.has(l.status))

    if (orphans.length === 0) return { success: true, count: 0, message: "No orphans found" }

    // 4. Update Orphans
    const orphanIds = orphans.map(l => l.id)
    const { error } = await supabase
        .from('leads')
        .update({ status: firstStageKey })
        .in('id', orphanIds)

    if (error) return { success: false, error: error.message }

    revalidatePath('/crm')
    return { success: true, count: orphans.length, fixedTo: firstStageKey }
}
