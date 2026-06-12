import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    decryptObject: vi.fn(),
    subscribeWABA: vi.fn(),
    supabaseFrom: vi.fn(),
    verifySubscription: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('@/modules/infrastructure/meta/services/waba-subscription-manager', () => ({
    wabaSubscriptionManager: {
        subscribeWABA: mocks.subscribeWABA,
        verifySubscription: mocks.verifySubscription,
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

function connectionBuilder(connection: Record<string, unknown>) {
    const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        single: vi.fn(async () => ({ data: connection, error: null })),
    }

    return builder
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.decryptObject.mockReset()
    mocks.subscribeWABA.mockReset()
    mocks.supabaseFrom.mockReset()
    mocks.verifySubscription.mockReset()
})

describe('integration helpers', () => {
    it('does not expose auto-subscribe identifiers or provider errors in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        mocks.supabaseFrom.mockReturnValue(connectionBuilder({
            credentials: { encrypted: true },
            metadata: {
                selected_assets: [{ type: 'whatsapp', waba_id: 'waba-secret-1' }],
            },
        }))
        mocks.decryptObject.mockReturnValue({ access_token: 'access-token-secret' })
        mocks.subscribeWABA.mockResolvedValue({
            success: false,
            error: 'waba-secret-1 access-token-secret subscribe failed',
        })

        const { autoSubscribeWABA } = await import('./integration-helpers')
        await autoSubscribeWABA('connection-secret-1')

        expect(mocks.subscribeWABA).toHaveBeenCalledWith('waba-secret-1', 'access-token-secret')

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('connection-secret-1')
        expect(logText).not.toContain('waba-secret-1')
        expect(logText).not.toContain('access-token-secret')
        expect(logText).not.toContain('subscribe failed')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('wabaIdPresent')
    })

    it('does not expose credential decryption exceptions in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)

        mocks.supabaseFrom.mockReturnValue(connectionBuilder({
            credentials: { encrypted: true },
            metadata: {
                selected_assets: [{ type: 'whatsapp', waba_id: 'waba-secret-1' }],
            },
        }))
        mocks.decryptObject.mockImplementation(() => {
            throw new Error('connection-secret-1 access-token-secret decrypt failed')
        })

        const { autoSubscribeWABA } = await import('./integration-helpers')
        await autoSubscribeWABA('connection-secret-1')

        expect(mocks.subscribeWABA).not.toHaveBeenCalled()

        const errorText = collectConsoleCalls(errorSpy)
        expect(errorText).not.toContain('connection-secret-1')
        expect(errorText).not.toContain('access-token-secret')
        expect(errorText).not.toContain('decrypt failed')
        expect(errorText).toContain('connectionIdPresent')
    })
})
