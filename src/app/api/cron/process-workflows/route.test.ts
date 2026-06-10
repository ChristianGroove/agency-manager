import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    rpc: vi.fn(),
    from: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
    createClient: mocks.createClient,
}))

type QueryResult = { data?: any, error?: any }

function cronRequest() {
    return new Request('https://pixy.test/api/cron/process-workflows', {
        method: 'GET',
        headers: { authorization: 'Bearer cron-secret' },
    }) as any
}

function setupProductionCron() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
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

function createWorkflowBuilder(result: QueryResult) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        single: vi.fn(async () => result),
    }

    return builder
}

function createUpdateBuilder(table: string, updates: any[]) {
    let updatePayload: any

    const builder: any = {
        update: vi.fn((payload: any) => {
            updatePayload = payload
            return builder
        }),
        eq: vi.fn((column: string, value: string) => {
            updates.push({ table, payload: updatePayload, column, value })
            return Promise.resolve({ data: null, error: null })
        }),
    }

    return builder
}

function setupServiceClient(options: {
    jobs?: any[]
    fetchError?: any
    workflow?: QueryResult
}) {
    const updates: any[] = []

    mocks.rpc.mockResolvedValue({
        data: options.jobs ?? [],
        error: options.fetchError ?? null,
    })

    mocks.from.mockImplementation((table: string) => {
        if (table === 'workflows') {
            return createWorkflowBuilder(options.workflow ?? { data: null, error: null })
        }

        if (table === 'scheduled_workflow_jobs' || table === 'workflow_executions') {
            return createUpdateBuilder(table, updates)
        }

        throw new Error(`Unexpected table ${table}`)
    })

    mocks.createClient.mockReturnValue({
        rpc: mocks.rpc,
        from: mocks.from,
    })

    return updates
}

describe('/api/cron/process-workflows', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.createClient.mockReset()
        mocks.rpc.mockReset()
        mocks.from.mockReset()
    })

    it('does not expose pending job fetch failures in production responses or logs', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        setupServiceClient({
            fetchError: { message: 'service role secret-value failed reading scheduled jobs' },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Failed to fetch scheduled workflows')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
    })

    it('does not expose job errors or context payloads in production responses, logs, or stored last_error', async () => {
        setupProductionCron()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const updates = setupServiceClient({
            jobs: [{
                id: 'job-1',
                workflow_id: 'workflow-1',
                execution_id: 'execution-1',
                resume_from_node_id: 'node-secret',
                context: { accessToken: 'secret-value' },
                attempts: 3,
                max_attempts: 3,
            }],
            workflow: {
                data: {
                    id: 'workflow-1',
                    name: 'Workflow Secret',
                    is_active: true,
                    definition: { nodes: [], edges: [] },
                },
                error: null,
            },
        })

        const { GET } = await import('./route')
        const response = await GET(cronRequest())
        const body = await response.json()
        const responseText = JSON.stringify(body)

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.failed).toBe(1)
        expect(body.errors).toEqual(['Job job-1: Workflow job failed'])
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('node-secret')
        expect(responseText).not.toContain('Workflow Secret')

        expect(updates).toContainEqual({
            table: 'scheduled_workflow_jobs',
            payload: expect.objectContaining({
                status: 'failed',
                last_error: 'Workflow job failed',
            }),
            column: 'id',
            value: 'job-1',
        })

        const errorLogText = collectConsoleCalls(errorSpy)
        const logText = collectConsoleCalls(logSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('node-secret')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('accessToken')
    })
})
