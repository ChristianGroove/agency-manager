import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    executeTask: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/infrastructure/ai-engine/service', () => ({
    AIEngine: {
        executeTask: mocks.executeTask,
    },
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
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

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.executeTask.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('legacy messaging AI actions', () => {
    it('refines draft content through the AI engine', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockResolvedValue({ data: 'Respuesta profesional' })

        const { refineDraftContent } = await import('./actions')
        const result = await refineDraftContent('Responderemos pronto con el detalle solicitado')

        expect(result).toEqual({
            success: true,
            refined: 'Respuesta profesional',
        })
        expect(mocks.executeTask).toHaveBeenCalledWith({
            organizationId: 'org-current',
            taskType: 'messaging.refine_draft_v1',
            payload: { content: 'Responderemos pronto con el detalle solicitado' },
        })
    })

    it('does not expose draft refinement failures in action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.executeTask.mockRejectedValue(new Error('provider token secret-value failed while refining customer@example.com'))

        const { refineDraftContent } = await import('./actions')
        const result = await refineDraftContent('Responderemos pronto con el detalle solicitado')

        expect(result).toEqual({
            success: false,
            error: 'Draft could not be refined',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('customer@example.com')
        expect(logText).not.toContain('provider token')
    })
})
