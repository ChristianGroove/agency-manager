import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    deleteLeadsMedia: vi.fn(),
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

vi.mock('@/modules/features/messaging/cleanup-service', () => ({
    messagingCleanupService: {
        deleteLeadsMedia: mocks.deleteLeadsMedia,
    },
}))

function secretError(message = 'lead secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

function createQueuedClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function deleteEqIn(result: { error?: unknown }) {
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(async () => result),
    }

    return query
}

function deleteEq(result: { error?: unknown }) {
    const query: any = {
        delete: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function selectEq(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function selectEqIn(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(async () => result),
    }

    return query
}

function selectEqEq(result: { data?: unknown; error?: unknown }) {
    let eqCalls = 0
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => {
            eqCalls += 1
            return eqCalls >= 2 ? Promise.resolve(result) : query
        }),
    }

    return query
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.deleteLeadsMedia.mockReset()
})

async function importLeadManagementActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    return import('./lead-management-actions')
}

describe('CRM lead management actions', () => {
    it('deletes selected leads without changing the success contract', async () => {
        const deletion = deleteEqIn({ error: null })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [deletion],
        }))

        const { deleteLeads } = await importLeadManagementActions()
        const result = await deleteLeads(['lead-1', 'lead-2'])

        expect(result).toEqual({ success: true })
        expect(mocks.deleteLeadsMedia).toHaveBeenCalledWith(['lead-1', 'lead-2'])
        expect(deletion.delete).toHaveBeenCalled()
        expect(deletion.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(deletion.in).toHaveBeenCalledWith('id', ['lead-1', 'lead-2'])
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose selected lead deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const deletion = deleteEqIn({ error: secretError('delete lead secret-value failed') })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [deletion],
        }))

        const { deleteLeads } = await importLeadManagementActions()
        const result = await deleteLeads(['lead-secret-id'])

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de gestion de leads' })
        expect(consoleError).toHaveBeenCalledWith('Error deleting leads:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose pipeline lead deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const stages = selectEqEq({ data: [{ status_key: 'qualified' }], error: null })
        const leadsToDelete = selectEqIn({ data: [{ id: 'lead-secret-id' }], error: null })
        const deletion = deleteEqIn({ error: secretError('delete pipeline leads secret-value failed') })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            pipeline_stages: [stages],
            leads: [leadsToDelete, deletion],
        }))

        const { deleteLeadsByPipeline } = await importLeadManagementActions()
        const result = await deleteLeadsByPipeline('pipeline-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de gestion de leads' })
        expect(stages.select).toHaveBeenCalledWith('status_key')
        expect(stages.eq).toHaveBeenCalledWith('pipeline_id', 'pipeline-secret-id')
        expect(stages.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(mocks.deleteLeadsMedia).toHaveBeenCalledWith(['lead-secret-id'])
        expect(deletion.in).toHaveBeenCalledWith('status', ['qualified'])
        expect(consoleError).toHaveBeenCalledWith('Error deleting leads by pipeline:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose media cleanup failures while deleting all leads', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.deleteLeadsMedia.mockRejectedValue(new Error('media cleanup secret-value failed'))
        const leadList = selectEq({ data: [{ id: 'lead-secret-id' }], error: null })
        const deletion = deleteEq({ error: null })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [leadList, deletion],
        }))

        const { deleteAllLeads } = await importLeadManagementActions()
        const result = await deleteAllLeads()

        expect(result).toEqual({ success: true })
        expect(mocks.deleteLeadsMedia).toHaveBeenCalledWith(['lead-secret-id'])
        expect(consoleError).toHaveBeenCalledWith('[LeadActions] All leads media cleanup error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose delete all lead failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const leadList = selectEq({ data: [], error: null })
        const deletion = deleteEq({ error: secretError('delete all leads secret-value failed') })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            leads: [leadList, deletion],
        }))

        const { deleteAllLeads } = await importLeadManagementActions()
        const result = await deleteAllLeads()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de gestion de leads' })
        expect(consoleError).toHaveBeenCalledWith('Error deleting all leads:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
