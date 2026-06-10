"use server"

import { AnalysisService } from "./analysis-service"
import { ProcessEngine } from "@/modules/features/crm/services/process-engine/engine"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_LEAD_ANALYSIS_ERROR = "No se pudo generar el analisis del lead"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeAnalysisError(error: unknown) {
    if (error instanceof Error) {
        const detail = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown }
        return {
            name: error.name,
            code: detail.code,
            status: detail.status,
            statusCode: detail.statusCode,
        }
    }

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

function leadAnalysisFailure(error: unknown) {
    console.error("Analysis Error:", isDeployedRuntime() ? summarizeAnalysisError(error) : error)

    if (isDeployedRuntime()) return { success: false, error: PUBLIC_LEAD_ANALYSIS_ERROR }
    if (error instanceof Error && error.message) return { success: false, error: error.message }
    return { success: false, error: PUBLIC_LEAD_ANALYSIS_ERROR }
}

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
    } catch (error: unknown) {
        return leadAnalysisFailure(error)
    }
}
