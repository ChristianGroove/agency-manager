import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    resume: vi.fn(),
    constructEngine: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    },
}))

vi.mock('@/modules/features/automation/engine', () => ({
    WorkflowEngine: class {
        constructor(definition: unknown, context: unknown) {
            mocks.constructEngine(definition, context)
        }

        resume = mocks.resume
    },
}))

type QueryResult = { data?: any, error?: any }

function cronRequest() {
    return new Request('https://pixy.test/api/webhooks/automation/process-queue', {
        method: 'POST',
        headers: { authorization: 'Bearer cron-secret' },
    })
}

function setupProductionCron() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
}

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function mockSupabase({
    queueResult,
    updates,
}: {
    queueResult: QueryResult
    updates?: Array<{ table: string, payload: any, eq?: { column: string, value: unknown } }>
}) {
    mocks.from.mockImplementation((table: string) => {
        let pendingUpdate = false
        const builder: any = {
            select: vi.fn(() => builder),
            eq: vi.fn((column: string, value: unknown) => {
                const lastUpdate = updates?.[updates.length - 1]
                if (pendingUpdate && lastUpdate && !lastUpdate.eq) {
                    lastUpdate.eq = { column, value }
                    pendingUpdate = false
                    return Promise.resolve({ data: null, error: null })
                }

                return builder
            }),
            lte: vi.fn(() => builder),
            limit: vi.fn(async () => queueResult),
            update: vi.fn((payload: any) => {
                pendingUpdate = true
                updates?.push({ table, payload })
                return builder
            }),
        }

        return builder
    })
}

describe('/api/webhooks/automation/process-queue', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
        mocks.resume.mockReset()
        mocks.constructEngine.mockReset()
    })

    it('does not expose queue fetch failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mockSupabase({
            queueResult: {
                data: null,
                error: { message: 'database password secret-value failed while reading automation queue' },
            },
        })

        const { POST } = await import('./route')
        const response = await POST(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to fetch automation queue')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('stores and returns sanitized per-item processing failures in production', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const updates: Array<{ table: string, payload: any, eq?: { column: string, value: unknown } }> = []
        mockSupabase({
            queueResult: {
                data: [{
                    id: 'queue-1',
                    step_id: 'step-1',
                    execution_id: 'execution-1',
                    workflow_executions: {
                        id: 'execution-1',
                        context: {},
                        workflow_id: 'workflow-1',
                        workflows: {
                            definition: { nodes: [], edges: [] },
                        },
                    },
                }],
                error: null,
            },
            updates,
        })
        mocks.resume.mockRejectedValue(new Error('oauth token secret-value failed while resuming workflow'))

        const { POST } = await import('./route')
        const response = await POST(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body).toEqual({
            processed: 1,
            results: [{ id: 'queue-1', status: 'failed', reason: 'Automation queue processing failed' }],
        })
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('oauth token')

        expect(updates).toContainEqual({
            table: 'automation_queue',
            payload: { status: 'failed', error_message: 'Automation queue processing failed' },
            eq: { column: 'id', value: 'queue-1' },
        })
        expect(updates).toContainEqual({
            table: 'workflow_executions',
            payload: { status: 'failed', error_message: 'Automation queue processing failed' },
            eq: { column: 'id', value: 'execution-1' },
        })

        const persistedText = JSON.stringify(updates)
        expect(persistedText).not.toContain('secret-value')
        expect(persistedText).not.toContain('oauth token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('oauth token')
    })
})
