import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    analyzeAgentPerformance: vi.fn(),
    extractFAQ: vi.fn(),
    saveFAQ: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/features/messaging/messaging-actions', () => ({
    analyzeAgentPerformance: mocks.analyzeAgentPerformance,
    extractFAQ: mocks.extractFAQ,
    saveFAQ: mocks.saveFAQ,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function makeRequest(path: string, body: Record<string, unknown>) {
    return new Request(`https://pixy.test${path}`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
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
})
