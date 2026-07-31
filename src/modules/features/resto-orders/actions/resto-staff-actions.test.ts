import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    from: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
    }
}))

function createQueryChain(result: { data?: any; error?: any; count?: number | null }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.upsert = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.neq = vi.fn(() => chain)
    chain.is = vi.fn(() => chain)
    chain.in = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.single = vi.fn(async () => result)
    chain.maybeSingle = vi.fn(async () => result)
    chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    return chain
}

function useTableQueues(queues: Record<string, any[]>) {
    const tableQueues = Object.fromEntries(
        Object.entries(queues).map(([table, tableQueue]) => [table, [...tableQueue]])
    )

    mocks.from.mockImplementation((table: string) => {
        const queue = tableQueues[table]
        if (!queue?.length) {
            throw new Error(`Unexpected table call: ${table}`)
        }
        return queue.shift()
    })
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.from.mockReset()
})

describe('Resto Staff Operational Flows', () => {
    const ORG_ID = 'org-resto-123'
    const STAFF_ID = 'staff-waiter-001'

    describe('Collaborator Creation (createStaffMember)', () => {
        it('creates a staff member with explicit PIN code and random UUID access token', async () => {
            const existingStaffQuery = createQueryChain({ data: [], error: null })
            const insertQuery = createQueryChain({
                data: {
                    id: STAFF_ID,
                    organization_id: ORG_ID,
                    first_name: 'Carlos',
                    last_name: 'Gomez',
                    role: 'waiter',
                    pin_code: '4321',
                    is_active: true,
                    access_token: 'mock-uuid-token-123',
                },
                error: null,
            })

            useTableQueues({
                organization_staff: [existingStaffQuery, insertQuery],
            })

            const { createStaffMember } = await import('./resto-staff-actions')
            const result = await createStaffMember(ORG_ID, {
                firstName: 'Carlos',
                lastName: 'Gomez',
                role: 'waiter',
                pinCode: '4321',
            })

            expect(result.success).toBe(true)
            expect(result.staff?.first_name).toBe('Carlos')
            expect(result.staff?.pin_code).toBe('4321')
            expect(insertQuery.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization_id: ORG_ID,
                    first_name: 'Carlos',
                    last_name: 'Gomez',
                    role: 'waiter',
                    pin_code: '4321',
                    is_active: true,
                })
            )
        })

        it('auto-generates a unique 4-digit PIN code when no PIN is specified', async () => {
            const existingStaffQuery = createQueryChain({
                data: [{ id: 'other-1', pin_code: '1234' }],
                error: null,
            })
            const insertQuery = createQueryChain({
                data: {
                    id: STAFF_ID,
                    organization_id: ORG_ID,
                    first_name: 'Ana',
                    role: 'waiter',
                    pin_code: '5678',
                    is_active: true,
                },
                error: null,
            })

            useTableQueues({
                organization_staff: [existingStaffQuery, insertQuery],
            })

            const { createStaffMember } = await import('./resto-staff-actions')
            const result = await createStaffMember(ORG_ID, {
                firstName: 'Ana',
                role: 'waiter',
            })

            expect(result.success).toBe(true)
            expect(insertQuery.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization_id: ORG_ID,
                    first_name: 'Ana',
                    pin_code: expect.stringMatching(/^\d{4}$/),
                })
            )
        })

        it('rejects collaborator creation if the requested PIN is already in use by another active staff member', async () => {
            const existingStaffQuery = createQueryChain({
                data: [{ id: 'staff-existing', pin_code: '9999' }],
                error: null,
            })

            useTableQueues({
                organization_staff: [existingStaffQuery],
            })

            const { createStaffMember } = await import('./resto-staff-actions')
            const result = await createStaffMember(ORG_ID, {
                firstName: 'Juan',
                role: 'waiter',
                pinCode: '9999',
            })

            expect(result.success).toBe(false)
            expect(result.error).toContain('El PIN 9999 ya está en uso')
        })
    })

    describe('PIN Authentication (switchStaffByPin)', () => {
        it('authenticates active staff member with matching PIN code and returns access token', async () => {
            const staffLookupQuery = createQueryChain({
                data: {
                    id: STAFF_ID,
                    organization_id: ORG_ID,
                    first_name: 'Carlos',
                    pin_code: '4321',
                    is_active: true,
                    access_token: 'token-carlos-abc',
                },
                error: null,
            })

            useTableQueues({
                organization_staff: [staffLookupQuery],
            })

            const { switchStaffByPin } = await import('./resto-staff-actions')
            const result = await switchStaffByPin(ORG_ID, '4321')

            expect(result.success).toBe(true)
            expect(result.staff?.id).toBe(STAFF_ID)
            expect(result.token).toBe('token-carlos-abc')
            expect(staffLookupQuery.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
            expect(staffLookupQuery.eq).toHaveBeenCalledWith('pin_code', '4321')
            expect(staffLookupQuery.is).toHaveBeenCalledWith('is_active', true)
        })

        it('rejects PIN authentication if PIN is wrong or staff member is not found', async () => {
            const staffLookupQuery = createQueryChain({
                data: null,
                error: null,
            })

            useTableQueues({
                organization_staff: [staffLookupQuery],
            })

            const { switchStaffByPin } = await import('./resto-staff-actions')
            const result = await switchStaffByPin(ORG_ID, '0000')

            expect(result.success).toBe(false)
            expect(result.error).toBe('PIN incorrecto o usuario no encontrado')
        })
    })

    describe('Active/Blocked Status Checks (toggleStaffActiveStatus)', () => {
        it('toggles staff active status to blocked (false) and prevents PIN authentication', async () => {
            const updateStatusQuery = createQueryChain({ data: null, error: null })
            const pinAuthQuery = createQueryChain({ data: null, error: null }) // Inactive staff returns null

            useTableQueues({
                organization_staff: [updateStatusQuery, pinAuthQuery],
            })

            const { toggleStaffActiveStatus, switchStaffByPin } = await import('./resto-staff-actions')
            
            // Toggle active status from true to false
            const toggleResult = await toggleStaffActiveStatus(ORG_ID, STAFF_ID, true)
            expect(toggleResult.success).toBe(true)
            expect(updateStatusQuery.update).toHaveBeenCalledWith({ is_active: false })
            expect(updateStatusQuery.eq).toHaveBeenCalledWith('id', STAFF_ID)
            expect(updateStatusQuery.eq).toHaveBeenCalledWith('organization_id', ORG_ID)

            // Verify authentication fails for blocked staff
            const authResult = await switchStaffByPin(ORG_ID, '4321')
            expect(authResult.success).toBe(false)
            expect(authResult.error).toBe('PIN incorrecto o usuario no encontrado')
        })
    })

    describe('Zone Assignment Toggles (toggleStaffZoneAssignment)', () => {
        it('assigns zone to staff as primary and updates active table sessions in that zone', async () => {
            const checkExistingAssignments = createQueryChain({ data: [], error: null })
            const upsertAssignment = createQueryChain({ data: null, error: null })
            const zoneTablesQuery = createQueryChain({ data: [{ id: 'table-101' }, { id: 'table-102' }], error: null })
            const updateSessionsQuery = createQueryChain({ data: null, error: null })

            useTableQueues({
                resto_staff_zone_assignments: [checkExistingAssignments, upsertAssignment],
                resto_tables: [zoneTablesQuery],
                resto_table_sessions: [updateSessionsQuery],
            })

            const { toggleStaffZoneAssignment } = await import('./resto-staff-actions')
            const result = await toggleStaffZoneAssignment(ORG_ID, STAFF_ID, 'zone-terrazas', false)

            expect(result.success).toBe(true)
            expect(upsertAssignment.upsert).toHaveBeenCalledWith(
                {
                    organization_id: ORG_ID,
                    staff_id: STAFF_ID,
                    zone_id: 'zone-terrazas',
                    is_primary: true,
                },
                { onConflict: 'staff_id,zone_id' }
            )
            expect(updateSessionsQuery.update).toHaveBeenCalledWith({ waiter_id: STAFF_ID })
            expect(updateSessionsQuery.in).toHaveBeenCalledWith('table_id', ['table-101', 'table-102'])
        })

        it('removes zone assignment when currentlyAssigned is true', async () => {
            const deleteAssignment = createQueryChain({ data: null, error: null })

            useTableQueues({
                resto_staff_zone_assignments: [deleteAssignment],
            })

            const { toggleStaffZoneAssignment } = await import('./resto-staff-actions')
            const result = await toggleStaffZoneAssignment(ORG_ID, STAFF_ID, 'zone-terrazas', true)

            expect(result.success).toBe(true)
            expect(deleteAssignment.delete).toHaveBeenCalled()
            expect(deleteAssignment.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
            expect(deleteAssignment.eq).toHaveBeenCalledWith('staff_id', STAFF_ID)
            expect(deleteAssignment.eq).toHaveBeenCalledWith('zone_id', 'zone-terrazas')
        })
    })

    describe('QR Token Regeneration (regenerateStaffToken)', () => {
        it('regenerates a new access token for the staff member', async () => {
            const updateTokenQuery = createQueryChain({ data: null, error: null })

            useTableQueues({
                organization_staff: [updateTokenQuery],
            })

            const { regenerateStaffToken } = await import('./resto-staff-actions')
            const result = await regenerateStaffToken(ORG_ID, STAFF_ID)

            expect(result.success).toBe(true)
            expect(result.newToken).toBeDefined()
            expect(typeof result.newToken).toBe('string')
            expect(updateTokenQuery.update).toHaveBeenCalledWith({
                access_token: result.newToken,
            })
            expect(updateTokenQuery.eq).toHaveBeenCalledWith('id', STAFF_ID)
            expect(updateTokenQuery.eq).toHaveBeenCalledWith('organization_id', ORG_ID)
        })
    })
})
