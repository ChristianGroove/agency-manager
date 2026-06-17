import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    createInvoice: vi.fn(),
    logDomainEvent: vi.fn(),
    calculateFrequencyNextDate: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/infrastructure/logging/services/event-logger', () => ({
    logDomainEvent: mocks.logDomainEvent,
}))

vi.mock('@/modules/features/billing/billing-actions', () => ({
    createInvoiceAction: mocks.createInvoice,
}))

vi.mock('@/modules/features/billing/services/billing-utils', () => ({
    calculateFrequencyNextDate: mocks.calculateFrequencyNextDate,
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

function selectEqSingleQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEqQuery(result: unknown) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function createSupabaseMock(queues: Record<string, unknown[]> = {}) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    return {
        from: vi.fn((table: string) => {
            const queue = tableQueues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function acceptedQuote(overrides: Record<string, unknown> = {}) {
    return {
        id: 'quote-current',
        client_id: 'client-current',
        emitter_id: null,
        status: 'accepted',
        items: [
            {
                description: 'Setup',
                quantity: 1,
                price: 100,
                is_recurring: false,
            },
        ],
        ...overrides,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.createInvoice.mockReset()
    mocks.logDomainEvent.mockReset()
    mocks.calculateFrequencyNextDate.mockReset()
})

describe('conversion service', () => {
    it('converts an accepted one-off quote without changing the success contract', async () => {
        const supabase = createSupabaseMock({
            quotes: [
                selectEqSingleQuery({ data: acceptedQuote(), error: null }),
                updateEqQuery({ error: null }),
            ],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.createInvoice.mockResolvedValue({ success: true, data: { id: 'invoice-current' } })

        const { convertQuote } = await import('./conversion-service')
        const result = await convertQuote('quote-current')

        expect(result).toEqual({
            success: true,
            results: {
                servicesCreated: 0,
                invoicesCreated: 1,
                unifiedInvoiceId: 'invoice-current',
            },
        })
        expect(mocks.createInvoice).toHaveBeenCalledWith(expect.objectContaining({
            client_id: 'client-current',
            total: 100,
            metadata: { source_quote_id: 'quote-current', type: 'unified_conversion' },
        }))
        expect(mocks.logDomainEvent).toHaveBeenCalledWith(expect.objectContaining({
            entity_type: 'quote',
            entity_id: 'quote-current',
            event_type: 'quote.converted',
        }))
    })

    it('does not expose quote lookup failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const supabase = createSupabaseMock({
            quotes: [
                selectEqSingleQuery({
                    data: null,
                    error: {
                        code: '42501',
                        message: 'quote denied org-secret-id quote-secret-id conversion-token-secret',
                    },
                }),
            ],
        })
        mocks.createClient.mockResolvedValue(supabase)

        const { convertQuote } = await import('./conversion-service')
        const result = await convertQuote('quote-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo convertir la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('quote-secret-id')
        expect(logText).not.toContain('conversion-token-secret')
        expect(logText).not.toContain('quote denied')
        expect(logText).toContain('42501')
    })

    it('keeps safe quote status validation messages public', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const supabase = createSupabaseMock({
            quotes: [
                selectEqSingleQuery({
                    data: acceptedQuote({ status: 'draft' }),
                    error: null,
                }),
            ],
        })
        mocks.createClient.mockResolvedValue(supabase)

        const { convertQuote } = await import('./conversion-service')
        const result = await convertQuote('quote-current')

        expect(result).toEqual({ success: false, error: 'Solo se pueden convertir cotizaciones aceptadas.' })
        expect(errorSpy).not.toHaveBeenCalled()
    })

    it('does not expose invoice creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const supabase = createSupabaseMock({
            quotes: [
                selectEqSingleQuery({ data: acceptedQuote({ id: 'quote-secret-id' }), error: null }),
            ],
        })
        mocks.createClient.mockResolvedValue(supabase)
        mocks.createInvoice.mockResolvedValue({
            success: false,
            error: 'invoice denied org-secret-id quote-secret-id billing-token-secret',
        })

        const { convertQuote } = await import('./conversion-service')
        const result = await convertQuote('quote-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo convertir la cotizacion' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('quote-secret-id')
        expect(logText).not.toContain('billing-token-secret')
        expect(logText).not.toContain('invoice denied')
        expect(logText).toContain('Error')
    })
})
