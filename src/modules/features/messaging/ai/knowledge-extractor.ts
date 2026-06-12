"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { createClient } from "@/modules/core/database/supabase-server"

const PUBLIC_EXTRACT_ERROR = 'FAQ extraction failed'
const PUBLIC_SAVE_ERROR = 'FAQ save failed'

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

function logKnowledgeError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeAiError(error))
}

export interface FAQEntry {
    question: string
    answer: string
    category: string
}

export interface ExtractionResult {
    success: boolean
    faq?: FAQEntry
    error?: string
}

/**
 * Extract a FAQ entry from a conversation using AI
 */
export async function extractFAQ(conversationText: string): Promise<ExtractionResult> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        const result = await AIEngine.executeTask({
            organizationId: orgId,
            taskType: 'knowledge.extract_faq_v1',
            payload: { conversation: conversationText }
        })

        return {
            success: true,
            faq: result.data as FAQEntry
        }

    } catch (error: any) {
        logKnowledgeError('[KnowledgeExtractor] Error:', error)
        return { success: false, error: publicAiError(PUBLIC_EXTRACT_ERROR, error) }
    }
}

/**
 * Save extracted FAQ to database
 */
export async function saveFAQ(faq: FAQEntry): Promise<{ success: boolean; id?: string; error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        const supabase = await createClient()

        const { data, error } = await supabase.from('knowledge_base').insert({
            organization_id: orgId,
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            source: 'ai_extracted'
        }).select('id').single()

        if (error) throw error

        return { success: true, id: data.id }

    } catch (error: any) {
        logKnowledgeError('[KnowledgeExtractor] Save failed:', error)
        return { success: false, error: publicAiError(PUBLIC_SAVE_ERROR, error) }
    }
}
