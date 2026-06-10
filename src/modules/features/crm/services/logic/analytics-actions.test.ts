import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCurrentOrganizationId: vi.fn(),
    rpc: vi.fn(),
    storageFrom: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
        rpc: mocks.rpc,
        storage: {
            from: mocks.storageFrom,
        },
    },
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

function eqQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

function gteQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        gte: vi.fn(async () => result),
        select: vi.fn(() => query),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.rpc.mockReset()
    mocks.storageFrom.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('analytics actions', () => {
    it('loads leads by status without changing the success contract', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const statusQuery = eqQuery({
            data: [
                { status: 'new', value: 100 },
                { status: 'new', value: 50 },
                { status: 'won', value: 200 },
            ],
            error: null,
        })
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'leads') return statusQuery
            throw new Error(`Unexpected table ${table}`)
        })

        const { getLeadsByStatus } = await import('./analytics-actions')
        const result = await getLeadsByStatus()

        expect(result).toEqual({
            success: true,
            data: [
                { status: 'new', count: 2, value: 150 },
                { status: 'won', count: 1, value: 200 },
            ],
        })
        expect(statusQuery.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not expose analytics query failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.supabaseFrom.mockImplementation((table: string) => {
            if (table === 'leads') {
                return gteQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'analytics denied org-secret-id with report-token-secret',
                    },
                })
            }
            throw new Error(`Unexpected table ${table}`)
        })

        const { getLeadsBySource } = await import('./analytics-actions')
        const result = await getLeadsBySource()

        expect(result).toEqual({ success: false, error: 'No se pudieron cargar las metricas de CRM' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('report-token-secret')
        expect(logText).not.toContain('analytics denied')
        expect(logText).toContain('42501')
    })

    it('does not expose report parameters or RPC failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.rpc.mockResolvedValue({
            data: null,
            error: {
                code: '42501',
                message: 'report rpc denied org-secret-id with report-token-secret',
            },
        })

        const { getAdvancedReports } = await import('./analytics-actions')
        const result = await getAdvancedReports('2026-01-01-secret', '2026-01-31-secret', 'org-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo generar el reporte' })
        expect(mocks.rpc).toHaveBeenCalledWith('get_advanced_crm_reports', {
            p_org_id: 'org-secret-id',
            p_start_date: '2026-01-01-secret',
            p_end_date: '2026-01-31-secret',
        })

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('2026-01-01-secret')
        expect(logText).not.toContain('2026-01-31-secret')
        expect(logText).not.toContain('report-token-secret')
        expect(logText).not.toContain('report rpc denied')
        expect(logText).toContain('42501')
    })

    it('does not expose image URLs when logo fetches fail in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

        const { getBase64Image } = await import('./analytics-actions')
        const result = await getBase64Image('https://cdn.example.test/logo-secret.png?token=url-token-secret')

        expect(result).toBe('')
        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('logo-secret.png')
        expect(logText).not.toContain('url-token-secret')
        expect(logText).toContain('urlPresent')
        expect(logText).toContain('404')
    })
})
