"use server"

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { createClient } from "@/lib/supabase-server"

export interface AgentQAResult {
    empathy: number
    resolution: number
    clarity: number
    speed: number
    grammar: number
    overallScore: number
    strengths: string[]
    improvements: string[]
}

export interface QAAnalysisResult {
    success: boolean
    report?: AgentQAResult
    messagesAnalyzed?: number
    error?: string
}

/**
 * Generate a QA performance report for an agent based on their recent messages
 */
export async function analyzeAgentPerformance(
    agentId: string,
    messageLimit: number = 50
): Promise<QAAnalysisResult> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        const supabase = await createClient()

        // Fetch agent's recent outgoing messages
        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('direction', 'outgoing')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(messageLimit)

        if (fetchError) throw fetchError

        if (!messages || messages.length < 5) {
            return { success: false, error: "Not enough messages to analyze (min 5)" }
        }

        // Combine messages into text for analysis
        const agentMessages = messages
            .map((m, i) => `[${i + 1}] ${m.content}`)
            .join('\n\n')

        const result = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'analytics.agent_qa_v1',
            payload: { agentMessages }
        })

        return {
            success: true,
            report: result.data as AgentQAResult,
            messagesAnalyzed: messages.length
        }

    } catch (error: any) {
        console.error('[AgentQA] Error:', error)
        return { success: false, error: error.message }
    }
}
