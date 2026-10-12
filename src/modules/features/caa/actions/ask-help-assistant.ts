"use server"

import { AIEngine } from "@/modules/infrastructure/ai-engine/service"
import { AIAccessError } from '@/modules/infrastructure/ai-engine/access-error'
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import { createClient } from "@/modules/core/database/supabase-server"
import { z } from 'zod'
import { helpCorpus, helpV2Enabled } from '../library/runtime'
import { resolveHelpAccess } from '../library/session'
import { boundedHistory, canReadArticle, retrieveHelp } from '../library/retrieval'
import { selectAuthorizedArticles } from '../library/selection'
import { HelpDiagnostics } from '../library/diagnostics'

export interface HelpChatMessage {
    role: "user" | "assistant"
    content: string
}

export interface HelpChatResponse {
    success: boolean
    message?: string
    error?: string
    blocked?: boolean
    threadId?: string
    storageError?: string
}

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10
const MAX_INPUT_LENGTH = 500
const MAX_CONVERSATION_HISTORY = 12 // Legacy task still limits its own context below.

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
    /cuéntame.*chiste/i,
    /quién.*presidente/i,
    /política/i,
    /religión/i,
    /criptomoneda/i,
    /bitcoin/i,
    /hackear/i,
    /contraseña.*otra/i,
    /inyección.*sql/i,
    /código.*malicioso/i,
    /ignore.*instrucciones/i,
    /ignora.*sistema/i,
    /olvida.*eres/i,
    /actúa.*como/i,
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
 * - Rate limiting (10 req/min por organización)
 * - Validación de longitud (max 500 chars)
 * - Detección de off-topic
 * - Prompt con guardrails estrictos
 */
async function processHelpQuestion(
    question: string,
    conversationHistory: HelpChatMessage[] = [],
    currentRoute?: string,
    diagnostics?: HelpDiagnostics,
): Promise<HelpChatResponse> {
    const trace = diagnostics || new HelpDiagnostics()
    try {
        const organizationId = await getCurrentOrganizationId()

        if (!organizationId) {
            return {
                success: false,
                error: "No se pudo identificar tu organización. Por favor, inicia sesión nuevamente."
            }
        }

        // 1. Rate Limiting
        trace.phase = 'policy'
        if (isRateLimited(organizationId)) {
            return {
                success: false,
                blocked: true,
                error: "Has alcanzado el límite de preguntas. Espera un momento antes de continuar."
            }
        }

        // 2. Input Validation
        const sanitizedQuestion = sanitizeInput(question)

        if (sanitizedQuestion.length < 3) {
            return {
                success: false,
                error: "Tu pregunta es muy corta. Por favor, sé más específico."
            }
        }

        // 3. Off-topic Detection
        if (isOffTopic(sanitizedQuestion)) {
            return {
                success: false,
                blocked: true,
                message: "Solo puedo ayudarte con preguntas sobre cómo usar Pixy. ¿Tienes alguna duda sobre la plataforma?"
            }
        }

        // 5. Limit conversation history to save tokens
        const limitedHistory = conversationHistory.slice(-4)

        if (helpV2Enabled(organizationId)) {
            trace.mode = 'v2'
            trace.corpusRevision = helpCorpus.revision
            const { data: { user } } = await (await createClient()).auth.getUser()
            if (!user) return { success: false, error: 'Inicia sesión para usar la ayuda.' }
            const access = await trace.measure('access', () => resolveHelpAccess(organizationId, user.id, helpCorpus.articles, currentRoute))
            const prior = conversationHistory.filter(message => message.role === 'user').at(-1)?.content || ''
            let articles = await trace.measure('retrieval', () => retrieveHelp(helpCorpus.articles, sanitizedQuestion, access, prior))
            const authorized = helpCorpus.articles.filter(article => canReadArticle(article, access))
            trace.authorizedCount = authorized.length
            if (!articles.length && authorized.length) {
                // On lexical misses only, let the model understand paraphrases using an authorized catalogue.
                // At most one selection request, followed by the normal answer request.
                trace.selectionUsed = true
                trace.modelCalls++
                const selection = await trace.measure('selection', () => AIEngine.executeTask({
                    organizationId, taskType: 'help-select-guides-v1', payload: {
                        question: sanitizedQuestion, priorQuestion: prior,
                        catalogue: authorized.slice(0, 40).map(article => ({ id: article.id, title: article.title, keywords: article.keywords,
                            sections: article.content.split('\n').filter(line => /^#{1,3}\s/.test(line)).slice(0, 12) })),
                    },
                }))
                if (!selection.success) return { success: false, error: 'No pudimos consultar la ayuda. Intenta nuevamente.' }
                articles = selectAuthorizedArticles(selection.data, authorized)
            }
            trace.articleIds = articles.map(article => article.id)
            if (!articles.length) {
                trace.noContext = true
                return { success: true, message: 'No puedo confirmar cómo hacerlo. ¿Qué opción o error ves en pantalla?' }
            }
            trace.modelCalls++
            const response = await trace.measure('generation', () => AIEngine.executeTask({
                organizationId, taskType: 'help-assistant-v2', payload: {
                    question: sanitizedQuestion, history: boundedHistory(conversationHistory),
                    session: { route: access.route, vertical: access.vertical, modules: access.modules, tenantAdmin: access.tenantAdmin, platformAdmin: access.platformAdmin },
                    articles, corpusRevision: helpCorpus.revision,
                },
            }))
            if (!response.success || typeof response.data !== 'string') return { success: false, error: 'No pudimos procesar tu pregunta.' }
            return { success: true, message: response.data }
        }

        // 6. Get Space Category for tailored context
        trace.mode = 'legacy'
        trace.historyMessages = limitedHistory.length
        const spaceCategory = await getOrgSpaceCategory(organizationId)

        // 7. Execute with strict guardrails and industry context
        trace.modelCalls++
        const response = await trace.measure('generation', () => AIEngine.executeTask({
            organizationId,
            taskType: "help-assistant",
            payload: {
                question: sanitizedQuestion,
                history: limitedHistory,
                spaceCategory,
                interfaceVersion: 'robot-pet-theme-v2-natural-help' // Invalidate legacy replies after the tone change.
            }
        }))

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
        console.error("Error en askHelpAssistant:", { name: error instanceof Error ? error.name : 'UnknownError' })
        return {
            success: false,
            error: error instanceof AIAccessError ? error.message : "Ocurrió un error inesperado. Por favor, intenta más tarde."
        }
    }
}

/** Persist independently of the modal lifecycle. RLS always uses the signed-in user. */
async function askAndPersistHelp(
    question: string,
    conversationHistory: HelpChatMessage[] = [],
    threadId?: string,
    currentRoute?: string,
    trace: HelpDiagnostics = new HelpDiagnostics(),
): Promise<HelpChatResponse> {
    if (typeof question !== 'string' || question.trim().length < 3 || question.length > MAX_INPUT_LENGTH) {
        return { success: false, error: 'Escribe una pregunta de entre 3 y 500 caracteres.' }
    }
    if (threadId && !z.string().uuid().safeParse(threadId).success) {
        return { success: false, error: 'Conversación inválida.' }
    }
    if (currentRoute !== undefined && !z.string().max(200).regex(/^\/[a-zA-Z0-9_/[\].-]*$/).safeParse(currentRoute).success) {
        return { success: false, error: 'Vista de ayuda inválida.' }
    }
    // Validate even the fallback history supplied by the browser.
    const history = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(20000) }))
        .max(200).safeParse(conversationHistory)
    if (!history.success) return { success: false, error: 'Historial inválido.' }
    const { client, user, org } = await trace.measure('session', async () => {
        const client = await createClient()
        const { data: { user } } = await client.auth.getUser()
        const org = await getCurrentOrganizationId()
        return { client, user, org }
    })
    if (!user || !org) return { success: false, error: 'Inicia sesión para usar la ayuda.' }
    trace.organizationId = org
    let activeId = threadId
    let context = history.data.slice(-MAX_CONVERSATION_HISTORY)
    trace.historySource = context.length ? 'browser' : 'none'
    let storageError: string | undefined
    const warning = 'No se pudo guardar esta conversación. Los mensajes nuevos podrían perderse al cerrar.'
    if (activeId) {
        trace.phase = 'history'
        const { data: thread, error } = await trace.measure('history', async () => await client.from('help_chat_threads').select('id')
            .eq('id', activeId!).eq('user_id', user.id).eq('organization_id', org).maybeSingle())
        if (error || !thread) return { success: false, error: 'No se pudo abrir esta conversación. Inicia una nueva.' }
        const { data: stored, error: loadError } = await trace.measure('history', async () => await client.from('help_chat_messages').select('role,content')
            .eq('thread_id', activeId!).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200))
        if (loadError) return { success: false, error: 'El historial no está disponible. Intenta nuevamente.' }
        if ((stored?.length ?? 0) >= 199) return { success: false, error: 'Esta conversación está completa. Inicia una nueva.' }
        context = (stored ?? []).slice(0, MAX_CONVERSATION_HISTORY).reverse() as HelpChatMessage[]
        trace.historySource = 'database'
    } else {
        const { data, error } = await client.from('help_chat_threads').insert({
            user_id: user.id, organization_id: org, title: question.trim().slice(0, 80),
        }).select('id').single()
        if (error || !data) storageError = warning
        else activeId = data.id
    }
    if (activeId) {
        trace.phase = 'question_storage'
        const { error } = await trace.measure('question_storage', async () => await client.from('help_chat_messages').insert({ thread_id: activeId, role: 'user', content: question.trim() }))
        if (error) return { success: false, threadId: activeId, error: 'No se pudo guardar tu pregunta. Intenta nuevamente.' }
    }
    trace.historyMessages = boundedHistory(context).length
    const response = await processHelpQuestion(question, context, currentRoute, trace)
    // Failed requests remain as an unanswered question; technical errors are not persisted as AI answers.
    if (activeId && response.success && typeof response.message === 'string') {
        trace.phase = 'answer_storage'
        const { error } = await trace.measure('answer_storage', async () => await client.from('help_chat_messages').insert({ thread_id: activeId, role: 'assistant', content: response.message }))
        if (error) storageError = warning
    }
    return { ...response, threadId: activeId, storageError }
}

export async function askHelpAssistant(
    question: string,
    conversationHistory: HelpChatMessage[] = [],
    threadId?: string,
    currentRoute?: string,
): Promise<HelpChatResponse> {
    const trace = new HelpDiagnostics()
    let response: HelpChatResponse = { success: false, error: 'Ocurrió un error inesperado. Intenta nuevamente.' }
    try {
        response = await askAndPersistHelp(question, conversationHistory, threadId, currentRoute, trace)
        return response
    } catch {
        return response
    } finally {
        trace.complete(response)
    }
}

