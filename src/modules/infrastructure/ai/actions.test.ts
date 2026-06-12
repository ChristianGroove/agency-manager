import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    getCurrentOrganizationId: vi.fn(),
    getProcessContext: vi.fn(),
    analyzeLead: vi.fn(),
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/features/crm/services/process-engine/engine', () => ({
    ProcessEngine: {
        getProcessContext: mocks.getProcessContext,
    },
}))

vi.mock('./analysis-service', () => ({
    AnalysisService: {
        analyzeLead: mocks.analyzeLead,
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

const processContext = {
    instance: {
        id: 'process-secret-id',
        updated_at: '2026-01-01T00:00:00Z',
        current_state: 'new',
        context: {},
    },
    state: {
        id: 'state-secret-id',
        name: 'Nuevo',
        is_terminal: false,
    },
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getProcessContext.mockReset()
    mocks.analyzeLead.mockReset()
})

describe('getLeadAnalysis', () => {
    it('returns recommendations without changing the success contract', async () => {
        const recommendations = [{
            id: 'stagnation',
            type: 'warning',
            message: 'Lead sin actividad',
            score: 80,
        }]
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.getProcessContext.mockResolvedValue(processContext)
        mocks.analyzeLead.mockResolvedValue(recommendations)

        const { getLeadAnalysis } = await import('./actions')
        const result = await getLeadAnalysis('lead-current')

        expect(result).toEqual({
            success: true,
            recommendations,
        })
        expect(mocks.getProcessContext).toHaveBeenCalledWith('lead-current')
        expect(mocks.analyzeLead).toHaveBeenCalledWith(processContext.instance, processContext.state)
    })

    it('keeps expected business errors stable', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValueOnce(null)

        const { getLeadAnalysis } = await import('./actions')
        await expect(getLeadAnalysis('lead-current')).resolves.toEqual({
            success: false,
            error: 'No context',
        })

        mocks.getCurrentOrganizationId.mockResolvedValueOnce('org-current')
        mocks.getProcessContext.mockResolvedValueOnce(null)

        await expect(getLeadAnalysis('lead-current')).resolves.toEqual({
            success: false,
            error: 'No active process found for analysis',
        })
    })

    it('does not expose process analysis exceptions in deployed action results or logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.getProcessContext.mockRejectedValue(
            Object.assign(new Error('db password secret-value failed for lead-secret-id'), {
                code: '42501',
            })
        )

        const { getLeadAnalysis } = await import('./actions')
        const result = await getLeadAnalysis('lead-secret-id')

        expect(result).toEqual({
            success: false,
            error: 'No se pudo generar el analisis del lead',
        })

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).toContain('42501')
        expect(logText).not.toContain('secret-value')
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('db password')
    })
})
