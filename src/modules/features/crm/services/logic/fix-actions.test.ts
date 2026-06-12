import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    getPipelineStages: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('./pipeline-actions', () => ({
    getPipelineStages: mocks.getPipelineStages,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function createQueuedClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function selectEq(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function updateIn(result: { error?: unknown }) {
    const query: any = {
        update: vi.fn(() => query),
        in: vi.fn(async () => result),
    }

    return query
}

function secretError(message = 'fix secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getPipelineStages.mockReset()
    mocks.revalidatePath.mockReset()
})

async function importFixActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.getPipelineStages.mockResolvedValue([
        { id: 'stage-1', status_key: 'new' },
        { id: 'stage-2', status_key: 'qualified' },
    ])
    return import('./fix-actions')
}

describe('CRM fix actions', () => {
    it('fixes orphan lead statuses without changing the success contract', async () => {
        const leadList = selectEq({
            data: [
                { id: 'lead-1', status: 'lost-old-stage' },
                { id: 'lead-2', status: 'qualified' },
            ],
        })
        const update = updateIn({ error: null })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [leadList, update],
        }))

        const { fixLeadsStatus } = await importFixActions()
        const result = await fixLeadsStatus()

        expect(result).toEqual({ success: true, count: 1, fixedTo: 'new' })
        expect(update.update).toHaveBeenCalledWith({ status: 'new' })
        expect(update.in).toHaveBeenCalledWith('id', ['lead-1'])
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose lead status repair failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const leadList = selectEq({
            data: [{ id: 'lead-secret-id', status: 'lost-old-stage' }],
        })
        const update = updateIn({ error: secretError('fix leads secret-value update failed') })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [leadList, update],
        }))

        const { fixLeadsStatus } = await importFixActions()
        const result = await fixLeadsStatus()

        expect(result).toEqual({ success: false, error: 'No se pudo reparar el estado de los leads' })
        expect(consoleError).toHaveBeenCalledWith('Error fixing lead statuses:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
