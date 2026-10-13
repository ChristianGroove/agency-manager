import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type BrandingConfig } from '@/types/branding'

const mocks = vi.hoisted(() => ({
    from: vi.fn(), adminFrom: vi.fn(), update: vi.fn(), insert: vi.fn(),
    orgId: vi.fn(), requireOrgRole: vi.fn(), revalidatePath: vi.fn(),
}))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: vi.fn(async () => ({ from: mocks.from })) }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.adminFrom } }))
vi.mock('@/modules/core/organizations/actions/crud', () => ({ getCurrentOrganizationId: mocks.orgId }))
vi.mock('@/modules/core/iam/services/org-roles', () => ({ requireOrgRole: mocks.requireOrgRole }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ requireSuperAdmin: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { getEffectiveBranding, updateOrganizationBranding } from './actions'

const platform = () => ({ agency_name: 'Pixy', main_logo_url: '/new-pixy.svg', main_logo_light_url: '/new-pixy-light.svg',
    favicon_url: '/new-pixy-icon.svg', portal_logo_url: '/pixy-portal.svg', login_background_url: '/pixy-bg.png',
    brand_color_primary: '#d605c8', brand_color_secondary: '#00e0ff', social_links: {} })

function query(data: unknown, error: unknown = null) {
    const builder = { select: () => builder, eq: () => builder,
        single: async () => ({ data, error }), maybeSingle: async () => ({ data, error }) }
    return builder
}

describe('live platform logo inheritance', () => {
    let global: ReturnType<typeof platform>
    let org: any
    let settings: any

    beforeEach(() => {
        vi.resetAllMocks()
        global = platform()
        org = { branding_tier_id: 'basic', branding_tier: { features: { custom_logo: false, custom_colors: false } } }
        settings = { id: 'settings-1', agency_name: 'Retail Demo', main_logo_url: '/deleted-pixy.png',
            main_logo_light_url: '/deleted-pixy-light.png', isotipo_url: '/deleted-pixy-icon.svg',
            portal_logo_url: '/copied-portal.png', portal_login_background_url: '/copied-bg.png',
            portal_primary_color: '#111111', portal_secondary_color: '#222222' }
        mocks.orgId.mockResolvedValue('org-1')
        mocks.from.mockImplementation((table: string) => {
            if (table === 'platform_settings') return query(global)
            if (table === 'organizations') return query(org)
            if (table === 'organization_settings') return query(settings)
            throw Error('Unexpected table')
        })
        mocks.adminFrom.mockReturnValue({ update: mocks.update, insert: mocks.insert })
        mocks.update.mockReturnValue({ eq: vi.fn(async () => ({ error: null })) })
        mocks.insert.mockResolvedValue({ error: null })
    })

    it('a basic tenant uses new global assets despite stale saved copies', async () => {
        const result = await getEffectiveBranding('org-1')
        expect(result.logos).toEqual({ main: global.main_logo_url, main_light: global.main_logo_light_url,
            favicon: global.favicon_url, portal: global.portal_logo_url, login_bg: global.login_background_url })
        expect(result.colors.primary).toBe(global.brand_color_primary)
        expect(result.name).toBe('Retail Demo')
    })

    it('inherits subsequent global updates without saving tenant settings again', async () => {
        expect((await getEffectiveBranding('org-1')).logos.main).toBe('/new-pixy.svg')
        global.main_logo_url = '/next-pixy.svg'
        expect((await getEffectiveBranding('org-1')).logos.main).toBe('/next-pixy.svg')
    })

    it('preserves real white-label overrides', async () => {
        org.branding_tier_id = 'whitelabel'
        settings.main_logo_url = '/custom-company.svg'
        expect((await getEffectiveBranding('org-1')).logos.main).toBe('/custom-company.svg')
    })

    it('a white-label tenant without overrides inherits the current global logos', async () => {
        org.branding_tier_id = 'whitelabel'
        settings.main_logo_url = null
        settings.main_logo_light_url = null
        settings.isotipo_url = null
        const result = await getEffectiveBranding('org-1')
        expect(result.logos.main).toBe(global.main_logo_url)
        expect(result.logos.main_light).toBe(global.main_logo_light_url)
        expect(result.logos.favicon).toBe(global.favicon_url)
    })

    it('respects independently configured logo and color entitlements', async () => {
        org.branding_tier = [{ features: { custom_logo: true, custom_colors: false } }]
        const result = await getEffectiveBranding('org-1')
        expect(result.logos.main).toBe(settings.main_logo_url)
        expect(result.colors.primary).toBe(global.brand_color_primary)
    })

    it('uses global assets if tenant settings are absent', async () => {
        settings = null
        expect((await getEffectiveBranding('org-1')).logos.main).toBe(global.main_logo_url)
    })

    it('does not freeze inherited defaults when a white-label tenant saves business details', async () => {
        org.branding_tier_id = 'whitelabel'
        settings.main_logo_url = null
        settings.main_logo_light_url = null
        settings.isotipo_url = null
        settings.portal_logo_url = null
        settings.portal_login_background_url = null
        const data = await getEffectiveBranding('org-1')
        await updateOrganizationBranding({ ...data, name: 'New company name' })
        expect(mocks.update.mock.calls[0][0]).toMatchObject({ agency_name: 'New company name', main_logo_url: null,
            main_logo_light_url: null, isotipo_url: null, portal_logo_url: null, portal_login_background_url: null })
    })

    it('does not let a basic tenant persist custom visual overrides', async () => {
        const data = await getEffectiveBranding('org-1')
        await updateOrganizationBranding({ ...data, logos: { ...data.logos, main: '/attempted-custom.svg' }, colors: { primary: '#123456', secondary: '#abcdef' } })
        expect(mocks.update.mock.calls[0][0]).toMatchObject({ main_logo_url: null, main_logo_light_url: null,
            isotipo_url: null, portal_primary_color: null, portal_secondary_color: null })
    })

    it('saves genuine premium logo and color changes', async () => {
        org.branding_tier_id = 'custom'
        const data = await getEffectiveBranding('org-1')
        await updateOrganizationBranding({ ...data, logos: { ...data.logos, main: '/own-company.svg' }, colors: { primary: '#123456', secondary: '#abcdef' } })
        expect(mocks.update.mock.calls[0][0]).toMatchObject({ main_logo_url: '/own-company.svg', portal_primary_color: '#123456' })
    })

    it('rejects writes when the organization cannot be verified', async () => {
        org = null
        const data = await getEffectiveBranding(null)
        await expect(updateOrganizationBranding(data as BrandingConfig)).rejects.toThrow('No se pudo verificar')
        expect(mocks.adminFrom).not.toHaveBeenCalled()
    })
})
