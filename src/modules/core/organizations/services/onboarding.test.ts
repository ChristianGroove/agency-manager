/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(), from: vi.fn(), rpc: vi.fn(), generateLink: vi.fn(), listUsers: vi.fn(), adminUpdate: vi.fn(), getUserById: vi.fn(),
    updateUser: vi.fn(), refreshSession: vi.fn(), switchOrganization: vi.fn(), validateInvite: vi.fn(),
    superAdmin: vi.fn(), currentOrg: vi.fn(), userOrganizations: vi.fn(), sendEmail: vi.fn()
}))
vi.mock('@/modules/core/database/supabase-server', () => ({ createClient: mocks.createClient }))
vi.mock('@/modules/core/database/supabase-admin', () => ({ supabaseAdmin: {
    from: mocks.from, rpc: mocks.rpc, auth: { admin: { generateLink: mocks.generateLink, listUsers: mocks.listUsers, updateUserById: mocks.adminUpdate, getUserById: mocks.getUserById } }
} }))
vi.mock('../actions/crud', () => ({ getCurrentOrganizationId: mocks.currentOrg, getUserOrganizations: mocks.userOrganizations, getCurrentOrgDetails: vi.fn() }))
vi.mock('../actions/context', () => ({ switchOrganization: mocks.switchOrganization }))
vi.mock('@/modules/core/iam/services/platform-roles', () => ({ isSuperAdmin: mocks.superAdmin }))
vi.mock('@/modules/core/iam/actions/invitation-actions', () => ({ validateInviteCode: mocks.validateInvite }))
vi.mock('@/modules/core/iam/services/role-service', () => ({ seedDefaultRoles: vi.fn() }))
vi.mock('@/modules/features/crm/services/process-engine/init', () => ({ initializeOrganizationCRM: vi.fn() }))
vi.mock('@/modules/features/notifications/email.service', () => ({ EmailService: {
    getSenderIdentity: vi.fn(async () => ({ branding: {}, style: {} })), send: mocks.sendEmail
} }))
vi.mock('@/modules/infrastructure/notifications/services/email-templates', () => ({
    getAuthInviteEmailHtml: vi.fn((_name, link) => link), getAuthConfirmationEmailHtml: vi.fn(link => link)
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { completeOrganizationOnboarding, createOrganization, getOnboardingContext } from '../actions/provisioning'
import { signup, updatePassword } from '@/modules/core/auth/actions'

let user: any
let memberships: any[]
let queryError: any
let calls: { table: string; operation: string; payload: any }[]
const organization = (type = 'client') => ({ id: 'existing-org', name: 'Empresa existente', slug: 'empresa', status: 'active',
    active_app_id: 'saas-space', organization_type: type, active_app: { name: 'SaaS Space' } })
const membership = (org = organization()) => ({ organization_id: org.id, role: 'owner', status: 'active', permissions: {}, organization: org })

beforeEach(() => {
    vi.resetAllMocks()
    user = { id: 'owner', email: 'owner@example.com', user_metadata: { onboarding_completed: false, invited_by_code: 'INV-VALID' }, app_metadata: {} }
    memberships = []
    calls = []
    queryError = null
    mocks.superAdmin.mockResolvedValue(false)
    mocks.currentOrg.mockResolvedValue(null)
    mocks.userOrganizations.mockResolvedValue([])
    mocks.validateInvite.mockResolvedValue({ isValid: true, invitation: { id: 'inv', code: 'INV-VALID', target_organization_type: 'client' } })
    mocks.switchOrganization.mockResolvedValue(undefined)
    mocks.rpc.mockImplementation(async (name, args) => {
        if (name === 'provision_tenant_atomic') {
            const payload = { ...args.p_input, owner_id: args.p_owner_id }
            calls.push({ table: 'organizations', operation: 'insert', payload })
            if (args.p_invite_code) memberships.push(membership({ ...organization(), id: 'new-org' }))
            return { data: { organization: { id: 'new-org', ...payload } }, error: null }
        }
        if (name === 'claim_tenant_activation') return { data: { claimed: true, claim_id: 'claim' }, error: null }
        return { data: null, error: null }
    })
    mocks.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
    mocks.getUserById.mockResolvedValue({ data: { user: { id: 'invited-owner', email: 'owner@example.com', invited_at: '2026-01-01',
        user_metadata: { full_name: 'María' }, app_metadata: {} } }, error: null })
    mocks.updateUser.mockImplementation(async ({ data }) => { Object.assign(user.user_metadata, data); return { error: null } })
    mocks.refreshSession.mockResolvedValue({ error: null })
    mocks.adminUpdate.mockResolvedValue({ error: null })
    mocks.sendEmail.mockResolvedValue({ success: true })
    mocks.generateLink.mockResolvedValue({ error: null, data: { user: { id: 'invited-owner', user_metadata: { full_name: 'María' }, app_metadata: {} },
        properties: { action_link: 'https://auth.test/verify?token_hash=test-token', verification_type: 'invite' } } })
    mocks.from.mockImplementation(table => {
        let operation = 'select'
        let payload: any
        let single = false
        const builder: any = {}
        for (const method of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'or', 'order', 'limit', 'single', 'maybeSingle']) {
            builder[method] = vi.fn((value: any) => {
                if (method === 'single' || method === 'maybeSingle') single = true
                if (['insert', 'update', 'upsert', 'delete'].includes(method)) { operation = method; payload = value }
                return builder
            })
        }
        builder.then = (resolve: any) => {
            calls.push({ table, operation, payload })
            if (table === 'organization_members' && operation === 'insert' && payload.role === 'owner') {
                memberships.push(membership({ ...organization(payload.organization_type), id: 'new-org' }))
            }
            let data: any = null
            if (table === 'organization_members' && operation === 'select') data = single ? memberships[0] : memberships
            if (table === 'organizations') data = operation === 'insert' ? { id: 'new-org', ...payload } : { id: 'new-org', name: 'Empresa', status: 'active', owner_id: 'invited-owner', organization_type: 'platform' }
            if (table === 'saas_products') data = { id: 'product' }
            if (table === 'saas_apps') data = { category: 'agency', slug: 'saas-space' }
            return Promise.resolve({ data, error: table === 'organization_members' && operation === 'select' ? queryError : null }).then(resolve)
        }
        return builder
    })
    mocks.createClient.mockResolvedValue({ auth: {
        getUser: vi.fn(async () => ({ data: { user }, error: null })), updateUser: mocks.updateUser, refreshSession: mocks.refreshSession
    }, from: mocks.from })
})

const inserts = () => calls.filter(call => call.table === 'organizations' && call.operation === 'insert')

describe('tenant activation and autonomous onboarding', () => {
    it.each(['client', 'reseller'])('activates a precreated %s without recreating or changing its app', async type => {
        memberships = [membership(organization(type))]
        user.user_metadata.invited_org_id = 'existing-org'
        const context = await getOnboardingContext()
        expect(context.success && context.data.organization?.name).toBe('Empresa existente')
        const result = await completeOrganizationOnboarding({ name: 'ignored', app_id: 'ignored' })
        expect(result.success).toBe(true)
        expect(inserts()).toHaveLength(0)
        expect(mocks.switchOrganization).toHaveBeenCalledWith('existing-org')
        expect(mocks.updateUser).toHaveBeenCalledWith({ data: { onboarding_completed: true } })
        expect(mocks.refreshSession).toHaveBeenCalled()
        expect(mocks.rpc).not.toHaveBeenCalledWith('provision_tenant_atomic', expect.anything())
    })

    it('requires and confirms a password for a new directly invited owner', async () => {
        memberships = [membership()]
        user.app_metadata.password_setup_required = true
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        expect((await completeOrganizationOnboarding({ password: '123456', confirmPassword: 'different' })).success).toBe(false)
        expect(mocks.updateUser).not.toHaveBeenCalled()
        const result = await completeOrganizationOnboarding({ password: 'secure-test-password', confirmPassword: 'secure-test-password', fullName: 'María' })
        expect(result.success).toBe(true)
        expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'secure-test-password', data: { password_configured: true } })
        expect(mocks.adminUpdate).toHaveBeenCalledWith('owner', { app_metadata: { password_setup_required: false } })
        expect(inserts()).toHaveLength(0)
    })

    it.each(['client', 'reseller'])('creates an invited %s with server-validated type and real ownership', async type => {
        mocks.validateInvite.mockResolvedValue({ isValid: true, invitation: { code: 'INV-VALID', target_organization_type: type,
            reseller_org_id: type === 'client' ? 'reseller-parent' : null } })
        const result = await completeOrganizationOnboarding({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space' })
        expect(result.success).toBe(true)
        expect(inserts()[0].payload.organization_type).toBe(type)
        if (type === 'client') expect(inserts()[0].payload.parent_organization_id).toBe('reseller-parent')
        expect(mocks.rpc).toHaveBeenCalledWith('provision_tenant_atomic', expect.objectContaining({ p_owner_id: 'owner', p_invite_code: 'INV-VALID' }))
        expect(mocks.refreshSession).toHaveBeenCalled()
    })

    it('reuses the tenant after session refresh fails, without a second creation', async () => {
        mocks.refreshSession.mockResolvedValueOnce({ error: new Error('expired session') })
        expect((await completeOrganizationOnboarding({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space' })).success).toBe(false)
        expect((await completeOrganizationOnboarding({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space' })).success).toBe(true)
        expect(inserts()).toHaveLength(1)
        expect(mocks.rpc.mock.calls.filter(([name]) => name === 'provision_tenant_atomic')).toHaveLength(1)
    })

    it('rejects blocked membership, suspended organizations and lookup failures', async () => {
        memberships = [{ ...membership(), status: 'blocked' }]
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        memberships = [membership({ ...organization(), status: 'suspended' })]
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        memberships = []
        queryError = { message: 'database unavailable' }
        expect((await completeOrganizationOnboarding({ name: 'X', slug: 'x', app_id: 'saas-space' })).success).toBe(false)
        expect(inserts()).toHaveLength(0)
    })

    it('cannot choose an unrelated or blocked tenant from profile metadata', async () => {
        memberships = [membership()]
        user.user_metadata.invited_org_id = 'some-other-tenant'
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        expect(mocks.switchOrganization).not.toHaveBeenCalled()
    })

    it.each(['archived-org', 'deleted-org', 'deleted-member'])('does not recreate an unavailable activation target: %s', async state => {
        user.user_metadata.invited_org_id = 'existing-org'
        const row: any = membership()
        if (state === 'archived-org') row.organization.status = 'archived'
        if (state === 'deleted-org') row.organization.deleted_at = '2026-10-13'
        if (state === 'deleted-member') row.deleted_at = '2026-10-13'
        memberships = [row]
        expect((await completeOrganizationOnboarding({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space' })).success).toBe(false)
        expect(inserts()).toHaveLength(0)
        expect(mocks.switchOrganization).not.toHaveBeenCalled()
    })

    it('rejects expired invitations and invitations for another email', async () => {
        mocks.validateInvite.mockResolvedValueOnce({ isValid: false, error: 'Expired' })
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        mocks.validateInvite.mockResolvedValueOnce({ isValid: true, invitation: { code: 'INV', recipient_email: 'other@example.com' } })
        expect((await completeOrganizationOnboarding({})).success).toBe(false)
        expect(inserts()).toHaveLength(0)
    })

    it('does not treat a support proxy as the invited tenant owner', async () => {
        memberships = [{ ...membership(), permissions: { is_support_proxy: true } }]
        const result = await getOnboardingContext()
        expect(result.success && result.data.organization).toBeNull()
    })

    it('preserves existing invited accounts when no password setup is pending', async () => {
        memberships = [membership()]
        user.invited_at = '2026-01-01'
        user.app_metadata.password_setup_required = false
        const result = await getOnboardingContext()
        expect(result.success && result.data.requiresPassword).toBe(false)
    })
})

describe('direct provisioning', () => {
    beforeEach(() => { mocks.superAdmin.mockResolvedValue(true); mocks.currentOrg.mockResolvedValue('platform') })

    it('sends activation to the existing tenant and preserves the owner profile', async () => {
        const result = await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', organization_type: 'reseller', admin_email: ' OWNER@example.com ' })
        expect(result.success).toBe(true)
        expect(mocks.adminUpdate).toHaveBeenCalledWith('invited-owner', expect.objectContaining({
            user_metadata: { full_name: 'María', invited_org_id: 'new-org', onboarding_completed: true },
            app_metadata: { invited_org_id: 'new-org', password_setup_required: true }
        }))
        expect(mocks.sendEmail.mock.calls[0][0].html).toContain('next=%2Fonboarding')
        expect(mocks.switchOrganization).not.toHaveBeenCalled()
    })

    it('rejects invalid email before inserting a tenant', async () => {
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'invalid' })).success).toBe(false)
        expect(inserts()).toHaveLength(0)
    })

    it('rejects direct provisioning by a regular tenant member', async () => {
        mocks.superAdmin.mockResolvedValue(false)
        mocks.userOrganizations.mockResolvedValue([membership()])
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space' })).success).toBe(false)
        expect(inserts()).toHaveLength(0)
    })

    it('forces direct client provisioning into the current authorized reseller network', async () => {
        mocks.superAdmin.mockResolvedValue(false)
        mocks.currentOrg.mockResolvedValue('reseller-org')
        memberships = [membership({ ...organization('reseller'), id: 'reseller-org' })]
        mocks.userOrganizations.mockResolvedValue(memberships)
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', organization_type: 'client',
            parent_organization_id: 'other-network', acquired_by_reseller_id: 'other-network', admin_email: 'owner@example.com' })).success).toBe(true)
        expect(inserts()[0].payload).toMatchObject({ parent_organization_id: 'reseller-org', acquired_by_reseller_id: 'reseller-org' })
    })

    it('finds existing owners beyond the first page and keeps their password and profile', async () => {
        mocks.generateLink.mockResolvedValue({ data: null, error: { status: 422, message: 'already been registered' } })
        mocks.listUsers.mockResolvedValueOnce({ error: null, data: { users: Array.from({ length: 1000 }, (_, index) => ({ id: `other-${index}`, email: `other-${index}@example.com` })) } })
        mocks.listUsers.mockResolvedValueOnce({ error: null, data: { users: [{ id: 'existing-owner', email: 'owner@example.com', email_confirmed_at: '2026-01-01',
            user_metadata: { full_name: 'María', password_configured: true }, app_metadata: { provider: 'email' } }] } })
        mocks.getUserById.mockResolvedValue({ error: null, data: { user: { id: 'existing-owner', email: 'owner@example.com', email_confirmed_at: '2026-01-01', user_metadata: { full_name: 'María', password_configured: true }, app_metadata: { provider: 'email' } } } })
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'owner@example.com' })).success).toBe(true)
        expect(mocks.listUsers).toHaveBeenCalledWith({ page: 2, perPage: 1000 })
        expect(mocks.adminUpdate).toHaveBeenCalledWith('existing-owner', expect.objectContaining({
            user_metadata: expect.objectContaining({ full_name: 'María', password_configured: true, onboarding_completed: true }),
            app_metadata: { provider: 'email', invited_org_id: 'new-org', password_setup_required: false }
        }))
    })

    it('returns transactional errors without sending activation or making manual tenant writes', async () => {
        mocks.rpc.mockResolvedValue({ data: { success: false }, error: null })
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'owner@example.com' })).success).toBe(false)
        expect(calls.some(call => call.table === 'organizations' && ['insert','update','delete'].includes(call.operation))).toBe(false)
        expect(mocks.sendEmail).not.toHaveBeenCalled()
    })

    it('records delivery failure while keeping the created tenant available for activation retry', async () => {
        mocks.sendEmail.mockResolvedValue({ success: false })
        const result = await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'owner@example.com' })
        expect(result.success).toBe(true)
        expect(result.data?.id).toBe('new-org')
        expect(result.data?.invitation_sent).toBe(false)
        expect(mocks.rpc).toHaveBeenCalledWith('finish_tenant_activation', expect.objectContaining({ p_error: expect.any(String) }))
    })

    it('does not create a tenant when the owner account cannot be resolved', async () => {
        mocks.listUsers.mockResolvedValue({ data: null, error: new Error('Auth unavailable') })
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'owner@example.com' })).success).toBe(false)
        expect(mocks.rpc).not.toHaveBeenCalled()
    })

    it('does not send again on a retry whose activation is already recorded as sent', async () => {
        mocks.rpc.mockImplementation(async (name, args) => name === 'provision_tenant_atomic'
            ? { data: { organization: { id: 'new-org', ...args.p_input } }, error: null }
            : { data: { already_sent: true }, error: null })
        expect((await createOrganization({ name: 'Empresa', slug: 'empresa', app_id: 'saas-space', admin_email: 'owner@example.com' })).data?.invitation_sent).toBe(true)
        expect(mocks.sendEmail).not.toHaveBeenCalled()
        expect(mocks.adminUpdate).not.toHaveBeenCalled()
    })
})

describe('password recovery', () => {
    it('validates session and password on the server', async () => {
        const form = new FormData()
        form.set('password', '123')
        expect((await updatePassword(form)).success).toBe(false)
        user = null
        form.set('password', 'secure-test-password')
        expect((await updatePassword(form)).success).toBe(false)
        expect(mocks.updateUser).not.toHaveBeenCalled()
    })

    it('lets password setup resume if it was saved but the activation marker update failed', async () => {
        user.user_metadata.password_configured = true
        user.app_metadata.password_setup_required = true
        mocks.updateUser.mockResolvedValueOnce({ error: { code: 'same_password', message: 'same password' } })
        const form = new FormData()
        form.set('password', 'secure-test-password')
        expect((await updatePassword(form)).success).toBe(true)
        expect(mocks.adminUpdate).toHaveBeenCalled()
    })
})

describe('invitation registration', () => {
    it('stores the signup invitation outside editable user metadata and records the signup password', async () => {
        const form = new FormData()
        form.set('email', 'owner@example.com')
        form.set('fullName', 'María')
        form.set('password', 'secure-test-password')
        form.set('inviteCode', 'INV-VALID')
        expect((await signup(form)).success).toBe(true)
        expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({
            type: 'signup', options: expect.objectContaining({ data: expect.objectContaining({ password_configured: true }) })
        }))
        expect(mocks.adminUpdate).toHaveBeenCalledWith('invited-owner', { app_metadata: { onboarding_invite_code: 'INV-VALID' } })
    })
    it('rejects registration with a code bound to a different email', async () => {
        mocks.validateInvite.mockResolvedValue({ isValid: true, invitation: { code: 'INV', recipient_email: 'different@example.com' } })
        const form = new FormData()
        form.set('email', 'owner@example.com')
        form.set('inviteCode', 'INV')
        expect((await signup(form)).error).toContain('otro correo')
        expect(mocks.generateLink).not.toHaveBeenCalled()
    })
})
