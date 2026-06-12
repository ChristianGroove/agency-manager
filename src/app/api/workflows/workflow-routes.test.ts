import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCurrentOrganizationId: vi.fn(),
    getSuggestions: vi.fn(),
    AIWorkflowAnalyzer: vi.fn(),
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/features/automation/ai-analyzer', () => ({
    AIWorkflowAnalyzer: mocks.AIWorkflowAnalyzer,
}))

const validWorkflow = {
    id: 'workflow_123',
    nodes: [
        { id: 'trigger-1', type: 'trigger', data: { label: 'Start' } },
    ],
    edges: [],
}

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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getSuggestions.mockReset()
    mocks.AIWorkflowAnalyzer.mockReset()
})

describe('/api/workflows routes', () => {
    it('rejects malformed workflow definitions before test execution', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { POST } = await import('./test/route')
        const response = await POST(makeRequest('/api/workflows/test', {
            workflowDefinition: {
                nodes: [{ id: 'node-1', type: 'trigger' }],
                edges: [],
            },
        }))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Workflow definition contains an invalid node' })
    })

    it('rejects oversized workflow test payloads before execution', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { POST } = await import('./test/route')
        const response = await POST(makeRequest('/api/workflows/test', {
            workflowDefinition: {
                nodes: Array.from({ length: 101 }, (_, index) => ({
                    id: `node-${index}`,
                    type: index === 0 ? 'trigger' : 'action',
                    data: { label: `Node ${index}` },
                })),
                edges: [],
            },
        }))

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Workflow definition cannot exceed 100 nodes' })
    })

    it('runs valid workflow tests as dry runs', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { POST } = await import('./test/route')
        const response = await POST(makeRequest('/api/workflows/test', {
            workflowDefinition: validWorkflow,
            testData: { lead: { name: 'Alice' } },
        }))
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.nodes[0]).toMatchObject({
            nodeId: 'trigger-1',
            status: 'success',
        })
    })

    it('rejects by-id workflow tests when the route id and payload id disagree', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')

        const { POST } = await import('./[id]/test/route')
        const response = await POST(
            makeRequest('/api/workflows/workflow_123/test', {
                workflowDefinition: { ...validWorkflow, id: 'workflow_other' },
                testData: {},
            }) as any,
            { params: Promise.resolve({ id: 'workflow_123' }) }
        )

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Workflow id mismatch' })
    })

    it('rejects malformed suggestion graphs before AI analysis', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.AIWorkflowAnalyzer.mockImplementation(function (this: any) {
            this.getSuggestions = mocks.getSuggestions
        })

        const { POST } = await import('./suggest/route')
        const response = await POST(makeRequest('/api/workflows/suggest', {
            nodes: [{ id: 'node-1', type: 'trigger' }],
            edges: [],
        }) as any)

        expect(response.status).toBe(400)
        expect(await response.json()).toEqual({ error: 'Workflow definition contains an invalid node' })
        expect(mocks.AIWorkflowAnalyzer).not.toHaveBeenCalled()
        expect(mocks.getSuggestions).not.toHaveBeenCalled()
    })

    it('sends validated suggestion graphs to the workflow analyzer', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.getSuggestions.mockResolvedValue([{ nodeType: 'email', confidence: 0.8 }])
        mocks.AIWorkflowAnalyzer.mockImplementation(function (this: any) {
            this.getSuggestions = mocks.getSuggestions
        })

        const { POST } = await import('./suggest/route')
        const response = await POST(makeRequest('/api/workflows/suggest', {
            nodes: [
                { id: 'trigger-1', type: 'trigger', data: { label: 'Start', value: '{{lead.name}}' } },
            ],
            edges: [],
        }) as any)
        const body = await response.json()

        expect(response.status).toBe(200)
        expect(mocks.AIWorkflowAnalyzer).toHaveBeenCalledWith('org-current')
        expect(mocks.getSuggestions).toHaveBeenCalledWith(expect.objectContaining({
            nodes: [expect.objectContaining({ id: 'trigger-1' })],
            variables: ['lead.name'],
        }))
        expect(body).toMatchObject({
            suggestions: [{ nodeType: 'email', confidence: 0.8 }],
            context: { nodeCount: 1, variables: ['lead.name'] },
        })
    })

    it('does not expose workflow test exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockRejectedValue(
            new Error('workflow database password secret-value failed before dry run')
        )

        const { POST } = await import('./test/route')
        const response = await POST(makeRequest('/api/workflows/test', {
            workflowDefinition: validWorkflow,
            testData: {},
        }))
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Workflow test failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('database password')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('database password')
    })

    it('does not expose by-id workflow test exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockRejectedValue(
            new Error('workflow service role secret-value failed for by-id dry run')
        )

        const { POST } = await import('./[id]/test/route')
        const response = await POST(
            makeRequest('/api/workflows/workflow_123/test', {
                workflowDefinition: validWorkflow,
                testData: {},
            }) as any,
            { params: Promise.resolve({ id: 'workflow_123' }) }
        )
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Workflow test failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('service role')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('service role')
    })

    it('does not expose workflow suggestion exceptions in production responses or logs', async () => {
        setupProductionRuntime()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.getSuggestions.mockRejectedValue(
            new Error('openai api key secret-value failed suggesting workflow')
        )
        mocks.AIWorkflowAnalyzer.mockImplementation(function (this: any) {
            this.getSuggestions = mocks.getSuggestions
        })

        const { POST } = await import('./suggest/route')
        const response = await POST(makeRequest('/api/workflows/suggest', {
            nodes: [
                { id: 'trigger-1', type: 'trigger', data: { label: 'Start' } },
            ],
            edges: [],
        }) as any)
        const responseText = await response.text()

        expect(response.status).toBe(500)
        expect(responseText).toContain('Workflow suggestions failed')
        expect(responseText).not.toContain('secret-value')
        expect(responseText).not.toContain('api key')

        const errorLogText = collectConsoleCalls(errorSpy)
        expect(errorLogText).not.toContain('secret-value')
        expect(errorLogText).not.toContain('api key')
    })
})
