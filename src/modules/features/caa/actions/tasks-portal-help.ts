'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { AIEngine } from '@/modules/infrastructure/ai-engine/service'
import { resolveTasksPortalHelpSession } from '../library/tasks-portal-session'
import { helpCorpus } from '../library/runtime'
import { canReadArticle, retrieveHelp, boundedHistory } from '../library/retrieval'
import { selectAuthorizedArticles } from '../library/selection'
import { casualHelpReply, naturalizeHelpUncertainty, isGeneralHelpRecommendation, previousHelpTopic } from '../library/response-policy'
import { HelpDiagnostics } from '../library/diagnostics'
import { portalHistoryCutoff, readPortalHelpMessages, restrictPortalHistory } from '../library/portal-history'
import { DEFAULT_PET_SETTINGS, type DashboardPetConfig } from '@/modules/core/pet/config'
import { readPetSettings } from '@/modules/core/pet/schema'
import type { HelpChatResponse } from './ask-help-assistant'
import type { HelpThread, StoredHelpMessage } from './help-history'

const inputSchema = z.object({ token: z.string().min(16).max(200), question: z.string().trim().min(3).max(500),
    requestId: z.string().uuid(), threadId: z.string().uuid().optional() }).strict()
const reservationSchema = z.object({ status: z.enum(['reserved','duplicate','busy','failed','invalid','denied','invalid_thread','full','rate_limited','history_full']),
    thread_id: z.string().uuid().optional(), message: z.string().max(12000).nullable().optional(), article_ids: z.array(z.string()).max(5).nullable().optional() })
const scopeMessage = 'Desde este portal puedo ayudarte con Tasks y sus funciones. Para otros módulos, usa la ayuda del dashboard.'
const outsideScope = (question: string) => /\b(?:crm|facturaci[oó]n|facturas?|cartera|n[oó]mina|super\s?admin|marketing|meta\s+ads|adn\s+de\s+marca)\b/i.test(question)

export async function getTasksPortalHelpConfig(token: string): Promise<{ enabled: boolean; config?: DashboardPetConfig }> {
    const session = await resolveTasksPortalHelpSession(token)
    if (!session || !helpCorpus.articles.some(article => canReadArticle(article, session.access))) return { enabled: false }
    const { data, error } = await supabaseAdmin.from('platform_settings').select('pet_config').eq('id', 1).maybeSingle()
    const settings = error ? { ...DEFAULT_PET_SETTINGS } : readPetSettings(data?.pet_config)
    const useGlobalColors = settings.pixyOrganizationId === session.tenantId
    return { enabled: true, config: { settings: { ...settings, pixyOrganizationId: null }, enabled: settings.enabled, useGlobalColors } }
}

export async function listTasksPortalHelpThreads(token: string, offset = 0): Promise<{ threads: HelpThread[]; hasMore: boolean; error?: string }> {
    if (!z.number().int().min(0).max(1000).safeParse(offset).success) return { threads: [], hasMore: false, error: 'Página inválida.' }
    const session = await resolveTasksPortalHelpSession(token)
    if (!session) return { threads: [], hasMore: false, error: 'Desbloquea el portal para consultar la ayuda.' }
    const result = await supabaseAdmin.from('help_portal_threads').select('id,title,created_at')
        .eq('organization_id', session.tenantId).eq('staff_id', session.staffId).eq('surface', 'portal.tasks')
        .gte('last_activity', portalHistoryCutoff()).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 20)
    return result.error ? { threads: [], hasMore: false, error: 'El historial no está disponible.' }
        : { threads: (result.data || []).slice(0, 20), hasMore: (result.data?.length || 0) > 20 }
}

export async function loadTasksPortalHelpThread(token: string, id: string): Promise<{ messages: StoredHelpMessage[]; error?: string }> {
    if (!z.string().uuid().safeParse(id).success) return { messages: [], error: 'Conversación inválida.' }
    const session = await resolveTasksPortalHelpSession(token)
    if (!session) return { messages: [], error: 'Desbloquea el portal para consultar la ayuda.' }
    const messages = await readPortalHelpMessages(session, id)
    if (!messages) return { messages: [], error: 'No se pudo abrir esta conversación.' }
    return { messages: restrictPortalHistory(messages, helpCorpus.articles.filter(article => canReadArticle(article, session.access))) }
}

export async function askTasksPortalHelp(input: unknown): Promise<HelpChatResponse> {
    const trace = new HelpDiagnostics(); trace.surface = 'portal.tasks'; trace.mode = 'v2'
    let response: HelpChatResponse = { success: false, error: 'No pudimos consultar la ayuda. Intenta nuevamente.' }
    let reserved = false; let finished = false
    let actor: { tenantId: string; staffId: string; requestId: string } | undefined
    try {
        const parsed = inputSchema.safeParse(input)
        if (!parsed.success) return response
        const data = parsed.data
        data.question = data.question.replaceAll(data.token, '[enlace privado]').replace(/\/portal\/tasks\/[a-zA-Z0-9_-]{16,200}/g, '/portal/tasks/[enlace privado]')
        const session = await trace.measure('session', () => resolveTasksPortalHelpSession(data.token))
        if (!session) { response = { success: false, error: 'Tu acceso a la ayuda no está disponible. Desbloquea o recarga el portal.' }; return response }
        actor = { tenantId: session.tenantId, staffId: session.staffId, requestId: data.requestId }
        trace.organizationId = session.tenantId; trace.corpusRevision = helpCorpus.revision
        const authorized = helpCorpus.articles.filter(article => canReadArticle(article, session.access))
        trace.authorizedCount = authorized.length
        if (!authorized.length) return response

        const start = await trace.measure('question_storage', () => supabaseAdmin.rpc('begin_portal_help_turn', {
            p_org: session.tenantId, p_staff: session.staffId, p_request: data.requestId, p_question: data.question, p_thread: data.threadId || null,
        }))
        const reservation = reservationSchema.safeParse(start.data)
        if (start.error || !reservation.success) return response
        const turn = reservation.data
        if (turn.status === 'duplicate' && turn.message && turn.thread_id) {
            const allowed = new Set(authorized.map(article => article.id))
            response = { success: true, threadId: turn.thread_id, message: (turn.article_ids || []).every(id => allowed.has(id))
                ? turn.message : 'Este mensaje corresponde a una función que ya no está disponible con tu acceso actual.' }
            return response
        }
        if (turn.status !== 'reserved' || !turn.thread_id) {
            const errors: Record<string,string> = { busy: 'Ya hay una consulta en curso. Espera a que termine.', rate_limited: 'Has alcanzado el límite de ayuda. Intenta más tarde.',
                full: 'Esta conversación está completa. Inicia una nueva.', history_full: 'Tu historial está lleno. Continúa una conversación existente.', invalid_thread: 'No se pudo abrir esta conversación. Inicia una nueva.' }
            response = { success: false, blocked: turn.status === 'rate_limited' || turn.status === 'busy', error: errors[turn.status] || 'No se pudo iniciar esta consulta.' }
            return response
        }
        reserved = true
        response.threadId = turn.thread_id
        const stored = await trace.measure('history', () => readPortalHelpMessages(session, turn.thread_id!, true))
        if (!stored) return response
        // The transaction just persisted this question; exclude it from prior history.
        const history = boundedHistory(restrictPortalHistory(stored.slice(0, -1), authorized))
        trace.historySource = 'database'; trace.historyMessages = history.length
        const prior = previousHelpTopic(history) || ''
        const recommendation = isGeneralHelpRecommendation(data.question)
        const retrievalQuestion = recommendation ? prior : data.question
        const localReply = casualHelpReply(data.question)?.replace('Pixy', 'Tasks y este portal')
        if (localReply) trace.mode = 'casual'
        let answer = localReply || (outsideScope(retrievalQuestion) ? scopeMessage : '')
            || (recommendation && !prior ? '¿Sobre qué función de Tasks quieres una recomendación?' : '')
        let articles = answer ? [] : await trace.measure('retrieval', () => retrieveHelp(authorized, retrievalQuestion, session.access, prior))
        if (!answer && !articles.length) {
            trace.selectionUsed = true; trace.modelCalls++
            const selection = await trace.measure('selection', () => AIEngine.executeTask({ organizationId: session.tenantId, taskType: 'help-select-guides-v1', payload: {
                question: retrievalQuestion, priorQuestion: prior, catalogue: authorized.slice(0, 40).map(article => ({ id: article.id, title: article.title, keywords: article.keywords,
                    sections: article.content.split('\n').filter(line => /^#{1,3}\s/.test(line)).slice(0, 12) })),
            } }))
            if (!selection.success) return response
            articles = selectAuthorizedArticles(selection.data, authorized)
        }
        if (!answer && !articles.length) { trace.noContext = true; answer = recommendation
            ? 'No tengo una recomendación concreta para ese tema por ahora.'
            : 'Por ahora no puedo responder esa consulta con certeza.' }
        if (!answer) {
            trace.modelCalls++
            const result = await trace.measure('generation', () => AIEngine.executeTask({ organizationId: session.tenantId, taskType: 'help-tasks-portal-v1', payload: {
                question: data.question, recommendationTopic: recommendation ? prior : undefined, history, articles, corpusRevision: helpCorpus.revision,
                session: { surface: 'portal.tasks', profiles: session.access.portalProfiles, capabilities: session.access.portalCapabilities,
                    portalMode: session.capabilities.portalMode, route: '/portal/tasks/[token]' },
            } }))
            if (!result.success || typeof result.data !== 'string' || !result.data.trim() || result.data.length > 12000) return response
            answer = naturalizeHelpUncertainty(result.data)
        }
        trace.articleIds = articles.map(article => article.id)
        // Recheck current token/tenant/capabilities before returning or saving a model answer.
        const current = await resolveTasksPortalHelpSession(data.token)
        if (!current || current.tenantId !== session.tenantId || current.staffId !== session.staffId || articles.some(article => !canReadArticle(article, current.access))) return response
        const saved = await trace.measure('answer_storage', () => supabaseAdmin.rpc('finish_portal_help_turn', {
            p_org: session.tenantId, p_staff: session.staffId, p_request: data.requestId, p_answer: answer, p_articles: trace.articleIds,
        }))
        if (saved.error || saved.data !== true) return response
        finished = true
        response = { success: true, threadId: turn.thread_id, message: answer }
        return response
    } catch {
        return response
    } finally {
        if (reserved && !finished && actor) {
            try { await supabaseAdmin.rpc('finish_portal_help_turn', { p_org: actor.tenantId, p_staff: actor.staffId, p_request: actor.requestId, p_answer: null, p_articles: [] }) } catch { /* Lease expiry bounds an interrupted request. */ }
        }
        trace.complete(response)
    }
}
