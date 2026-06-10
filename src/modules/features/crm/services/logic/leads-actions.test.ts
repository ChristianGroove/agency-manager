import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdmin: { from: vi.fn() },
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    leadsService: {
        createLead: vi.fn(),
        convertToClient: vi.fn(),
        getPaginated: vi.fn(),
        updateLeadStatus: vi.fn(),
        updateProfile: vi.fn(),
        calculateScore: vi.fn(),
        recalculateAllScores: vi.fn(),
        generateExportCSV: vi.fn(),
        purgeColdAccounts: vi.fn(),
    },
    leadsRepository: {
        update: vi.fn(),
    },
    LeadsService: vi.fn(),
    LeadsRepository: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('./services/leads.service', () => ({
    LeadsService: mocks.LeadsService,
}))

vi.mock('./repositories/leads.repository', () => ({
    LeadsRepository: mocks.LeadsRepository,
}))

function sessionClient(user: { id: string } | null = { id: 'user-1' }) {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user } })),
        },
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseAdmin.from.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.LeadsService.mockReset()
    mocks.LeadsRepository.mockReset()
    Object.values(mocks.leadsService).forEach((fn) => fn.mockReset())
    Object.values(mocks.leadsRepository).forEach((fn) => fn.mockReset())
})

async function importLeadActions() {
    mocks.createClient.mockResolvedValue(sessionClient())
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.LeadsService.mockImplementation(function () {
        return mocks.leadsService
    })
    mocks.LeadsRepository.mockImplementation(function () {
        return mocks.leadsRepository
    })
    return import('./leads-actions')
}

describe('CRM leads actions', () => {
    it('creates leads without changing the success contract', async () => {
        const lead = { id: 'lead-1', organization_id: 'org-current', name: 'Ada' }
        mocks.leadsService.createLead.mockResolvedValue(lead)

        const { createLead } = await importLeadActions()
        const result = await createLead({ name: 'Ada', email: 'ada@example.com' })

        expect(result).toEqual({ success: true, data: lead })
        expect(mocks.LeadsService).toHaveBeenCalledWith(expect.anything(), 'org-current', 'user-1')
        expect(mocks.leadsService.createLead).toHaveBeenCalledWith({ name: 'Ada', email: 'ada@example.com' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm/contacts')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm/deals')
    })

    it('does not expose create lead failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.leadsService.createLead.mockRejectedValue(new Error('lead secret-value create failed'))

        const { createLead } = await importLeadActions()
        const result = await createLead({ name: 'Ada' })

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de leads' })
        expect(consoleError).toHaveBeenCalledWith('Error creating lead:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('keeps pipeline process rule failures user-facing while sanitizing logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const businessRule = "Process Rules prevent moving from 'draft' to 'won'."
        mocks.leadsService.updateLeadStatus.mockRejectedValue(new Error(businessRule))

        const { updateLeadStatus } = await importLeadActions()
        const result = await updateLeadStatus('lead-1', 'won')

        expect(result).toEqual({ success: false, error: businessRule })
        expect(mocks.LeadsService).toHaveBeenCalledWith(mocks.supabaseAdmin, 'org-current', 'user-1')
        expect(consoleError).toHaveBeenCalledWith('Error updating lead status:', { name: 'Error' })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose system status update repository failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.leadsRepository.update.mockRejectedValue(new Error('repo secret-value update failed'))

        const { updateLeadStatusSystem } = await importLeadActions()
        const result = await updateLeadStatusSystem('lead-secret-id', 'qualified', 'org-current')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de leads' })
        expect(mocks.LeadsRepository).toHaveBeenCalledWith(mocks.supabaseAdmin)
        expect(mocks.leadsRepository.update).toHaveBeenCalledWith('lead-secret-id', { status: 'qualified' }, 'org-current')
        expect(consoleError).toHaveBeenCalledWith('Error updating lead status (system):', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose paginated lead fetch failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.leadsService.getPaginated.mockRejectedValue(new Error('lead secret-value fetch failed'))

        const { getPaginatedLeads } = await importLeadActions()
        const result = await getPaginatedLeads({ page: 2, pageSize: 10, search: 'ada' })

        expect(result).toEqual({ leads: [], totalCount: 0, stageCounts: {} })
        expect(mocks.LeadsService).toHaveBeenCalledWith(mocks.supabaseAdmin, 'org-current')
        expect(mocks.leadsService.getPaginated).toHaveBeenCalledWith({ page: 2, pageSize: 10, search: 'ada' })
        expect(consoleError).toHaveBeenCalledWith('Error in getPaginatedLeads:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose lead export failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.leadsService.generateExportCSV.mockRejectedValue(new Error('csv secret-value export failed'))

        const { exportLeadsToCSV } = await importLeadActions()
        const result = await exportLeadsToCSV()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de leads' })
        expect(mocks.leadsService.generateExportCSV).toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledWith('[CRM_EXPORT] Error exporting leads:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
