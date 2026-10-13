import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    requireSuperAdmin: vi.fn(),
    requireOrgRole: vi.fn(),
    orgId: vi.fn(),
    sessionFrom: vi.fn(),
    adminFrom: vi.fn(),
    upsert: vi.fn(),
    upload: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/iam/services/platform-roles', () => ({ requireSuperAdmin: mocks.requireSuperAdmin }))
vi.mock('@/modules/core/iam/services/org-roles', () => ({ requireOrgRole: mocks.requireOrgRole }))
vi.mock('@/modules/core/organizations/actions/crud', () => ({ getCurrentOrganizationId: mocks.orgId }))
vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mocks.sessionFrom,
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'superadmin' } }, error: null })) },
        storage: { from: vi.fn(() => ({ upload: mocks.upload, getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/logo.png' } }) })) },
    })),
}))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.adminFrom } }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { updatePlatformSettings, uploadBrandingAsset } from './actions'

describe('global branding persistence', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.requireSuperAdmin.mockResolvedValue(undefined)
        mocks.adminFrom.mockReturnValue({ upsert: mocks.upsert })
        mocks.upsert.mockResolvedValue({ error: null })
        mocks.upload.mockResolvedValue({ error: null })
    })

    it('rejects non-superadmins before any privileged write', async () => {
        mocks.requireSuperAdmin.mockRejectedValue(new Error('Unauthorized'))
        await expect(updatePlatformSettings({ name: 'Changed' })).rejects.toThrow('Unauthorized')
        expect(mocks.adminFrom).not.toHaveBeenCalled()
        expect(mocks.sessionFrom).not.toHaveBeenCalled()
    })

    it('saves using service permissions, preserves omitted fields and clears explicit logos', async () => {
        await updatePlatformSettings({ logos: { main: '', main_light: null, portal: '', favicon: '', login_bg: '' } })
        expect(mocks.adminFrom).toHaveBeenCalledWith('platform_settings')
        expect(mocks.sessionFrom).not.toHaveBeenCalled()
        const payload = mocks.upsert.mock.calls[0][0]
        expect(payload).toMatchObject({ id: 1, main_logo_url: '', main_logo_light_url: null, portal_logo_url: '', favicon_url: '', login_background_url: '' })
        expect(payload).not.toHaveProperty('agency_name')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/platform/admin')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('does not mutate the supplied socials when saving the website', async () => {
        const socials = { instagram: 'https://instagram.com/pixy' }
        await updatePlatformSettings({ socials, website: 'https://pixy.com.co' })
        expect(socials).not.toHaveProperty('website')
        expect(mocks.upsert.mock.calls[0][0].social_links.website).toBe('https://pixy.com.co')
    })

    it('does not invalidate layouts after a failed save or expose database details', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {})
        mocks.upsert.mockResolvedValue({ error: { code: '42501', message: 'private database details' } })
        await expect(updatePlatformSettings({ name: 'Pixy' })).rejects.toThrow('No se pudo guardar la marca global')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
        expect(log).toHaveBeenCalledWith('[updatePlatformSettings] Save failed:', { code: '42501' })
        log.mockRestore()
    })

    it('authorizes platform uploads separately from the selected tenant', async () => {
        const data = new FormData()
        data.append('file', new File(['logo'], 'logo.png', { type: 'image/png' }))
        data.append('scope', 'platform')
        await expect(uploadBrandingAsset(data)).resolves.toMatchObject({ success: true })
        expect(mocks.requireSuperAdmin).toHaveBeenCalledOnce()
        expect(mocks.orgId).not.toHaveBeenCalled()
        expect(mocks.requireOrgRole).not.toHaveBeenCalled()
    })

    it('rejects platform uploads from a non-superadmin before Storage is touched', async () => {
        mocks.requireSuperAdmin.mockRejectedValue(new Error('Unauthorized'))
        const data = new FormData()
        data.append('scope', 'platform')
        await expect(uploadBrandingAsset(data)).rejects.toThrow('Unauthorized')
        expect(mocks.upload).not.toHaveBeenCalled()
    })
})
