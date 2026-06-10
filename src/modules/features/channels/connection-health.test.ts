import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
    getAdapter: vi.fn(),
    decryptObject: vi.fn(),
    checkConnectionStatus: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    },
}))

vi.mock('@/modules/infrastructure/integrations/registry', () => ({
    integrationRegistry: {
        getAdapter: mocks.getAdapter,
    },
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

type ConnectionLookup = {
    data?: any
    error?: any
}

function setupProductionRuntime() {
    vi.stubEnv('VERCEL_ENV', 'production')
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

function mockConnectionLookup(result: ConnectionLookup) {
    const updates: any[] = []

    mocks.from.mockImplementation((table: string) => {
        if (table !== 'integration_connections') {
            throw new Error(`Unexpected table ${table}`)
        }

        let updatePayload: any
        let isUpdate = false

        const builder: any = {
            select: vi.fn(() => builder),
            eq: vi.fn((column: string, value: string) => {
                if (isUpdate) {
                    updates.push({ payload: updatePayload, column, value })
                    return Promise.resolve({ data: null, error: null })
                }

                return builder
            }),
            single: vi.fn(async () => result),
            update: vi.fn((payload: any) => {
                isUpdate = true
                updatePayload = payload
                return builder
            }),
        }

        return builder
    })

    return updates
}

describe('checkConnectionHealth', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.from.mockReset()
        mocks.getAdapter.mockReset()
        mocks.decryptObject.mockReset()
        mocks.checkConnectionStatus.mockReset()
    })

    it('does not expose provider health messages in production', async () => {
        setupProductionRuntime()
        const updates = mockConnectionLookup({
            data: {
                id: 'connection-1',
                provider_key: 'meta_whatsapp',
                credentials: { encrypted: 'ciphertext' },
                status: 'active',
            },
            error: null,
        })
        mocks.decryptObject.mockReturnValue({ accessToken: 'secret-value' })
        mocks.getAdapter.mockReturnValue({
            checkConnectionStatus: mocks.checkConnectionStatus,
        })
        mocks.checkConnectionStatus.mockResolvedValue({
            status: 'disconnected',
            message: 'meta token secret-value expired',
        })

        const { checkConnectionHealth } = await import('./connection-health')
        const result = await checkConnectionHealth('connection-1')

        expect(result).toEqual({
            status: 'disconnected',
            message: 'Connection issues detected',
        })
        expect(JSON.stringify(result)).not.toContain('secret-value')
        expect(updates).toHaveLength(1)
        expect(updates[0]).toMatchObject({
            payload: { status: 'disconnected' },
            column: 'id',
            value: 'connection-1',
        })
    })

    it('does not expose decrypt or adapter exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const updates = mockConnectionLookup({
            data: {
                id: 'connection-1',
                provider_key: 'meta_whatsapp',
                credentials: { encrypted: 'ciphertext' },
                status: 'active',
            },
            error: null,
        })
        mocks.decryptObject.mockImplementation(() => {
            throw new Error('decryption secret-value failed for channel')
        })
        mocks.getAdapter.mockReturnValue({
            checkConnectionStatus: mocks.checkConnectionStatus,
        })

        const { checkConnectionHealth } = await import('./connection-health')
        const result = await checkConnectionHealth('connection-1')
        const errorLogText = collectConsoleCalls(errorSpy)

        expect(result).toEqual({
            status: 'error',
            message: 'Connection health check failed',
        })
        expect(JSON.stringify(result)).not.toContain('secret-value')
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('decryption')
        expect(updates).toEqual([{
            payload: { status: 'error' },
            column: 'id',
            value: 'connection-1',
        }])
    })
})
