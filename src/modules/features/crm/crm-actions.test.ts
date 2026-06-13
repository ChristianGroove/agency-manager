import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    getSettings: vi.fn(),
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
    tagService: {
        getTags: vi.fn(),
        createTag: vi.fn(),
        updateTag: vi.fn(),
        deleteTag: vi.fn(),
        addTagByName: vi.fn(),
        toggleLeadTag: vi.fn(),
        getLeadTags: vi.fn(),
        clearLeadTags: vi.fn(),
    },
    taskService: {
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        getTasksForLead: vi.fn(),
        getMyTasks: vi.fn(),
        getTaskStats: vi.fn(),
    },
    dealService: {
        getOrCreateDealCart: vi.fn(),
        addToCart: vi.fn(),
        updateCartItem: vi.fn(),
        removeCartItem: vi.fn(),
        searchCatalog: vi.fn(),
        sendInteractiveQuote: vi.fn(),
    },
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

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/settings/actions/crud', () => ({
    getSettings: mocks.getSettings,
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

function supabaseSessionClient(userId = 'user-current', overrides: Record<string, unknown> = {}) {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: userId } } })),
        },
        ...overrides,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getSettings.mockReset()
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
    Object.values(mocks.tagService).forEach((fn) => fn.mockReset())
    Object.values(mocks.taskService).forEach((fn) => fn.mockReset())
    Object.values(mocks.dealService).forEach((fn) => fn.mockReset())
})

async function importCrmActions(options: { supabase?: any } = {}) {
    mocks.createClient.mockResolvedValue(options.supabase ?? supabaseSessionClient())
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

describe('CRM tag server actions', () => {
    it('creates tags without changing the success contract', async () => {
        const tag = { id: 'tag-1', name: 'VIP', color: '#111111' }
        mocks.tagService.createTag.mockResolvedValue(tag)

        const { createTagAction } = await importCrmActions()
        const result = await createTagAction('VIP', '#111111')

        expect(result).toEqual({ success: true, data: tag })
        expect(mocks.TagService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.tagService.createTag).toHaveBeenCalledWith('VIP', '#111111')
    })

    it('does not expose tag list failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.tagService.getTags.mockRejectedValue(new Error('tag secret-value read failed'))

        const { getTagsAction } = await importCrmActions()
        const result = await getTagsAction()

        expect(result).toEqual([])
        expect(consoleError).toHaveBeenCalledWith('[getTagsAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose system tag assignment failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.tagService.addTagByName.mockRejectedValue(new Error('tag secret-value system failed'))

        const { addContactTagSystemAction } = await importCrmActions()
        const result = await addContactTagSystemAction('lead-secret-id', 'VIP', 'org-current')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de etiquetas' })
        expect(mocks.TagService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.tagService.addTagByName).toHaveBeenCalledWith('lead-secret-id', 'VIP')
        expect(consoleError).toHaveBeenCalledWith('[addContactTagSystemAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})

describe('CRM settings server actions', () => {
    it('reads CRM settings without changing the success contract', async () => {
        const settings = { currency: 'COP', locale: 'es-CO' }
        mocks.getSettings.mockResolvedValue(settings)

        const { getSettingsAction } = await importCrmActions()
        const result = await getSettingsAction()

        expect(result).toEqual({ success: true, data: settings })
        expect(mocks.getSettings).toHaveBeenCalled()
    })

    it('does not expose settings failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.getSettings.mockRejectedValue(new Error('settings secret-value read failed'))

        const { getSettingsAction } = await importCrmActions()
        const result = await getSettingsAction()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de configuracion CRM' })
        expect(consoleError).toHaveBeenCalledWith('[getSettingsAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose category query failures and keeps the organization filter', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const eq = vi.fn(async () => ({ data: null, error: new Error('category secret-value query failed') }))
        const select = vi.fn(() => ({ eq }))
        const from = vi.fn(() => ({ select }))
        const supabase = supabaseSessionClient('user-current', { from })

        const { getCategoriesAction } = await importCrmActions({ supabase })
        const result = await getCategoriesAction()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de configuracion CRM' })
        expect(from).toHaveBeenCalledWith('client_categories')
        expect(select).toHaveBeenCalledWith('*')
        expect(eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(consoleError).toHaveBeenCalledWith('[getCategoriesAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})

describe('CRM task server actions', () => {
    it('creates contact tasks without changing the success contract', async () => {
        const task = { id: 'task-1', lead_id: 'lead-1', title: 'Call' }
        mocks.taskService.createTask.mockResolvedValue(task)

        const { createContactTaskAction } = await importCrmActions()
        const result = await createContactTaskAction({ lead_id: 'lead-1', title: 'Call' })

        expect(result).toEqual({ success: true, data: task })
        expect(mocks.CrmTaskService).toHaveBeenCalledWith(expect.anything(), 'org-current', 'user-current')
        expect(mocks.taskService.createTask).toHaveBeenCalledWith({ lead_id: 'lead-1', title: 'Call' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose task stats failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.taskService.getTaskStats.mockRejectedValue(new Error('task secret-value stats failed'))

        const { getTaskStatsAction } = await importCrmActions()
        const result = await getTaskStatsAction()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de tareas CRM' })
        expect(consoleError).toHaveBeenCalledWith('[getTaskStatsAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose task deletion failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.taskService.deleteTask.mockRejectedValue(new Error('task secret-value delete failed'))

        const { deleteContactTaskAction } = await importCrmActions()
        const result = await deleteContactTaskAction('task-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de tareas CRM' })
        expect(mocks.taskService.deleteTask).toHaveBeenCalledWith('task-secret-id')
        expect(consoleError).toHaveBeenCalledWith('[deleteContactTaskAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})

describe('CRM deal server actions', () => {
    it('gets deal carts without changing the success contract', async () => {
        const cart = { id: 'cart-1', lead_id: 'lead-1' }
        mocks.dealService.getOrCreateDealCart.mockResolvedValue(cart)

        const { getDealCartAction } = await importCrmActions()
        const result = await getDealCartAction('lead-1')

        expect(result).toEqual({ success: true, data: cart })
        expect(mocks.DealService).toHaveBeenCalledWith(expect.anything())
        expect(mocks.dealService.getOrCreateDealCart).toHaveBeenCalledWith('lead-1')
    })

    it('does not expose catalog search failures and keeps organization scope', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dealService.searchCatalog.mockRejectedValue(new Error('deal secret-value catalog failed'))

        const { searchCatalogAction } = await importCrmActions()
        const result = await searchCatalogAction('chairs', 'furniture', 2, 25)

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de deals CRM' })
        expect(mocks.dealService.searchCatalog).toHaveBeenCalledWith('org-current', 'chairs', 'furniture', 2, 25)
        expect(consoleError).toHaveBeenCalledWith('[searchCatalogAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose interactive quote failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dealService.sendInteractiveQuote.mockRejectedValue(new Error('deal secret-value quote failed'))

        const { sendInteractiveQuoteAction } = await importCrmActions()
        const result = await sendInteractiveQuoteAction('cart-secret-id', 'conversation-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de deals CRM' })
        expect(mocks.dealService.sendInteractiveQuote).toHaveBeenCalledWith('cart-secret-id', 'conversation-secret-id')
        expect(consoleError).toHaveBeenCalledWith('[sendInteractiveQuoteAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })
})
