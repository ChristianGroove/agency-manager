import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
    requirePermission: vi.fn().mockResolvedValue(undefined),
    getCurrentOrganizationId: vi.fn().mockResolvedValue('org-attendance-123'),
    validateStorageLimit: vi.fn().mockResolvedValue({ allowed: true }),
    trackStorageUpload: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/modules/infrastructure/storage/storage-actions', () => ({
    validateStorageLimit: mocks.validateStorageLimit,
    trackStorageUpload: mocks.trackStorageUpload,
}))

function createQueryChain(result: { data?: any; error?: any } = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn(() => chain)
    chain.insert = vi.fn(() => chain)
    chain.update = vi.fn(() => chain)
    chain.delete = vi.fn(() => chain)
    chain.eq = vi.fn(() => chain)
    chain.order = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
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
    mocks.getCurrentOrganizationId.mockResolvedValue('org-attendance-123')
    mocks.validateStorageLimit.mockReset()
    mocks.validateStorageLimit.mockResolvedValue({ allowed: true })
})

describe('Attendance Server Actions IAM Enforcement', () => {
    const ORG_ID = 'org-attendance-123'

    describe('Attendance View Permissions (ATTENDANCE_VIEW)', () => {
        it('enforces ATTENDANCE_VIEW on getAttendanceLogs', async () => {
            const query = createQueryChain({ data: [], error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => query),
            })

            const { getAttendanceLogs } = await import('./actions')
            await getAttendanceLogs(ORG_ID)

            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.view', ORG_ID)
        })

        it('enforces ATTENDANCE_VIEW on getStaff', async () => {
            const query = createQueryChain({ data: [], error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => query),
            })

            const { getStaff } = await import('./actions')
            await getStaff()

            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.view', ORG_ID)
        })
    })

    describe('Attendance Manage Permissions (ATTENDANCE_MANAGE)', () => {
        it('enforces ATTENDANCE_MANAGE on createStaff, updateStaff, and deleteStaff', async () => {
            const insertQuery = createQueryChain({ data: { id: 'staff-1' }, error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => insertQuery),
            })

            const { createStaff, updateStaff, deleteStaff } = await import('./actions')

            await createStaff({ first_name: 'Juan', last_name: 'Perez' })
            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.manage', ORG_ID)

            mocks.requirePermission.mockClear()
            const updateQuery = createQueryChain({ data: { id: 'staff-1' }, error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => updateQuery),
            })
            await updateStaff('staff-1', { first_name: 'Juan Carlos' })
            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.manage', ORG_ID)

            mocks.requirePermission.mockClear()
            const deleteQuery = createQueryChain({ data: null, error: null })
            mocks.createClient.mockResolvedValue({
                from: vi.fn(() => deleteQuery),
            })
            await deleteStaff('staff-1')
            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.manage', ORG_ID)
        })

        it('enforces ATTENDANCE_MANAGE on uploadStaffPhoto instead of legacy requireOrgRole', async () => {
            const uploadFn = vi.fn().mockResolvedValue({ data: { path: 'path/to/file' }, error: null })
            mocks.createClient.mockResolvedValue({
                storage: {
                    from: vi.fn(() => ({
                        upload: uploadFn,
                    })),
                },
            })

            const formData = new FormData()
            const file = new File(['fake-content'], 'photo.png', { type: 'image/png' })
            formData.append('file', file)

            const { uploadStaffPhoto } = await import('./actions')
            await uploadStaffPhoto(formData)

            expect(mocks.requirePermission).toHaveBeenCalledWith('operations.attendance.manage', ORG_ID)
        })
    })
})
