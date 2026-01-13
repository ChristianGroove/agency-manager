"use server"

import { AnalysisService } from "./analysis-service"
import { ProcessEngine } from "@/modules/core/crm/process-engine/engine"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export async function getLeadAnalysis(leadId: string) {
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return { success: false, error: "No context" }

        // 1. Get Context
        const context = await ProcessEngine.getProcessContext(leadId)
        if (!context) {
            return { success: false, error: "No active process found for analysis" }
        }

        // 2. Analyze
        const recommendations = await AnalysisService.analyzeLead(context.instance, context.state)

        return { success: true, recommendations }
    } catch (error: any) {
        console.error("Analysis Error:", error)
        return { success: false, error: error.message }
    }
}
