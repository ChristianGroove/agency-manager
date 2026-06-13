import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
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

function useAdminQueues(queues: Record<string, any[]>) {
    mocks.supabaseFrom.mockImplementation((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected table ${table}`)
        return queue.shift()
    })
}

function selectEqSingle(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        limit: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function insertSelectSingle(result: unknown) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEqSelectSingle(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return {
        update: vi.fn(() => query),
    }
}

const initialState = {
    id: 'state-secret-id',
    key: 'new',
    type: 'sale',
    is_initial: true,
}

const processInstance = {
    id: 'process-secret-id',
    organization_id: 'org-secret-id',
    lead_id: 'lead-secret-id',
    type: 'sale',
    current_state: 'new',
    status: 'active',
    history: [],
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('ProcessEngine', () => {
    it('starts processes without changing the success contract', async () => {
        mocks.createClient.mockResolvedValue({ from: mocks.supabaseFrom })
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        useAdminQueues({
            process_states: [
                selectEqSingle({ data: initialState, error: null }),
            ],
            process_instances: [
                selectEqSingle({ data: null, error: null }),
                insertSelectSingle({ data: processInstance, error: null }),
            ],
        })

        const { ProcessEngine } = await import('./engine')
        const result = await ProcessEngine.startProcess('lead-current', 'sale', { source: 'manual' })

        expect(result).toEqual({ success: true, process: processInstance })
    })

    it('does not expose process start insert failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({ from: mocks.supabaseFrom })
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        useAdminQueues({
            process_states: [
                selectEqSingle({ data: initialState, error: null }),
            ],
            process_instances: [
                selectEqSingle({ data: null, error: null }),
                insertSelectSingle({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'insert denied for lead-secret-id with process-token-secret',
                    },
                }),
            ],
        })

        const { ProcessEngine } = await import('./engine')
        const result = await ProcessEngine.startProcess('lead-secret-id', 'sale', { secret: 'context-secret' })

        expect(result).toEqual({ success: false, error: 'No se pudo iniciar el proceso' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('process-token-secret')
        expect(logText).not.toContain('context-secret')
        expect(logText).not.toContain('insert denied')
        expect(logText).toContain('42501')
    })

    it('does not expose process transition update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue({ from: mocks.supabaseFrom })
        useAdminQueues({
            process_instances: [
                selectEqSingle({ data: processInstance, error: null }),
                updateEqSelectSingle({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'update denied for process-secret-id with process-token-secret',
                    },
                }),
            ],
            process_states: [
                selectEqSingle({
                    data: {
                        key: 'new',
                        allowed_next_states: ['won'],
                    },
                    error: null,
                }),
                selectEqSingle({
                    data: {
                        key: 'won',
                        is_terminal: false,
                        auto_tags: [],
                    },
                    error: null,
                }),
            ],
        })

        const { ProcessEngine } = await import('./engine')
        const result = await ProcessEngine.transition('process-secret-id', 'won', 'user-secret-id', 'reason-secret')

        expect(result).toEqual({ success: false, error: 'No se pudo cambiar el estado del proceso' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('process-secret-id')
        expect(logText).not.toContain('process-token-secret')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('reason-secret')
        expect(logText).not.toContain('update denied')
        expect(logText).toContain('42501')
    })
})
