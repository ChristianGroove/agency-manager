import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    analyzeAgentPerformance: vi.fn(),
    extractFAQ: vi.fn(),
    saveFAQ: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    createClient: vi.fn(),
}))

vi.mock('@/modules/features/messaging/messaging-actions', () => ({
    analyzeAgentPerformance: mocks.analyzeAgentPerformance,
    extractFAQ: mocks.extractFAQ,
    saveFAQ: mocks.saveFAQ,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

function makeRequest(path: string, body: Record<string, unknown>) {
    return new Request(`https://pixy.test${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
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

function mockUsageStatsQuery(result: { data?: any, error?: any }) {
    mocks.createClient.mockResolvedValue({
        from: vi.fn(() => {
            const builder: any = {
                select: vi.fn(() => builder),
                eq: vi.fn(() => builder),
                gte: vi.fn(async () => result),
            }

            return builder
        }),
    })
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.analyzeAgentPerformance.mockReset()
    mocks.extractFAQ.mockReset()
    mocks.saveFAQ.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.createClient.mockReset()
})

describe('auxiliary AI API routes', () => {
    it('rejects anonymous agent QA requests before analysis', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./agent-qa/route')
        const response = await POST(makeRequest('/api/ai/agent-qa', {
            agentId: 'agent-1',
            messageLimit: 25,
        }) as any)

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.analyzeAgentPerformance).not.toHaveBeenCalled()
    })

    it('rejects invalid agent QA limits before auth and AI work', async () => {
        const { POST } = await import('./agent-qa/route')
        const response = await POST(makeRequest('/api/ai/agent-qa', {
            agentId: 'agent-1',
            messageLimit: 101,
        }) as any)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ success: false, error: 'messageLimit must be between 1 and 100' })
        expect(mocks.getCurrentOrganizationId).not.toHaveBeenCalled()
        expect(mocks.analyzeAgentPerformance).not.toHaveBeenCalled()
    })

    it('rejects oversized FAQ extraction payloads before auth and AI work', async () => {
        const { POST } = await import('./extract-faq/route')
        const response = await POST(makeRequest('/api/ai/extract-faq', {
            conversationText: 'A'.repeat(20_001),
        }) as any)

        expect(response.status).toBe(413)
        expect(await response.json()).toEqual({ success: false, error: 'conversationText is too long' })
        expect(mocks.getCurrentOrganizationId).not.toHaveBeenCalled()
        expect(mocks.extractFAQ).not.toHaveBeenCalled()
    })

    it('extracts FAQ only for authenticated organizations with trimmed text', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.extractFAQ.mockResolvedValue({ success: true, faq: { question: 'Q', answer: 'A', category: 'general' } })

        const { POST } = await import('./extract-faq/route')
        const response = await POST(makeRequest('/api/ai/extract-faq', {
            conversationText: '  pregunta frecuente  ',
        }) as any)

        expect(response.status).toBe(200)
        expect(await response.json()).toMatchObject({ success: true })
        expect(mocks.extractFAQ).toHaveBeenCalledWith('pregunta frecuente')
    })

    it('does not expose resolved FAQ extraction failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.extractFAQ.mockResolvedValue({
            success: false,
            error: 'llm provider token secret-value failed extracting faq',
        })

        const { POST } = await import('./extract-faq/route')
        const response = await POST(makeRequest('/api/ai/extract-faq', {
            conversationText: 'pregunta frecuente',
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('FAQ extraction failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('provider token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('provider token')
    })

    it('rejects anonymous FAQ saves before writes', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue(null)

        const { POST } = await import('./save-faq/route')
        const response = await POST(makeRequest('/api/ai/save-faq', {
            question: 'Pregunta',
            answer: 'Respuesta',
        }) as any)

        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.saveFAQ).not.toHaveBeenCalled()
    })

    it('saves sanitized FAQ content for authenticated organizations', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.saveFAQ.mockResolvedValue({ success: true, id: 'faq-1' })

        const { POST } = await import('./save-faq/route')
        const response = await POST(makeRequest('/api/ai/save-faq', {
            question: '  Pregunta  ',
            answer: '  Respuesta  ',
            category: '',
        }) as any)

        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ success: true, id: 'faq-1' })
        expect(mocks.saveFAQ).toHaveBeenCalledWith({
            question: 'Pregunta',
            answer: 'Respuesta',
            category: 'general',
        })
    })

    it('does not expose resolved FAQ save failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.saveFAQ.mockResolvedValue({
            success: false,
            error: 'database password secret-value failed saving faq',
        })

        const { POST } = await import('./save-faq/route')
        const response = await POST(makeRequest('/api/ai/save-faq', {
            question: 'Pregunta',
            answer: 'Respuesta',
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(200)
        expect(responseText).toContain('FAQ save failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose agent QA failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.analyzeAgentPerformance.mockRejectedValue(
            new Error('openai api key secret-value failed during agent qa')
        )

        const { POST } = await import('./agent-qa/route')
        const response = await POST(makeRequest('/api/ai/agent-qa', {
            agentId: 'agent-1',
            messageLimit: 25,
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Agent QA failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('api key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('api key')
    })

    it('does not expose FAQ extraction failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.extractFAQ.mockRejectedValue(
            new Error('llm provider token secret-value failed extracting faq')
        )

        const { POST } = await import('./extract-faq/route')
        const response = await POST(makeRequest('/api/ai/extract-faq', {
            conversationText: 'pregunta frecuente',
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('FAQ extraction failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('provider token')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('provider token')
    })

    it('does not expose FAQ save failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.saveFAQ.mockRejectedValue(
            new Error('database password secret-value failed saving faq')
        )

        const { POST } = await import('./save-faq/route')
        const response = await POST(makeRequest('/api/ai/save-faq', {
            question: 'Pregunta',
            answer: 'Respuesta',
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('FAQ save failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose usage stats fetch failures in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mockUsageStatsQuery({
            data: null,
            error: { message: 'supabase service role secret-value failed reading usage logs' },
        })

        const { GET } = await import('./usage-stats/route')
        const response = await GET()
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Usage stats unavailable')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
    })
})
