"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_REFINE_ERROR = 'Draft could not be refined'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeAiActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: (error as any).type,
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function publicAiActionError(publicMessage: string, error: unknown) {
    if (isDeployedRuntime()) return publicMessage
    return error instanceof Error ? error.message : publicMessage
}

function logAiActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAiActionError(error))
}

/**
 * Refine a draft message to be more professional and clear (Governance Enforced)
 */
export async function refineDraftContent(content: string): Promise<{ success: boolean; refined?: string; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        if (!content || content.length < 5) return { success: false, error: 'Content too short' }

        const response = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'messaging.refine_draft_v1',
            payload: { content }
        })

        // Engine returns strict string for this task (jsonMode: false)
        const refined = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)

        return { success: true, refined: refined || content }

    } catch (error: any) {
        logAiActionError('[SmartReplies] Refine failed:', error)
        return { success: false, error: publicAiActionError(PUBLIC_REFINE_ERROR, error) }
    }
}
