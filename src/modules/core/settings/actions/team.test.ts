import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const supabaseAdmin = {
        auth: {
            admin: {
                generateLink: vi.fn(),
                createUser: vi.fn(),
                updateUserById: vi.fn(),
                listUsers: vi.fn(),
            },
        },
        from: vi.fn(),
    }

    return {
        createClient: vi.fn(),
        getCurrentOrganizationId: vi.fn(),
        requireOrgRole: vi.fn(),
        getAdminUrlAsync: vi.fn(),
        getSecureAuthLink: vi.fn(),
        getAuthRedirectBase: vi.fn(),
        emailSend: vi.fn(),
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
        headers: vi.fn(),
        supabaseAdmin,
    }
})

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: mocks.requireOrgRole,
}))

vi.mock('@/modules/infrastructure/utils/utils', () => ({
    getAdminUrlAsync: mocks.getAdminUrlAsync,
}))

vi.mock('@/modules/core/iam/services/auth-link-utils', () => ({
    getSecureAuthLink: mocks.getSecureAuthLink,
}))

vi.mock('@/modules/core/iam/services/auth-utils', () => ({
    getAuthRedirectBase: mocks.getAuthRedirectBase,
}))

vi.mock('@/modules/features/notifications/email.service', () => ({
    EmailService: {
        send: mocks.emailSend,
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
    revalidateTag: mocks.revalidateTag,
}))

vi.mock('next/headers', () => ({
    headers: mocks.headers,
}))

function queuedAdminClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function directUpsert(error: unknown = null) {
    return {
        upsert: vi.fn(async () => ({ error })),
    }
}

function directInsert(error: unknown = null) {
    return {
        insert: vi.fn(async () => ({ error })),
    }
}

function deleteMatch(error: unknown = null) {
    const query: any = {
        delete: vi.fn(() => query),
        match: vi.fn(async () => ({ error })),
    }

    return query
}

function updateMatch(error: unknown = null) {
    const query: any = {
        update: vi.fn(() => query),
        match: vi.fn(async () => ({ error })),
    }

    return query
}

function selectEqSingle(data: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({ data })),
        maybeSingle: vi.fn(async () => ({ data, error: null })),
    }

    return query
}

function selectMatchSingle(data: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        match: vi.fn(() => query),
        single: vi.fn(async () => ({ data })),
    }

    return query
}

function currentUser(userId = 'current-user') {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user: { id: userId } } })),
        },
    }
}

function secretError(message = 'team secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.requireOrgRole.mockReset()
    mocks.getAdminUrlAsync.mockReset()
    mocks.getSecureAuthLink.mockReset()
    mocks.getAuthRedirectBase.mockReset()
    mocks.emailSend.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.revalidateTag.mockReset()
    mocks.headers.mockReset()
    mocks.supabaseAdmin.auth.admin.generateLink.mockReset()
    mocks.supabaseAdmin.auth.admin.createUser.mockReset()
    mocks.supabaseAdmin.auth.admin.updateUserById.mockReset()
    mocks.supabaseAdmin.auth.admin.listUsers.mockReset()
    mocks.supabaseAdmin.from.mockReset()
})

async function importTeamActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.requireOrgRole.mockResolvedValue(undefined)
    mocks.getAdminUrlAsync.mockResolvedValue('https://app.test/auth/confirm')
    mocks.getSecureAuthLink.mockReturnValue('https://app.test/invite')
    mocks.getAuthRedirectBase.mockReturnValue('https://app.test')
    return import('./team')
}

describe('team settings actions', () => {
    it('does not expose invite link failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
            data: null,
            error: secretError('invite secret-value link failure'),
        })
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ hierarchy_level: 10 })],
        }).from)

        const { inviteMember } = await importTeamActions()
        const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

        expect(result).toEqual({ success: false, error: 'No se pudo enviar la invitacion' })
        expect(consoleError).toHaveBeenCalledWith('Invite Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('rejects invite roles outside the current organization before generating links', async () => {
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle(null)],
        }).from)

        const { inviteMember } = await importTeamActions()
        const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

        expect(result).toEqual({ success: false, error: 'Rol invalido' })
        expect(mocks.supabaseAdmin.auth.admin.generateLink).not.toHaveBeenCalled()
    })

    it('does not expose invite assignment failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
            data: {
                user: { id: 'user-invite' },
                properties: {
                    action_link: 'https://supabase.test/action',
                    verification_type: 'invite',
                },
            },
            error: null,
        })
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ hierarchy_level: 10 })],
            profiles: [directUpsert()],
            organization_members: [directUpsert(secretError('membership secret-value failure'))],
        }).from)

        const { inviteMember } = await importTeamActions()
        const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

        expect(result).toEqual({ success: false, error: 'Usuario creado pero no se pudo asignar al equipo' })
        expect(consoleError).toHaveBeenCalledWith('[inviteMember] Membership Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose remove member failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(currentUser())
        const remove = deleteMatch(secretError('remove secret-value failure'))
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_members: [remove],
        }).from)

        const { removeMember } = await importTeamActions()
        const result = await removeMember('target-user')

        expect(result).toEqual({ success: false, error: 'No se pudo eliminar el miembro' })
        expect(consoleError).toHaveBeenCalledWith('Remove Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('updates member roles without changing the success contract', async () => {
        const role = selectEqSingle({ hierarchy_level: 50 })
        const update = updateMatch()
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [role],
            organization_members: [update],
        }).from)

        const { updateMemberRole } = await importTeamActions()
        const result = await updateMemberRole('target-user', 'role-admin')

        expect(result).toEqual({ success: true })
        expect(role.eq).toHaveBeenCalledWith('id', 'role-admin')
        expect(role.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(update.update).toHaveBeenCalledWith({
            role_id: 'role-admin',
            role: 'admin',
        })
    })

    it('blocks owner role assignment unless the caller is an owner', async () => {
        const role = selectEqSingle({ hierarchy_level: 100 })
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [role],
        }).from)

        const { updateMemberRole } = await importTeamActions()
        mocks.requireOrgRole.mockImplementation(async (requiredRole: string) => {
            if (requiredRole === 'owner') throw new Error('owner only')
        })

        const result = await updateMemberRole('target-user', 'role-owner')

        expect(result).toEqual({ success: false, error: 'No tienes permisos para asignar este rol' })
        expect(mocks.requireOrgRole).toHaveBeenCalledWith('admin')
        expect(mocks.requireOrgRole).toHaveBeenCalledWith('owner')
    })

    it('does not expose permission update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const member = selectMatchSingle({
            role: 'member',
            permissions: { modules: {}, features: {} },
            role_data: { hierarchy_level: 1 },
        })
        const update = updateMatch(secretError('permissions secret-value failure'))
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_members: [member, update],
        }).from)

        const { updateMemberPermissions } = await importTeamActions()
        const result = await updateMemberPermissions('target-user', {
            modules: { crm: true },
        })

        expect(result).toEqual({ success: false, error: 'No se pudieron actualizar los permisos' })
        expect(consoleError).toHaveBeenCalledWith('Update Permissions Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose manual profile creation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseAdmin.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-user' } },
            error: null,
        })
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ hierarchy_level: 10 })],
            profiles: [directUpsert(secretError('profile secret-value failure'))],
        }).from)

        const { createUserManually } = await importTeamActions()
        const result = await createUserManually({
            email: 'new@example.com',
            password: 'super-secret-password',
            fullName: 'New User',
            role: 'role-member',
        })

        expect(result).toEqual({ success: false, error: 'No se pudo crear el perfil' })
        expect(consoleError).toHaveBeenCalledWith('[createUserManually] Error al sincronizar perfil:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose manual member linking failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.supabaseAdmin.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-user' } },
            error: null,
        })
        mocks.supabaseAdmin.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ hierarchy_level: 50 })],
            profiles: [directUpsert()],
            organization_members: [directInsert(secretError('link secret-value failure'))],
        }).from)

        const { createUserManually } = await importTeamActions()
        const result = await createUserManually({
            email: 'new@example.com',
            password: 'super-secret-password',
            fullName: 'New User',
            role: 'role-member',
        })

        expect(result).toEqual({ success: false, error: 'Usuario creado pero no se pudo vincular al equipo' })
        expect(consoleError).toHaveBeenCalledWith('[createUserManually] Error al vincular miembro:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
