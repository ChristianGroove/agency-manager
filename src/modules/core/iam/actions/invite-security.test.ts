import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/core/database/supabase-admin', () => {
    return {
        supabaseAdmin: {
            from: vi.fn()
        }
    }
})

vi.mock('@/modules/core/database/supabase-server', () => {
    return {
        createClient: vi.fn().mockResolvedValue({
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin-user' } } })
            }
        })
    }
})

vi.mock('@/modules/core/organizations/actions/crud', () => {
    return {
        getCurrentOrganizationId: vi.fn().mockResolvedValue('reseller-org-uuid')
    }
})

describe('Exclusive Invite Security & Validation Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('rejects validation if invite code is missing or empty', async () => {
        const { validateInviteCode } = await import('./invitation-actions')

        const res1 = await validateInviteCode(null)
        expect(res1.isValid).toBe(false)
        expect(res1.error).toContain('requerido')

        const res2 = await validateInviteCode('')
        expect(res2.isValid).toBe(false)
        expect(res2.error).toContain('requerido')
    })

    it('rejects validation if invite code does not exist in database', async () => {
        const { supabaseAdmin } = await import('@/modules/core/database/supabase-admin')
        const { validateInviteCode } = await import('./invitation-actions')

        const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null })
        const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        ;(supabaseAdmin.from as any).mockReturnValue({ select: selectMock })

        const res = await validateInviteCode('INVALID-CODE')
        expect(res.isValid).toBe(false)
        expect(res.error).toContain('no encontrado')
    })

    it('rejects validation if invitation is exhausted (uses_count >= max_uses)', async () => {
        const { supabaseAdmin } = await import('@/modules/core/database/supabase-admin')
        const { validateInviteCode } = await import('./invitation-actions')

        const updateEqMock = vi.fn().mockResolvedValue({ error: null })
        const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock })

        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: {
                id: 'inv-1',
                code: 'EXHAUSTED-CODE',
                status: 'active',
                max_uses: 1,
                uses_count: 1,
                expires_at: null
            },
            error: null
        })
        const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

        ;(supabaseAdmin.from as any).mockImplementation((table: string) => {
            if (table === 'platform_access_invitations') {
                return { select: selectMock, update: updateMock }
            }
            return {}
        })

        const res = await validateInviteCode('EXHAUSTED-CODE')
        expect(res.isValid).toBe(false)
        expect(res.error).toContain('límite máximo')
    })

    it('accepts validation for active invite code and returns target invitation metadata', async () => {
        const { supabaseAdmin } = await import('@/modules/core/database/supabase-admin')
        const { validateInviteCode } = await import('./invitation-actions')

        const maybeSingleMock = vi.fn().mockResolvedValue({
            data: {
                id: 'inv-valid',
                code: 'VALID-RESTO-123',
                status: 'active',
                max_uses: 5,
                uses_count: 0,
                expires_at: null,
                target_app_id: 'resto-space-uuid',
                reseller_org_id: 'reseller-partner-uuid'
            },
            error: null
        })
        const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        ;(supabaseAdmin.from as any).mockReturnValue({ select: selectMock })

        const res = await validateInviteCode('VALID-RESTO-123')
        expect(res.isValid).toBe(true)
        expect(res.invitation?.code).toBe('VALID-RESTO-123')
        expect(res.invitation?.target_app_id).toBe('resto-space-uuid')
        expect(res.invitation?.reseller_org_id).toBe('reseller-partner-uuid')
    })
})
