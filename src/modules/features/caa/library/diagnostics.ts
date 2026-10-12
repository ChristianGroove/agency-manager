import 'server-only'
import { randomUUID } from 'node:crypto'

type Phase = 'validation' | 'session' | 'history' | 'question_storage' | 'policy' | 'access' | 'retrieval' | 'selection' | 'generation' | 'answer_storage'
type Completion = { success: boolean; blocked?: boolean; storageError?: string }

/** Fixed metadata only: never accept a question, response, prompt, provider error or history body. */
export class HelpDiagnostics {
    private readonly started = performance.now()
    private readonly requestId = randomUUID()
    private readonly timings: Partial<Record<Phase, number>> = {}
    private finished = false
    phase: Phase = 'validation'
    failedPhase?: Phase
    mode: 'unselected' | 'legacy' | 'v2' = 'unselected'
    organizationId?: string
    corpusRevision?: string
    authorizedCount = 0
    articleIds: string[] = []
    historySource: 'none' | 'browser' | 'database' = 'none'
    historyMessages = 0
    selectionUsed = false
    modelCalls = 0
    noContext = false

    async measure<T>(phase: Phase, operation: () => Promise<T> | T): Promise<T> {
        this.phase = phase
        const start = performance.now()
        try { return await operation() }
        catch (error) { this.failedPhase = phase; throw error }
        finally { this.timings[phase] = (this.timings[phase] || 0) + performance.now() - start }
    }

    complete(response: Completion): void {
        if (this.finished) return
        this.finished = true
        if (process.env.PIXY_HELP_DIAGNOSTICS_ENABLED !== 'true') return
        const outcome = response.blocked ? 'blocked' : !response.success ? 'failed' : this.noContext ? 'no_context' : 'answered'
        // Logging must never interfere with the response or persistence.
        try {
            console.info('[PixyHelp]', JSON.stringify({
                event: 'help.request.completed', schema_version: 1, request_id: this.requestId,
                organization_id: /^[a-f0-9-]{36}$/i.test(this.organizationId || '') ? this.organizationId : null,
                mode: this.mode, outcome, failure_stage: outcome === 'failed' ? this.failedPhase || this.phase : null,
                corpus_revision: /^[a-f0-9]{64}$/.test(this.corpusRevision || '') ? this.corpusRevision : null,
                authorized_articles: this.authorizedCount,
                article_ids: this.articleIds.filter(id => /^[a-z0-9][a-z0-9.-]{1,99}$/.test(id)).slice(0, 5),
                history_source: this.historySource, history_messages: this.historyMessages,
                selection_used: this.selectionUsed, model_calls: this.modelCalls,
                storage_warning: Boolean(response.storageError), total_ms: Math.round(performance.now() - this.started),
                timings_ms: Object.fromEntries(Object.entries(this.timings).map(([phase, ms]) => [phase, Math.round(ms)])),
            }))
        } catch { /* Diagnostics are optional and must not break the chat. */ }
    }
}
