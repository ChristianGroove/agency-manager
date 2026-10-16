import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
    requirePermission: vi.fn().mockResolvedValue(undefined),
    getCurrentOrganizationId: vi.fn().mockResolvedValue('org-resto-123'),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('@/modules/core/iam/services/role-service', () => ({
    requirePermission: mocks.requirePermission,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function createQueryChain(result: { data?: any; error?: any } = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.requirePermission.mockReset()
    mocks.requirePermission.mockResolvedValue(undefined)
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getCurrentOrganizationId.mockResolvedValue('org-resto-123')
})

describe('Resto Tables Server Actions IAM Enforcement', () => {
    const ORG_ID = 'org-resto-123'

    it('enforces RESTO_VIEW on getZonesAndTables', async () => {
        const query = createQueryChain({ data: [], error: null })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => query),
        })

        const { getZonesAndTables } = await import('./actions')
        await getZonesAndTables(ORG_ID)

        expect(mocks.requirePermission).toHaveBeenCalledWith('operations.resto.view', ORG_ID)
    })

    it('enforces RESTO_MANAGE on saveLayout', async () => {
        const query = createQueryChain({ data: { id: 'zone-1' }, error: null })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => query),
        })

        const { saveLayout } = await import('./actions')
        await saveLayout(ORG_ID, { id: 'temp_zone', name: 'Terraza' } as any, [])

        expect(mocks.requirePermission).toHaveBeenCalledWith('operations.resto.manage', ORG_ID)
    })

    it('enforces RESTO_MANAGE and tenant isolation on deleteZone', async () => {
        const query = createQueryChain({ data: null, error: null })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => query),
        })

        const { deleteZone } = await import('./actions')
        const result = await deleteZone('zone-1')

        expect(result.success).toBe(true)
        expect(mocks.requirePermission).toHaveBeenCalledWith('operations.resto.manage', ORG_ID)
        expect(query.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
    })

    it('enforces RESTO_MANAGE and tenant isolation on renameZone', async () => {
        const query = createQueryChain({ data: null, error: null })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => query),
        })

        const { renameZone } = await import('./actions')
        const result = await renameZone('zone-1', 'Comedor Principal')

        expect(result.success).toBe(true)
        expect(mocks.requirePermission).toHaveBeenCalledWith('operations.resto.manage', ORG_ID)
        expect(query.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
    })

    it('enforces RESTO_MANAGE and tenant isolation on updateTableStatus', async () => {
        const query = createQueryChain({ data: null, error: null })
        mocks.createClient.mockResolvedValue({
            from: vi.fn(() => query),
        })

        const { updateTableStatus } = await import('./actions')
        const result = await updateTableStatus('table-1', 'occupied')

        expect(result.success).toBe(true)
        expect(mocks.requirePermission).toHaveBeenCalledWith('operations.resto.manage', ORG_ID)
        expect(query.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
    })
})
