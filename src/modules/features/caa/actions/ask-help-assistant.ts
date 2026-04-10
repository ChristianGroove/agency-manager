"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import { createClient } from "@/modules/core/database/supabase-server"

export interface HelpChatMessage {
    role: "user" | "assistant"
    content: string
}

export interface HelpChatResponse {
    success: boolean
    message?: string
    error?: string
    blocked?: boolean
}

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10
const MAX_INPUT_LENGTH = 500
const MAX_CONVERSATION_HISTORY = 4 // Only keep last 4 messages for context

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number, timestamp: number }>()

/**
 * Check if organization is rate limited
 */
function isRateLimited(orgId: string): boolean {
    const now = Date.now()
    const record = rateLimitStore.get(orgId)

    if (!record) {
        rateLimitStore.set(orgId, { count: 1, timestamp: now })
        return false
    }

    // Reset if window expired
    if (now - record.timestamp > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.set(orgId, { count: 1, timestamp: now })
        return false
    }

    // Check limit
    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return true
    }

    // Increment
    record.count++
    return false
}

/**
 * Basic off-topic detection keywords
 */
const OFF_TOPIC_PATTERNS = [
    /escribe.*poema/i,
    /escribe.*cuento/i,
    /escribe.*historia/i,
    /hazme.*chiste/i,
    /cuÃ©ntame.*chiste/i,
    /quiÃ©n.*presidente/i,
    /polÃ­tica/i,
    /religiÃ³n/i,
    /criptomoneda/i,
    /bitcoin/i,
    /hackear/i,
    /contraseÃ±a.*otra/i,
    /inyecciÃ³n.*sql/i,
    /cÃ³digo.*malicioso/i,
    /ignore.*instrucciones/i,
    /ignora.*sistema/i,
    /olvida.*eres/i,
    /actÃºa.*como/i,
    /finge.*ser/i,
    /roleplay/i,
    /juego.*de.*rol/i,
]

/**
 * Check if question is off-topic or potentially abusive
 */
function isOffTopic(question: string): boolean {
    const normalized = question.toLowerCase().trim()
    return OFF_TOPIC_PATTERNS.some(pattern => pattern.test(normalized))
}

/**
 * Sanitize input - remove potential injection attempts
 */
function sanitizeInput(input: string): string {
    return input
        .slice(0, MAX_INPUT_LENGTH) // Truncate long inputs
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .trim()
}

/**
 * Procesa una pregunta del usuario usando el AI Engine.
 * Contexto: Sistema de Ayuda Pixy (Knowledge Hub)
 * 
 * Protocolos de seguridad:
 * - Rate limiting (10 req/min por organizaciÃ³n)
 * - ValidaciÃ³n de longitud (max 500 chars)
 * - DetecciÃ³n de off-topic
 * - Prompt con guardrails estrictos
 */
export async function askHelpAssistant(
    question: string,
    conversationHistory: HelpChatMessage[] = []
): Promise<HelpChatResponse> {
    try {
        const organizationId = await getCurrentOrganizationId()

        if (!organizationId) {
            return {
                success: false,
                error: "No se pudo identificar tu organizaciÃ³n. Por favor, inicia sesiÃ³n nuevamente."
            }
        }

        // 1. Rate Limiting
        if (isRateLimited(organizationId)) {
            return {
                success: false,
                blocked: true,
                error: "Has alcanzado el lÃ­mite de preguntas. Espera un momento antes de continuar."
            }
        }

        // 2. Input Validation
        const sanitizedQuestion = sanitizeInput(question)

        if (sanitizedQuestion.length < 3) {
            return {
                success: false,
                error: "Tu pregunta es muy corta. Por favor, sÃ© mÃ¡s especÃ­fico."
            }
        }

        // 3. Off-topic Detection
        if (isOffTopic(sanitizedQuestion)) {
            return {
                success: false,
                blocked: true,
                message: "Solo puedo ayudarte con preguntas sobre cÃ³mo usar Pixy. Â¿Tienes alguna duda sobre la plataforma?"
            }
        }

        // 5. Limit conversation history to save tokens
        const limitedHistory = conversationHistory.slice(-MAX_CONVERSATION_HISTORY)

        // 6. Get Space Category for tailored context
        const spaceCategory = await getOrgSpaceCategory(organizationId)

        // 7. Execute with strict guardrails and industry context
        const response = await AIEngine.executeTask({
            organizationId,
            taskType: "help-assistant",
            payload: {
                question: sanitizedQuestion,
                history: limitedHistory,
                spaceCategory // PASS TO AI ENGINE
            }
        })

        if (response.success && response.data) {
            const content = typeof response.data === 'string'
                ? response.data
                : response.data.content || response.data

            return {
                success: true,
                message: content
            }
        }

        return {
            success: false,
            error: response.error || "No pudimos procesar tu pregunta. Intenta de nuevo."
        }

    } catch (error) {
        console.error("Error en askHelpAssistant:", error)
        return {
            success: false,
            error: "OcurriÃ³ un error inesperado. Por favor, intenta mÃ¡s tarde."
        }
    }
}

