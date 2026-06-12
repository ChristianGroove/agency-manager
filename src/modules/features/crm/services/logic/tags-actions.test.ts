import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    tagsService: {
        getTags: vi.fn(),
        createTag: vi.fn(),
        updateTag: vi.fn(),
        deleteTag: vi.fn(),
        getLeadTags: vi.fn(),
        toggleLeadTag: vi.fn(),
        addTagByName: vi.fn(),
        removeTagByName: vi.fn(),
        clearLeadTags: vi.fn(),
    },
    TagsService: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('./services/tags.service', () => ({
    TagsService: mocks.TagsService,
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
    mocks.TagsService.mockReset()
    Object.values(mocks.tagsService).forEach((fn) => fn.mockReset())
})

async function importTagActions() {
    mocks.createClient.mockResolvedValue(sessionClient())
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.TagsService.mockImplementation(function () {
        return mocks.tagsService
    })
    return import('./tags-actions')
}

describe('CRM logic tag actions', () => {
    it('creates tags without changing the success contract', async () => {
        const tag = {
            id: 'tag-1',
            organization_id: 'org-current',
            name: 'VIP',
            color: '#f59e0b',
            created_at: '2026-06-10T00:00:00.000Z',
        }
        mocks.tagsService.createTag.mockResolvedValue(tag)

        const { createTag } = await importTagActions()
        const result = await createTag('VIP', '#f59e0b')

        expect(result).toEqual({ success: true, data: tag })
        expect(mocks.TagsService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.tagsService.createTag).toHaveBeenCalledWith('VIP', '#f59e0b')
    })

    it('does not expose tag list failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.tagsService.getTags.mockRejectedValue(new Error('tag secret-value list failed'))

        const { getTags } = await importTagActions()
        const result = await getTags()

        expect(result).toEqual([])
        expect(consoleError).toHaveBeenCalledWith('Error fetching tags:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose tag mutation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.tagsService.toggleLeadTag.mockRejectedValue(new Error('tag secret-value toggle failed'))

        const { toggleLeadTag } = await importTagActions()
        const result = await toggleLeadTag('lead-secret-id', 'tag-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de etiquetas' })
        expect(mocks.tagsService.toggleLeadTag).toHaveBeenCalledWith('lead-secret-id', 'tag-secret-id')
        expect(consoleError).toHaveBeenCalledWith('Error toggling lead tag:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose system tag failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.tagsService.addTagByName.mockRejectedValue(new Error('tag secret-value system failed'))

        const { addLeadTagSystem } = await importTagActions()
        const result = await addLeadTagSystem('lead-secret-id', 'VIP', 'org-current')

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de etiquetas' })
        expect(mocks.TagsService).toHaveBeenCalledWith(expect.anything(), 'org-current')
        expect(mocks.tagsService.addTagByName).toHaveBeenCalledWith('lead-secret-id', 'VIP')
        expect(consoleError).toHaveBeenCalledWith('Error adding lead tag:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
