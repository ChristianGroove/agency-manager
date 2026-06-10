import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdmin: { from: vi.fn() },
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    getCurrentUserPermissions: vi.fn(),
    contactService: {
        createContact: vi.fn(),
        getPaginated: vi.fn(),
        updateContactStatus: vi.fn(),
        convertToClient: vi.fn(),
        updateProfile: vi.fn(),
        deleteContacts: vi.fn(),
    },
    clientService: {
        getPaginated: vi.fn(),
        deleteClients: vi.fn(),
    },
    pipelineService: {
        getStages: vi.fn(),
        getPipelineViewData: vi.fn(),
        createStage: vi.fn(),
        updateStage: vi.fn(),
        reorderStages: vi.fn(),
        deleteStage: vi.fn(),
        getDefaultPipeline: vi.fn(),
        toggleStrictMode: vi.fn(),
    },
    tagService: {},
    taskService: {},
    dealService: {},
    ContactService: vi.fn(),
    ClientService: vi.fn(),
    PipelineService: vi.fn(),
    TagService: vi.fn(),
    CrmTaskService: vi.fn(),
    DealService: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/settings/actions/team', () => ({
    getCurrentUserPermissions: mocks.getCurrentUserPermissions,
}))

vi.mock('./services/contact-service', () => ({
    ContactService: mocks.ContactService,
}))

vi.mock('./services/client-service', () => ({
    ClientService: mocks.ClientService,
}))

vi.mock('./services/logic/services/pipeline.service', () => ({
    PipelineService: mocks.PipelineService,
}))

vi.mock('./services/tag-service', () => ({
    TagService: mocks.TagService,
}))

vi.mock('./services/crm-task-service', () => ({
    CrmTaskService: mocks.CrmTaskService,
}))

vi.mock('./services/deal-service', () => ({
    DealService: mocks.DealService,
}))

function supabaseSessionClient(userId = 'user-current') {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: userId } } })),
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
    mocks.getCurrentUserPermissions.mockReset()
    mocks.ContactService.mockReset()
    mocks.ClientService.mockReset()
    mocks.PipelineService.mockReset()
    mocks.TagService.mockReset()
    mocks.CrmTaskService.mockReset()
    mocks.DealService.mockReset()
    Object.values(mocks.contactService).forEach((fn) => fn.mockReset())
    Object.values(mocks.clientService).forEach((fn) => fn.mockReset())
    Object.values(mocks.pipelineService).forEach((fn) => fn.mockReset())
})

async function importCrmActions() {
    mocks.createClient.mockResolvedValue(supabaseSessionClient())
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.ContactService.mockImplementation(function () {
        return mocks.contactService
    })
    mocks.ClientService.mockImplementation(function () {
        return mocks.clientService
    })
    mocks.PipelineService.mockImplementation(function () {
        return mocks.pipelineService
    })
    mocks.TagService.mockImplementation(function () {
        return mocks.tagService
    })
    mocks.CrmTaskService.mockImplementation(function () {
        return mocks.taskService
    })
    mocks.DealService.mockImplementation(function () {
        return mocks.dealService
    })
    return import('./crm-actions')
}

describe('CRM contact server actions', () => {
    it('creates contacts without changing the success contract', async () => {
        const contact = { id: 'lead-1', name: 'Ada', organization_id: 'org-current' }
        mocks.contactService.createContact.mockResolvedValue(contact)

        const { createContactAction } = await importCrmActions()
        const result = await createContactAction({ name: 'Ada' })

        expect(result).toEqual({ success: true, data: contact })
        expect(mocks.ContactService).toHaveBeenCalledWith(expect.anything(), 'org-current', 'user-current')
        expect(mocks.contactService.createContact).toHaveBeenCalledWith({ name: 'Ada' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/clients')
    })

    it('does not expose contact creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.contactService.createContact.mockRejectedValue(new Error('contact secret-value create failed'))

        const { createContactAction } = await importCrmActions()
        const result = await createContactAction({ name: 'Ada' })

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de contactos' })
        expect(consoleError).toHaveBeenCalledWith('[createContactAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('does not expose client deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.clientService.deleteClients.mockRejectedValue(new Error('client secret-value delete failed'))

        const { deleteClientsAction } = await importCrmActions()
        const result = await deleteClientsAction(['client-secret-id'])

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de contactos' })
        expect(mocks.ClientService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.clientService.deleteClients).toHaveBeenCalledWith(['client-secret-id'])
        expect(consoleError).toHaveBeenCalledWith('[deleteClientsAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})

describe('CRM pipeline server actions', () => {
    it('creates pipeline stages without changing the success contract', async () => {
        const stage = { id: 'stage-1', name: 'Qualified', organization_id: 'org-current' }
        mocks.pipelineService.createStage.mockResolvedValue(stage)

        const { createPipelineStageAction } = await importCrmActions()
        const result = await createPipelineStageAction({ name: 'Qualified' })

        expect(result).toEqual({ success: true, data: stage })
        expect(mocks.PipelineService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.pipelineService.createStage).toHaveBeenCalledWith({ name: 'Qualified' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose pipeline list failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.pipelineService.getStages.mockRejectedValue(new Error('pipeline secret-value read failed'))

        const { getPipelineStagesAction } = await importCrmActions()
        const result = await getPipelineStagesAction()

        expect(result).toEqual([])
        expect(consoleError).toHaveBeenCalledWith('[getPipelineStagesAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose pipeline mutation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.pipelineService.deleteStage.mockRejectedValue(new Error('pipeline secret-value delete failed'))

        const { deletePipelineStageAction } = await importCrmActions()
        const result = await deletePipelineStageAction('stage-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de pipeline' })
        expect(mocks.pipelineService.deleteStage).toHaveBeenCalledWith('stage-secret-id')
        expect(consoleError).toHaveBeenCalledWith('[deletePipelineStageAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
