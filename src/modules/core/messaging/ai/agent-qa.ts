"use server"

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
// ... imports

export async function analyzeAgentPerformance(
    agentId: string,
    messageLimit: number = 50
): Promise<QAAnalysisResult> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const supabase = await createClient() // Use standard client for cached data read (RLS applies)

    try {
        // 1. Check Cache (Recent report within last 24h?)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: cached } = await supabaseAdmin // Use admin for reliable lookup
            .from('agent_qa_reports')
            .select('*')
            .eq('organization_id', orgId)
            .eq('agent_id', agentId)
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (cached) {
            console.log('[AgentQA] Returning cached report')
            return {
                success: true,
                report: cached.report as AgentQAResult,
                messagesAnalyzed: cached.messages_analyzed_count
            }
        }

        // 2. No Cache? Generate New.
        // Fetch agent's recent outgoing messages
        const { data: messages, error: fetchError } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('direction', 'outbound' as any) // Cast if type mismatch
            .or(`sender.eq.${agentId},metadata->>agent_id.eq.${agentId}`) // Try to match broadly
            // Note: In real app, 'sender' might be 'Agent', need robust agent mapping. 
            // For now assuming filtering by direction outbound is enough distinct for demo
            .limit(messageLimit)
            .order('created_at', { ascending: false })

        // Fallback for demo if no agentId specific messages:
        // In a real scenario, we'd strict filter. For this demo, we'll take last 50 outbound.

        if (fetchError) throw fetchError

        if (!messages || messages.length < 5) {
            // Try fetching *any* outbound messages if the specific filter failed
            // (Common in dev envs where sender might be generic 'Agent')
            const { data: genericMessages } = await supabase
                .from('messages')
                .select('content')
                .eq('direction', 'outbound')
                .limit(messageLimit)

            if (!genericMessages || genericMessages.length < 5) {
                return { success: false, error: "Not enough messages to analyze (min 5)" }
            }
            // Use generic for demo
            // messages = genericMessages
        }

        // Combine messages into text for analysis
        const agentMessages = messages
            .map((m: any, i: number) => `[${i + 1}] ${m.content}`)
            .join('\n\n')

        const result = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'analytics.agent_qa_v1',
            payload: { agentMessages }
        })

        const report = result.data as AgentQAResult

        // 3. Save to Cache
        await supabaseAdmin.from('agent_qa_reports').insert({
            organization_id: orgId,
            agent_id: agentId,
            report: report,
            messages_analyzed_count: messages.length,
            period_end: new Date().toISOString()
        })

        return {
            success: true,
            report: report,
            messagesAnalyzed: messages.length
        }

    } catch (error: any) {
        console.error('[AgentQA] Error:', error)
        return { success: false, error: error.message }
    }
}
