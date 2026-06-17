import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
}))

function collectConsoleCalls(spy: ReturnType<typeof vi.spyOn>) {
    return (spy.mock.calls as unknown[][])
        .map((call: unknown[]) => call.map((value: unknown) => {
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

function setupProductionEnv() {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('META_ACCESS_TOKEN', 'meta-access-token-secret')
    vi.stubGlobal('fetch', mocks.fetch)
}

describe('MarketingAPIManager', () => {
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        vi.resetModules()
        mocks.fetch.mockReset()
    })

    it('does not expose Meta phone identifiers or Graph errors in production eligibility logs', async () => {
        setupProductionEnv()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            error: {
                message: 'graph failure for phone_secret_id using token-secret',
            },
        }), { status: 400 }))

        const { MarketingAPIManager } = await import('./marketing-api-manager')
        const result = await new MarketingAPIManager().checkEligibility('phone_secret_id')
        const resultText = JSON.stringify(result)
        const logText = collectConsoleCalls(logSpy)
        const errorText = collectConsoleCalls(errorSpy)

        expect(result).toEqual({
            eligible: false,
            status: 'ERROR',
            reason: 'Marketing eligibility check failed',
        })
        expect(resultText).not.toContain('phone_secret_id')
        expect(resultText).not.toContain('token-secret')
        expect(logText).not.toContain('phone_secret_id')
        expect(errorText).not.toContain('phone_secret_id')
        expect(errorText).not.toContain('token-secret')
    })

    it('does not expose recipient phone numbers or Graph errors in production campaign failures', async () => {
        setupProductionEnv()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mocks.fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({
                marketing_messages_onboarding_status: 'APPROVED',
            }), { status: 200 }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                error: {
                    message: 'send failed for +15551234567 with token-secret',
                },
            }), { status: 400 }))

        const { MarketingAPIManager } = await import('./marketing-api-manager')
        const result = await new MarketingAPIManager().sendCampaign({
            phoneNumberId: 'phone_secret_id',
            campaign: {
                name: 'Safety Campaign',
                template_name: 'promo_template',
                audience: ['+15551234567'],
                ttl_seconds: 12 * 60 * 60,
            },
        })
        const resultText = JSON.stringify(result)
        const errorText = collectConsoleCalls(errorSpy)

        expect(result.failed).toBe(1)
        expect(result.errors).toEqual(['recipient 1/1: Marketing message failed'])
        expect(resultText).not.toContain('+15551234567')
        expect(resultText).not.toContain('phone_secret_id')
        expect(resultText).not.toContain('token-secret')
        expect(errorText).not.toContain('+15551234567')
        expect(errorText).not.toContain('phone_secret_id')
        expect(errorText).not.toContain('token-secret')
    })

    it('keeps sending valid production marketing messages', async () => {
        setupProductionEnv()
        mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [{ id: 'wamid_123' }],
        }), { status: 200 }))

        const { MarketingAPIManager } = await import('./marketing-api-manager')
        const result = await new MarketingAPIManager().sendMarketingMessage({
            phoneNumberId: 'phone_secret_id',
            to: '+15551234567',
            template_name: 'promo_template',
            ttl_seconds: 12 * 60 * 60,
        })

        expect(result).toEqual({ message_id: 'wamid_123' })
        expect(mocks.fetch).toHaveBeenCalledTimes(1)
        expect(mocks.fetch.mock.calls[0]?.[1]).toMatchObject({
            method: 'POST',
            headers: {
                Authorization: 'Bearer meta-access-token-secret',
                'Content-Type': 'application/json',
            },
        })
    })
})
