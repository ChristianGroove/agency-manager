import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PET_SETTINGS } from './config'

const mocks = vi.hoisted(() => ({ requireSuperAdmin: vi.fn(), createClient: vi.fn(), adminFrom: vi.fn(), organizationId: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ requireSuperAdmin: mocks.requireSuperAdmin }))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.createClient }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: { from: mocks.adminFrom } }))
vi.mock('@/modules/core/organizations/organization-actions', () => ({ getCurrentOrganizationId: mocks.organizationId }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))

function query(data: unknown, error: unknown = null) {
    const result = { data, error }
    const builder = {
        select: vi.fn(), eq: vi.fn(), update: vi.fn(), order: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
    }
    builder.select.mockReturnValue(builder)
    builder.eq.mockReturnValue(builder)
    builder.update.mockReturnValue(builder)
    builder.order.mockReturnValue(builder)
    return builder
}

beforeEach(() => { vi.clearAllMocks(); mocks.requireSuperAdmin.mockResolvedValue(undefined) })

describe('pet server authorization and persistence', () => {
    it('rejects non-super-admins before any privileged access', async () => {
        mocks.requireSuperAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
        const { savePetSettings } = await import('./config-actions')
        await expect(savePetSettings(DEFAULT_PET_SETTINGS)).rejects.toThrow('Unauthorized')
        expect(mocks.adminFrom).not.toHaveBeenCalled()
        expect(mocks.revalidate).not.toHaveBeenCalled()
    })
    it('protects the administration read as well as writes', async () => {
        mocks.requireSuperAdmin.mockRejectedValueOnce(new Error('Unauthorized'))
        const { getPetAdminSettings } = await import('./config-actions')
        await expect(getPetAdminSettings()).rejects.toThrow('Unauthorized')
        expect(mocks.adminFrom).not.toHaveBeenCalled()
    })
    it('does not persist an invalid configuration', async () => {
        const { savePetSettings } = await import('./config-actions')
        expect((await savePetSettings({ enabled: true, desktopSize: 9000 })).success).toBe(false)
        expect(mocks.adminFrom).not.toHaveBeenCalled()
    })
    it('rejects an organization ID which does not exist', async () => {
        mocks.adminFrom.mockReturnValue(query(null))
        const { savePetSettings } = await import('./config-actions')
        const result = await savePetSettings({ ...DEFAULT_PET_SETTINGS, enabled: true, pixyOrganizationId: '11111111-1111-4111-8111-111111111111' })
        expect(result.success).toBe(false)
        expect(mocks.adminFrom).toHaveBeenCalledTimes(1)
    })
    it('writes only pet settings and the update timestamp to the singleton', async () => {
        const write = query({ id: 1 })
        mocks.adminFrom.mockReturnValue(write)
        const { savePetSettings } = await import('./config-actions')
        expect(await savePetSettings(DEFAULT_PET_SETTINGS)).toEqual({ success: true })
        expect(mocks.adminFrom).toHaveBeenCalledWith('platform_settings')
        expect(Object.keys(write.update.mock.calls[0][0]).sort()).toEqual(['pet_config', 'updated_at'])
        expect(write.eq).toHaveBeenCalledWith('id', 1)
        expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout')
    })
    it('returns a recoverable error when persistence fails', async () => {
        mocks.adminFrom.mockReturnValue(query(null, { code: '42703' }))
        const { savePetSettings } = await import('./config-actions')
        expect((await savePetSettings(DEFAULT_PET_SETTINGS)).success).toBe(false)
        expect(mocks.revalidate).not.toHaveBeenCalled()
    })
    it('keeps dashboard help available before the migration is installed', async () => {
        const read = query(null, { code: '42703' })
        mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(read) })
        mocks.organizationId.mockResolvedValue('11111111-1111-4111-8111-111111111111')
        const { getDashboardPetConfig } = await import('./config-actions')
        expect((await getDashboardPetConfig()).enabled).toBe(false)
    })
})
