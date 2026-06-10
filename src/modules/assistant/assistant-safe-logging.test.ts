import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBriefAction } from './actions/createBrief.action'
import { sendPaymentReminderAction } from './actions/sendPaymentReminder.action'
import { IntentExecutor } from './intent-executor'

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

function querySingle(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
        update: vi.fn(() => query),
    }

    return query
}

const context: any = {
    tenant_id: 'org-secret-id',
    space_id: 'space-secret-id',
    user_id: 'user-secret-id',
    role: 'owner',
    allowed_actions: [],
    active_modules: ['core'],
    vertical: 'agency',
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
})

describe('assistant safe logging', () => {
    it('does not expose create brief identifiers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const supabase = {
            from: vi.fn(() => querySingle({ data: { id: 'brief-secret-id' }, error: null })),
        }

        const result = await createBriefAction({
            client_id: 'client-secret-id',
            title: 'Test Brief',
        }, context, supabase)

        expect(result.brief_id).toBe('brief-secret-id')
        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('client-secret-id')
        expect(logText).not.toContain('brief-secret-id')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('clientIdPresent')
        expect(logText).toContain('briefIdPresent')
    })

    it('does not expose payment reminder identifiers in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const supabase = {
            from: vi.fn(() => querySingle({
                data: {
                    id: 'invoice-secret-id',
                    status: 'pending',
                    client_id: 'client-secret-id',
                    total_amount: 1000,
                    due_date: '2026-06-10',
                },
                error: null,
            })),
        }

        const result = await sendPaymentReminderAction(
            { invoice_id: 'invoice-secret-id' },
            context,
            supabase
        )

        expect(result.invoice_id).toBe('invoice-secret-id')
        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('invoice-secret-id')
        expect(logText).not.toContain('client-secret-id')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('organizationIdPresent')
        expect(logText).toContain('invoiceIdPresent')
        expect(logText).toContain('clientIdPresent')
    })

    it('does not expose executor log ids in production idempotency logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const adminClient = {
            from: vi.fn(() => querySingle({
                data: {
                    id: 'log-secret-id',
                    intent_id: 'create_brief',
                    metadata: { result: { ok: true } },
                    space_id: 'space-secret-id',
                    status: 'executed',
                    user_id: 'user-secret-id',
                },
                error: null,
            })),
        }

        const result = await IntentExecutor.execute('log-secret-id', context, {}, adminClient)

        expect(result.cached).toBe(true)
        const logText = collectConsoleCalls(logSpy)
        expect(logText).not.toContain('log-secret-id')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('space-secret-id')
        expect(logText).toContain('logIdPresent')
        expect(logText).toContain('userIdPresent')
        expect(logText).toContain('spaceIdPresent')
    })

    it('does not expose executor failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const adminClient = {
            from: vi.fn(() => querySingle({
                data: {
                    id: 'log-secret-id',
                    intent_id: 'send_payment_reminder',
                    metadata: {},
                    payload: { invoice_id: 'invoice-secret-id' },
                    space_id: 'space-secret-id',
                    status: 'confirmed',
                    user_id: 'user-secret-id',
                },
                error: null,
            })),
        }
        const userClient = {
            from: vi.fn(() => querySingle({
                data: {
                    id: 'invoice-secret-id',
                    status: 'paid',
                    client_id: 'client-secret-id',
                    total_amount: 500,
                    due_date: '2026-06-10',
                },
                error: null,
            })),
        }

        await expect(IntentExecutor.execute('log-secret-id', context, userClient, adminClient))
            .rejects.toThrow('Invoice is already PAID')

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('log-secret-id')
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('space-secret-id')
        expect(logText).not.toContain('invoice-secret-id')
        expect(logText).not.toContain('client-secret-id')
        expect(logText).toContain('logIdPresent')
        expect(logText).toContain('invoiceIdPresent')
    })
})
