import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    sendMail: vi.fn(),
    supabaseFrom: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.supabaseFrom,
    },
}))

vi.mock('@/modules/infrastructure/notifications/services/mailer', () => ({
    SENDER_EMAIL: 'Pixy <no-reply@pixy.test>',
    transporter: {
        sendMail: mocks.sendMail,
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

function emailTemplateQuery(result: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        or: vi.fn(() => query),
        is: vi.fn(() => query),
        then: vi.fn((resolve, reject) => Promise.resolve(result).then(resolve, reject)),
    }

    return query
}

function mockTemplateQuery(result: unknown) {
    mocks.supabaseFrom.mockImplementation((table: string) => {
        if (table !== 'email_templates') throw new Error(`Unexpected table ${table}`)
        return emailTemplateQuery(result)
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.sendMail.mockReset()
    mocks.supabaseFrom.mockReset()
})

describe('legacy communication email service', () => {
    it('sends templated email without changing the success contract', async () => {
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockTemplateQuery({
            data: [
                {
                    organization_id: null,
                    vertical_slug: null,
                    subject: 'Hello {{name}}',
                    body_html: '<p>Hi {{name}}</p>',
                },
            ],
            error: null,
        })
        mocks.sendMail.mockResolvedValue({ messageId: 'message-current' })

        const { emailService } = await import('./email-service')
        const result = await emailService.sendEmail(
            'client@pixy.test',
            'welcome',
            { name: 'Ada' }
        )

        expect(result).toEqual({ success: true, messageId: 'message-current' })
        expect(mocks.sendMail).toHaveBeenCalledWith({
            from: 'Pixy <no-reply@pixy.test>',
            to: 'client@pixy.test',
            subject: 'Hello Ada',
            html: '<p>Hi Ada</p>',
        })
    })

    it('does not expose smtp failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockTemplateQuery({
            data: [
                {
                    organization_id: null,
                    vertical_slug: null,
                    subject: 'Hello',
                    body_html: '<p>Hello</p>',
                },
            ],
            error: null,
        })
        mocks.sendMail.mockRejectedValue(
            new Error('smtp password api-secret failed for recipient-secret@example.test')
        )

        const { emailService } = await import('./email-service')
        const result = await emailService.sendEmail(
            'recipient-secret@example.test',
            'welcome-secret',
            {}
        )

        expect(result).toEqual({ success: false, error: 'No se pudo enviar el email' })
        const logText = collectConsoleCalls(errorSpy, logSpy)
        expect(logText).not.toContain('recipient-secret@example.test')
        expect(logText).not.toContain('api-secret')
        expect(logText).not.toContain('smtp password')
        expect(logText).toContain('recipientPresent')
        expect(logText).toContain('Error')
    })

    it('does not expose template lookup failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        mockTemplateQuery({
            data: null,
            error: {
                code: '42501',
                message: 'template denied org-secret-id template-token-secret',
            },
        })

        const { emailService } = await import('./email-service')
        await expect(emailService.sendEmail(
            'client@pixy.test',
            'welcome-secret',
            {},
            { organizationId: 'org-secret-id' }
        )).rejects.toThrow('Email template not found')

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('template-token-secret')
        expect(logText).not.toContain('template denied')
        expect(logText).toContain('42501')
    })
})
