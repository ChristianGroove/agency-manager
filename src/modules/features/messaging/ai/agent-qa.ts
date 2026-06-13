"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { createClient } from "@/modules/core/database/supabase-server"
const PUBLIC_AGENT_QA_ERROR = 'Agent QA failed'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeAiError(error: unknown) {
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

function publicAiError(publicMessage: string, error: unknown) {
    if (isDeployedRuntime()) return publicMessage
    return error instanceof Error ? error.message : publicMessage
}

function logAgentQaError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAiError(error))
}

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

type AgentMessage = {
    id?: string | null
    content: string | null
    created_at?: string | null
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function fetchAgentMessages(
    supabase: SupabaseServerClient,
    orgId: string,
    agentId: string,
    messageLimit: number
): Promise<AgentMessage[]> {
    const [senderResult, metadataResult] = await Promise.all([
        supabase
            .from('messages')
            .select('id, content, created_at')
            .eq('direction', 'outbound' as any)
            .eq('organization_id', orgId)
            .eq('sender', agentId)
            .limit(messageLimit)
            .order('created_at', { ascending: false }),
        supabase
            .from('messages')
            .select('id, content, created_at')
            .eq('direction', 'outbound' as any)
            .eq('organization_id', orgId)
            .eq('metadata->>agent_id', agentId)
            .limit(messageLimit)
            .order('created_at', { ascending: false }),
    ])

    if (senderResult.error) throw senderResult.error
    if (metadataResult.error) throw metadataResult.error

    const seenIds = new Set<string>()
    return ([...(senderResult.data || []), ...(metadataResult.data || [])] as AgentMessage[])
        .filter(message => {
            if (!message.id) return true
            if (seenIds.has(message.id)) return false
            seenIds.add(message.id)
            return true
        })
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, messageLimit)
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

    try {
        const supabase = await createClient() // Use standard client for cached data read (RLS applies)

        // 1. Check Cache (Recent report within last 24h?)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: cached } = await (await createClient()) // Use admin for reliable lookup
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
        const messages = await fetchAgentMessages(supabase, orgId, agentId, messageLimit)

        // In a real scenario, we'd strict filter. For this demo, we'll take last 50 outbound.

        if (!messages || messages.length < 5) {
            // Try fetching *any* outbound messages if the specific filter failed
            // (Common in dev envs where sender might be generic 'Agent')
            const { data: genericMessages } = await supabase
                .from('messages')
                .select('content')
                .eq('direction', 'outbound')
                .eq('organization_id', orgId)
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
        await (await createClient()).from('agent_qa_reports').insert({
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
        logAgentQaError('[AgentQA] Error:', error)
        return { success: false, error: publicAiError(PUBLIC_AGENT_QA_ERROR, error) }
    }
}
