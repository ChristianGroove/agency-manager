
"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getPipelineStages } from "./pipeline-actions"
import { revalidatePath } from "next/cache"

const PUBLIC_FIX_ACTION_ERROR = "No se pudo reparar el estado de los leads"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeFixError(error: unknown) {
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

function logFixError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeFixError(error) : error)
}

function fixActionFailure(error: unknown) {
    logFixError("Error fixing lead statuses:", error)
    if (isDeployedRuntime()) return { success: false, error: PUBLIC_FIX_ACTION_ERROR }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_FIX_ACTION_ERROR }
}

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
        .eq('organization_id', orgId)
        .in('id', orphanIds)

    if (error) return fixActionFailure(error)

    revalidatePath('/crm')
    return { success: true, count: orphans.length, fixedTo: firstStageKey }
}

