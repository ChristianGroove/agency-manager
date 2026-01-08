"use server"

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

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
        console.error('[SmartReplies] Refine failed:', error)
        return { success: false, error: error.message }
    }
}
