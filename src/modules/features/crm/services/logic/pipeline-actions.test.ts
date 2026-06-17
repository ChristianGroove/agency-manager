import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    pipelineService: {
        getStages: vi.fn(),
        createStage: vi.fn(),
        updateStage: vi.fn(),
        deleteStage: vi.fn(),
        reorderStages: vi.fn(),
        getDefaultPipeline: vi.fn(),
        toggleStrictMode: vi.fn(),
        getCachedStages: vi.fn(),
        getPipelineViewData: vi.fn(),
    },
    PipelineService: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./services/pipeline.service', () => ({
    PipelineService: mocks.PipelineService,
}))

function sessionClient() {
    return { auth: { getUser: vi.fn() } }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.PipelineService.mockReset()
    Object.values(mocks.pipelineService).forEach((fn) => fn.mockReset())
})

async function importPipelineActions() {
    mocks.createClient.mockResolvedValue(sessionClient())
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.PipelineService.mockImplementation(function () {
        return mocks.pipelineService
    })
    return import('./pipeline-actions')
}

describe('CRM logic pipeline actions', () => {
    it('creates pipeline stages without changing the success contract', async () => {
        const stage = { id: 'stage-1', organization_id: 'org-current', name: 'Qualified' }
        mocks.pipelineService.createStage.mockResolvedValue(stage)

        const { createPipelineStage } = await importPipelineActions()
        const result = await createPipelineStage({ name: 'Qualified', status_key: 'qualified' })

        expect(result).toEqual({ success: true, data: stage })
        expect(mocks.PipelineService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.pipelineService.createStage).toHaveBeenCalledWith({ name: 'Qualified', status_key: 'qualified' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm/pipeline')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm/settings/pipeline')
    })

    it('does not expose pipeline stage list failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.pipelineService.getStages.mockRejectedValue(new Error('pipeline secret-value list failed'))

        const { getPipelineStages } = await importPipelineActions()
        const result = await getPipelineStages()

        expect(result).toEqual([])
        expect(consoleError).toHaveBeenCalledWith('Error fetching pipeline stages:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose pipeline mutation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.pipelineService.reorderStages.mockRejectedValue(new Error('pipeline secret-value reorder failed'))

        const { reorderPipelineStages } = await importPipelineActions()
        const result = await reorderPipelineStages(['stage-secret-id'])

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de pipeline' })
        expect(mocks.pipelineService.reorderStages).toHaveBeenCalledWith(['stage-secret-id'])
        expect(consoleError).toHaveBeenCalledWith('Error reordering pipeline stages:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose pipeline view failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.pipelineService.getPipelineViewData.mockRejectedValue(new Error('pipeline secret-value view failed'))

        const { getPipelineData } = await importPipelineActions()
        const result = await getPipelineData('connection-secret-id')

        expect(result).toBeNull()
        expect(mocks.pipelineService.getPipelineViewData).toHaveBeenCalledWith('connection-secret-id')
        expect(consoleError).toHaveBeenCalledWith('Error fetching pipeline data:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
