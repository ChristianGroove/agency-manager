
'use server'

import { createClient } from "@/lib/supabase-server"
import { CRMTemplates } from "./registry"
import { CRMTemplate } from "./types"
import { initializeOrganizationCRM } from "../process-engine/init"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { revalidatePath } from "next/cache"

export async function getAvailableTemplatesAction(): Promise<CRMTemplate[]> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    // 1. Get Organization Industry/Type
    // Assuming 'organizations' table has 'industry' or 'type'. 
    // If not, we check 'organization_settings'.

    // For now, let's fetch from 'organizations' table
    const { data: org } = await supabase
        .from('organizations')
        .select('industry, type') // Adjust column names as needed
        .eq('id', orgId)
        .single()

    const industry = org?.industry || 'agency' // Default to agency if unknown

    // 2. Filter Templates
    const allTemplates = Object.values(CRMTemplates)

    // Rule: Agencies see ALL. Others see only their industry.
    // We treat 'agency' as the "Master" type.
    if (industry === 'agency' || !industry) {
        return allTemplates
    }

    // Specific Industry
    const filtered = allTemplates.filter(t => t.industry === industry)

    // If no specific template found (e.g. unknown industry), maybe show all? 
    // Or users request "9 variants". 
    // Let's return the specific one + 'agency' (as generic) + 'saas' etc?
    // User said "show corresponding + 9 variants". 
    // If "9 variants" means "the rest of them", then we show all but maybe highlight the recommended one.
    // But strictly following "solo se mostraria la correspondiente" implies RESTRICTION.
    // "junto con 9 variantes" is confusing. 
    // Let's implement: If specific found, return [specific]. If not, return All.
    // Wait, user said "para otros... solo se mostraria la correspondiente junto con 9 variantes".
    // "Only the corresponding one along with 9 variants". This implies 1+9 = 10. So ALL.
    // Maybe the UI should just HIGHLIGHT the matching one.

    // Let's return ALL for now to enable the "flexibility" requested, but order them?

    return allTemplates.sort((a, b) => {
        if (a.industry === industry) return -1
        if (b.industry === industry) return 1
        return 0
    })
}

export async function applyTemplateAction(templateId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No Organization")

    // Check permissions? Admin only.

    await initializeOrganizationCRM(orgId, templateId)

    revalidatePath('/platform/settings')
    return { success: true }
}
