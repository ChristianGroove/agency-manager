"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions/crud"
import { createClient } from "@/modules/core/database/supabase-server"
import crypto from "crypto"

const PUBLIC_REFINE_ERROR = 'Draft could not be refined'
const PUBLIC_SMART_REPLIES_ERROR = 'Smart replies could not be generated'
const PUBLIC_SENTIMENT_ERROR = 'Sentiment analysis failed'
const PUBLIC_INTENT_ERROR = 'Intent detection failed'

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
 * TEXT REFINEMENT
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
        let refined = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
        if (refined.startsWith('"') && refined.endsWith('"')) refined = refined.slice(1, -1)
        return { success: true, refined: refined || content }
    } catch (error: any) {
        logAiActionError('[AI] Refine failed:', error)
        return { success: false, error: publicAiActionError(PUBLIC_REFINE_ERROR, error) }
    }
}

/**
 * SMART REPLIES
 */
export interface SmartReply { type: 'short' | 'medium' | 'detailed'; text: string; tokens: number }

export interface SmartRepliesResponse { 
    success: boolean; 
    replies?: SmartReply[]; 
    error?: string; 
    generationTimeMs?: number;
    usedKnowledge?: any[];
}

export async function generateSmartReplies(options: any): Promise<SmartRepliesResponse> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    const startTime = Date.now()
    try {
        const result = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'inbox.smart_replies_v1',
            payload: options 
        })
        
        const duration = Date.now() - startTime
        const data = result.data
        const replies: SmartReply[] = [
            { type: 'short', text: data.short, tokens: Math.ceil(data.short.length/4) },
            { type: 'medium', text: data.medium, tokens: Math.ceil(data.medium.length/4) },
            { type: 'detailed', text: data.detailed, tokens: Math.ceil(data.detailed.length/4) }
        ]
        
        return { 
            success: true, 
            replies, 
            generationTimeMs: duration,
            usedKnowledge: result.context // RAG Context
        }
    } catch (error: any) {
        logAiActionError('[AI] Smart replies failed:', error)
        return { success: false, error: publicAiActionError(PUBLIC_SMART_REPLIES_ERROR, error) }
    }
}

/**
 * SENTIMENT ANALYSIS
 */
export async function analyzeSentiment(messageContent: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }
    try {
        const response = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'inbox.sentiment_v1',
            payload: { message: messageContent }
        })
        return { success: true, result: response.data }
    } catch (error: any) {
        logAiActionError('[AI] Sentiment failed:', error)
        return { success: false, error: publicAiActionError(PUBLIC_SENTIMENT_ERROR, error) }
    }
}

export async function saveSentimentAnalysis(messageId: string, conversationId: string, result: any) {
    const supabase = await createClient()
    await supabase.from('messages').update({
        sentiment: result.sentiment,
        sentiment_score: result.score,
        detected_emotions: result.emotions
    }).eq('id', messageId)

    if (result.needsEscalation) {
        await (await createClient()).from('sentiment_alerts').insert({
            conversation_id: conversationId,
            message_id: messageId,
            alert_type: result.sentiment === 'urgent' ? 'urgent_keywords' : 'negative_spike',
            severity: result.sentiment === 'urgent' ? 'critical' : 'high'
        })
    }
}

/**
 * INTENT DETECTION & ROUTING
 */
export async function detectIntent(messageContent: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }
    try {
        const response = await AIEngine.executeTask({ organizationId: orgId, taskType: 'inbox.intent_v1', payload: { message: messageContent } })
        return { success: true, result: response.data }
    } catch (error: any) {
        logAiActionError('[AI] Intent failed:', error)
        return { success: false, error: publicAiActionError(PUBLIC_INTENT_ERROR, error) }
    }
}

export async function saveIntent(conversationId: string, messageId: string, result: any) {
    await (await createClient()).from('conversation_intents').insert({
        conversation_id: conversationId,
        message_id: messageId,
        intent: result.intent,
        confidence: result.confidence,
        extracted_entities: result.extractedEntities
    })
}

export async function applyIntentRouting(conversationId: string, organizationId: string, intent: string, confidence: number) {
    const { data: rule } = await (await createClient()).from('intent_routing_rules').select('*').eq('organization_id', organizationId).eq('intent', intent).eq('is_active', true).single()
    if (!rule) return
    const updates: any = {}
    if (rule.set_priority) updates.priority = rule.set_priority
    if (Object.keys(updates).length > 0) {
        await (await createClient()).from('conversations').update(updates).eq('id', conversationId)
    }
}

export async function logSuggestion(suggestion: any) {
    const { logSuggestion: originalLog } = await import("../ai/smart-replies")
    return originalLog(suggestion)
}

export async function autoEscalateIfNeeded(conversationId: string, result: any) {
    const { autoEscalateIfNeeded: originalEscalate } = await import("../ai/sentiment-analysis")
    return originalEscalate(conversationId, result)
}

/**
 * KNOWLEDGE EXTRACTION
 */
export async function extractFAQ(conversationText: string) {
    const { extractFAQ: originalExtract } = await import("../ai/knowledge-extractor")
    return originalExtract(conversationText)
}

export async function saveFAQ(faq: any) {
    const { saveFAQ: originalSave } = await import("../ai/knowledge-extractor")
    return originalSave(faq)
}

/**
 * TRANSCRIPTION
 */
export async function transcribeAudio(audioUrl: string, messageId?: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }
    // Full transcription logic would go here, re-exported or moved from transcription.ts
    // For now, re-export from original or consolidate later.
    const { transcribeAudio: originalTranscribe } = await import("../ai/transcription")
    return originalTranscribe(audioUrl, messageId)
}

/**
 * AGENT QA
 */
export async function analyzeAgentPerformance(agentId: string, messageLimit: number = 50) {
    const { analyzeAgentPerformance: originalQA } = await import("../ai/agent-qa")
    return originalQA(agentId, messageLimit)
}
