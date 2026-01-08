"use server"

import { AIEngine } from "@/modules/core/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { createClient } from "@/lib/supabase-server"

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
        console.error('[KnowledgeExtractor] Error:', error)
        return { success: false, error: error.message }
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
        console.error('[KnowledgeExtractor] Save failed:', error)
        return { success: false, error: error.message }
    }
}
