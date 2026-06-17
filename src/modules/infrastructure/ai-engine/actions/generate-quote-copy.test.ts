import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QuoteSettings } from '@/modules/features/crm/services/logic/quote-settings'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
}))

vi.mock('../service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

function makeSettings(overrides: Partial<QuoteSettings> = {}): QuoteSettings {
    return {
        organization_id: 'org-secret-id',
        vertical: 'agency-vertical',
        approve_label: 'Aprobar',
        reject_label: 'Rechazar',
        actions_config: {
            approve: {
                notify_team: true,
                send_message: true,
            },
            reject: {
                ask_reason: true,
                reasons: ['Precio'],
            },
        },
        template_config: {
            header: 'Cotizacion',
            footer: 'Gracias por su confianza',
        },
        ...overrides,
    }
}

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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
})

describe('generateQuoteCopy', () => {
    it('generates quote copy without leaking organization ids into the prompt', async () => {
        mocks.executeTask.mockResolvedValue({
            success: true,
            data: { text: 'Propuesta clara' },
        })

        const { generateQuoteCopy } = await import('./generate-quote-copy')
        const result = await generateQuoteCopy(makeSettings(), 'header', 'Friendly')

        expect(result).toEqual({
            success: true,
            text: 'Propuesta clara',
        })

        const call = mocks.executeTask.mock.calls[0]?.[0]
        expect(call).toMatchObject({
            organizationId: 'org-secret-id',
            taskType: 'quote.generate_copy_v1',
            bypassCache: true,
        })
        expect(call.payload.prompt).toContain('Industry/Vertical: agency-vertical')
        expect(call.payload.prompt).toContain('Tone: Friendly')
        expect(call.payload.prompt).not.toContain('org-secret-id')
    })

    it('supports legacy string responses from the AI engine', async () => {
        mocks.executeTask.mockResolvedValue({
            success: true,
            data: 'Texto simple',
        })

        const { generateQuoteCopy } = await import('./generate-quote-copy')
        const result = await generateQuoteCopy(makeSettings(), 'footer')

        expect(result).toEqual({
            success: true,
            text: 'Texto simple',
        })
    })

    it('does not expose AI provider failures in action results or deployed logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.executeTask.mockRejectedValue(
            Object.assign(new Error('provider failed org-secret-id prompt-secret api-key-secret'), {
                statusCode: 429,
            })
        )

        const { generateQuoteCopy } = await import('./generate-quote-copy')
        const result = await generateQuoteCopy(makeSettings(), 'footer')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo generar el texto',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).toContain('Error')
        expect(logText).not.toContain('provider failed')
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('prompt-secret')
        expect(logText).not.toContain('api-key-secret')
    })
})
