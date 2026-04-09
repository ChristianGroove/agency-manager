"use server"

import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

import { type CRMTemplate, CRMTemplates } from "./templates-shared"

// ---------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------

export async function getAvailableTemplatesAction(): Promise<CRMTemplate[]> {
    return Object.values(CRMTemplates)
}

export async function applyTemplateAction(templateId: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("No organization context")
    
    // This calls the init service
    const { initializeOrganizationCRM } = await import("../process-engine/init")
    await initializeOrganizationCRM(orgId, templateId)
    
    revalidatePath('/crm')
    return { success: true }
}

