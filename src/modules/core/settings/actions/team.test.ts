import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const dbClient = {
        auth: {
            admin: {
                generateLink: vi.fn(),
                createUser: vi.fn(),
                updateUserById: vi.fn(),
                listUsers: vi.fn(),
                getUserById: vi.fn(),
            },
            getUser: vi.fn(),
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
        hasPermission: vi.fn().mockResolvedValue(false),
        dbClient,
    }
})

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/iam/services/role-service', () => ({
    hasPermission: mocks.hasPermission,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.dbClient,
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
    }

    return query
}

function selectMatchSingle(data: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        match: vi.fn(() => query),
        single: vi.fn(async () => ({ data })),
        maybeSingle: vi.fn(async () => ({ data })),
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
    mocks.dbClient.auth.admin.generateLink.mockReset()
    mocks.dbClient.auth.admin.createUser.mockReset()
    mocks.dbClient.auth.admin.updateUserById.mockReset()
    mocks.dbClient.auth.admin.listUsers.mockReset()
    mocks.dbClient.auth.admin.getUserById.mockReset()
    mocks.dbClient.auth.getUser.mockReset()
    mocks.dbClient.from.mockReset()
    mocks.hasPermission.mockReset()
})

async function importTeamActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.requireOrgRole.mockResolvedValue(undefined)
    mocks.getAdminUrlAsync.mockResolvedValue('https://app.test/auth/confirm')
    mocks.getSecureAuthLink.mockReturnValue('https://app.test/invite')
    mocks.getAuthRedirectBase.mockReturnValue('https://app.test')
    return import('./team')
}

beforeEach(() => {
    mocks.createClient.mockResolvedValue(mocks.dbClient)
    mocks.hasPermission.mockResolvedValue(false)
})

describe('team settings actions', () => {
    it('does not expose invite link failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dbClient.auth.admin.generateLink.mockResolvedValue({
            data: null,
            error: secretError('invite secret-value link failure'),
        })

        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ name: 'Miembro', hierarchy_level: 10 })],
        }).from)

        const { inviteMember } = await importTeamActions()
        const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

        expect(result).toEqual({ success: false, error: 'No se pudo enviar la invitacion' })
        expect(consoleError).toHaveBeenCalledWith('Invite Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose invite assignment failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.dbClient.auth.admin.generateLink.mockResolvedValue({
            data: {
                user: { id: 'user-invite' },
                properties: {
                    action_link: 'https://supabase.test/action',
                    verification_type: 'invite',
                },
            },
            error: null,
        })
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_roles: [selectEqSingle({ name: 'Miembro', hierarchy_level: 10 })],
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
        mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
        const targetMember = selectMatchSingle({
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        const remove = deleteMatch(secretError('remove secret-value failure'))
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, remove],
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
        const targetMember = selectMatchSingle({
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        const update = updateMatch()
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_roles: [role],
            organization_members: [targetMember, update],
        }).from)

        const { updateMemberRole } = await importTeamActions()
        const result = await updateMemberRole('target-user', 'role-admin')

        expect(result).toEqual({ success: true })
        expect(update.update).toHaveBeenCalledWith({
            role_id: 'role-admin',
            role: 'admin',
        })
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
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
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
        mocks.dbClient.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-user' } },
            error: null,
        })
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
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
        mocks.dbClient.auth.admin.createUser.mockResolvedValue({
            data: { user: { id: 'new-user' } },
            error: null,
        })
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            profiles: [directUpsert()],
            organization_roles: [selectEqSingle({ name: 'Administrador' })],
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

    it('refuses to overwrite an existing auth user password in createUserManually', async () => {
        mocks.dbClient.auth.admin.createUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'User already registered' },
        })
        mocks.dbClient.auth.admin.listUsers.mockResolvedValue({
            data: {
                users: [{ id: 'existing-user-id', email: 'existing@example.com', last_sign_in_at: '2026-10-01T00:00:00Z' }],
            },
        })
        const profileQuery: any = {
            select: vi.fn(() => profileQuery),
            eq: vi.fn(() => profileQuery),
            maybeSingle: vi.fn(async () => ({ data: { platform_role: 'user' }, error: null })),
        }
        const memberQuery: any = {
            select: vi.fn(() => memberQuery),
            eq: vi.fn(async () => ({ data: [{ organization_id: 'other-org', status: 'active' }], error: null })),
        }
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            profiles: [profileQuery],
            organization_members: [memberQuery],
        }).from)

        const { createUserManually } = await importTeamActions()
        const result = await createUserManually({
            email: 'existing@example.com',
            password: 'attacker-password',
            fullName: 'Existing User',
            role: 'role-member',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('usuario activo en otra organización')
        expect(mocks.dbClient.auth.admin.updateUserById).not.toHaveBeenCalled()
    })

    it('cleans up agent channels, availability, and open conversations when removeMember succeeds', async () => {
        mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-owner' } }, error: null })
        const targetMember = selectMatchSingle({
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        const remove = deleteMatch(null)
        const channelCleanup = deleteMatch(null)
        const availabilityCleanup = deleteMatch(null)
        const convQuery: any = {
            update: vi.fn(() => convQuery),
            match: vi.fn(() => convQuery),
            in: vi.fn(() => convQuery),
            then: (resolve: any) => resolve({ error: null }),
        }
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, remove],
            agent_channels: [channelCleanup],
            agent_availability: [availabilityCleanup],
            conversations: [convQuery],
        }).from)

        const { removeMember } = await importTeamActions()
        const result = await removeMember('target-agent')

        expect(result).toEqual({ success: true })
        expect(channelCleanup.match).toHaveBeenCalledWith({ organization_id: 'org-current', agent_id: 'target-agent' })
        expect(availabilityCleanup.match).toHaveBeenCalledWith({ organization_id: 'org-current', agent_id: 'target-agent' })
        expect(convQuery.update).toHaveBeenCalledWith(expect.objectContaining({ assigned_to: null }))
    })

    it('forces agent offline when toggleMemberStatus blocks a member', async () => {
        const targetMember = selectMatchSingle({
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        const statusUpdate: any = {
            update: vi.fn(() => statusUpdate),
            eq: vi.fn(() => statusUpdate),
            then: (resolve: any) => resolve({ error: null }),
        }
        const availabilityUpdate: any = {
            update: vi.fn(() => availabilityUpdate),
            eq: vi.fn(() => availabilityUpdate),
            then: (resolve: any) => resolve({ error: null }),
        }
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, statusUpdate],
            agent_availability: [availabilityUpdate],
        }).from)

        const { toggleMemberStatus } = await importTeamActions()
        const result = await toggleMemberStatus('target-agent', 'active')

        expect(result).toEqual({ success: true, status: 'blocked' })
        expect(availabilityUpdate.update).toHaveBeenCalledWith(expect.objectContaining({
            status: 'offline',
            auto_assign_enabled: false,
        }))
    })

    it('rejects setMemberPasswordManually when target member belongs to another organization', async () => {
        const targetMember = selectMatchSingle({
            user_id: 'shared-user',
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        const profileQuery: any = {
            select: vi.fn(() => profileQuery),
            eq: vi.fn(() => profileQuery),
            maybeSingle: vi.fn(async () => ({ data: { platform_role: 'user' }, error: null })),
        }
        const membershipsQuery: any = {
            select: vi.fn(() => membershipsQuery),
            eq: vi.fn(async () => ({
                data: [{ organization_id: 'org-current' }, { organization_id: 'org-other' }],
                error: null,
            })),
        }
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, membershipsQuery],
            profiles: [profileQuery],
        }).from)

        const { setMemberPasswordManually } = await importTeamActions()
        const result = await setMemberPasswordManually('shared-user', 'new-secure-pass')

        expect(result.success).toBe(false)
        expect(result.error).toContain('más de una organización')
        expect(mocks.dbClient.auth.admin.updateUserById).not.toHaveBeenCalled()
    })

    it('validates minimum name length and synchronizes profile data in updateMemberProfile', async () => {
        const { updateMemberProfile } = await importTeamActions()

        const shortResult = await updateMemberProfile('target-user', { full_name: 'A' })
        expect(shortResult.success).toBe(false)
        expect(shortResult.error).toContain('al menos 2 caracteres')

        const targetMember = selectMatchSingle({
            role: 'member',
            permissions: { modules: { crm: true } },
            role_data: { hierarchy_level: 10 },
        })
        const memberUpdate = updateMatch(null)
        const profileUpdate: any = {
            update: vi.fn(() => profileUpdate),
            eq: vi.fn(async () => ({ error: null })),
        }
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, memberUpdate],
            profiles: [profileUpdate],
        }).from)

        const okResult = await updateMemberProfile('target-user', {
            full_name: '  Ana Gómez  ',
            job_title: '  Sales Lead ',
            phone: ' +57 300 000 0000 ',
        })

        expect(okResult).toEqual({ success: true })
        expect(memberUpdate.update).toHaveBeenCalledWith({
            full_name: 'Ana Gómez',
            permissions: {
                modules: { crm: true },
                job_title: 'Sales Lead',
                phone: '+57 300 000 0000',
            },
        })
    })

    it('clamps max_capacity between 1 and 500 in updateMemberAgentConfig', async () => {
        const upsertMock = vi.fn(async () => ({ error: null }))
        const targetMember = selectMatchSingle({
            role: 'member',
            role_data: { hierarchy_level: 10 },
        })
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember],
            agent_availability: [{ upsert: upsertMock }],
        }).from)

        const { updateMemberAgentConfig } = await importTeamActions()
        const result = await updateMemberAgentConfig('target-agent', {
            status: 'online',
            max_capacity: 9999,
            auto_assign_enabled: true,
        })

        expect(result).toEqual({ success: true })
        expect(upsertMock).toHaveBeenCalledWith(
            expect.objectContaining({
                organization_id: 'org-current',
                agent_id: 'target-agent',
                status: 'online',
                max_capacity: 500,
                auto_assign_enabled: true,
            }),
            { onConflict: 'organization_id,agent_id' }
        )
    })

    it('synchronizes agent_channels and applies boolean overrides in updateMemberPermissions', async () => {
        const targetMember = selectMatchSingle({
            role: 'member',
            permissions: {
                modules: { crm: true },
                'crm.leads.delete': false,
                'crm.leads.export': true,
            },
            role_data: { hierarchy_level: 10 },
        })
        const memberUpdate = updateMatch(null)
        const channelDelete = deleteMatch(null)
        const channelInsert = directInsert(null)

        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [targetMember, memberUpdate],
            agent_channels: [channelDelete, channelInsert],
        }).from)

        const { updateMemberPermissions } = await importTeamActions()
        const result = await updateMemberPermissions('target-agent', {
            inbox_access: ['conn-wa-1', 'conn-ig-2'],
            overrides: {
                'crm.leads.delete': null, // reset override to role default
                'inbox.conversations.assign': true, // add grant override
                all: true as any, // must be ignored/blocked
            },
        })

        expect(result).toEqual({
            success: true,
            permissions: {
                modules: { crm: true },
                features: {},
                inbox_access: ['conn-wa-1', 'conn-ig-2'],
                'crm.leads.export': true,
                'inbox.conversations.assign': true,
            },
        })
        expect(memberUpdate.update).toHaveBeenCalledWith({
            permissions: {
                modules: { crm: true },
                features: {},
                inbox_access: ['conn-wa-1', 'conn-ig-2'],
                'crm.leads.export': true,
                'inbox.conversations.assign': true,
            },
        })
        expect(channelDelete.match).toHaveBeenCalledWith({
            organization_id: 'org-current',
            agent_id: 'target-agent',
        })
        expect(channelInsert.insert).toHaveBeenCalledWith([
            {
                organization_id: 'org-current',
                agent_id: 'target-agent',
                channel_type: 'conn-wa-1',
                is_active: true,
            },
            {
                organization_id: 'org-current',
                agent_id: 'target-agent',
                channel_type: 'conn-ig-2',
                is_active: true,
            },
        ])
    })

    it('merges rolePermissions.modules and memberOverrides.modules without overwriting in getMemberPermissions', async () => {
        const memberRecord = selectMatchSingle({
            role: 'member',
            role_id: 'role-custom',
            permissions: {
                modules: { inbox: true },
                'crm.leads.delete': false,
            },
            role_data: {
                permissions: {
                    modules: { crm: true, billing: true },
                    'crm.leads.delete': true,
                },
            },
        })
        mocks.dbClient.from.mockImplementation(queuedAdminClient({
            organization_members: [memberRecord],
        }).from)

        const { getMemberPermissions } = await importTeamActions()
        const perms = await getMemberPermissions('target-agent')

        expect(perms?.permissions.modules).toEqual({
            crm: true,
            billing: true,
            inbox: true,
        })
        expect(perms?.permissions['crm.leads.delete']).toBe(false)
    })

    it('reports stale online agents without recent last_seen_at heartbeat as offline in getOrganizationMembers', async () => {
        const freshNow = new Date().toISOString()
        const staleMarch = '2026-03-24T12:00:00.000Z'
        const futureTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

        const membersQuery: any = {
            select: vi.fn(() => membersQuery),
            eq: vi.fn(async () => ({
                data: [
                    {
                        id: 'm-stale',
                        user_id: 'user-stale',
                        role: 'member',
                        role_id: 'r-member',
                        status: 'active',
                        full_name: 'Karen Caldas 10',
                        email: 'karen@example.com',
                        permissions: {},
                        organization_roles: {
                            id: 'r-member',
                            name: 'Member',
                            hierarchy_level: 1,
                            is_system_role: true,
                            permissions: {},
                        },
                    },
                    {
                        id: 'm-fresh',
                        user_id: 'user-fresh',
                        role: 'admin',
                        role_id: 'r-admin',
                        status: 'active',
                        full_name: 'Imeiri Pto 1',
                        email: 'imeiri@example.com',
                        permissions: {},
                        organization_roles: {
                            id: 'r-admin',
                            name: 'Admin',
                            hierarchy_level: 2,
                            is_system_role: true,
                            permissions: {},
                        },
                    },
                    {
                        id: 'm-future',
                        user_id: 'user-future',
                        role: 'member',
                        role_id: 'r-member',
                        status: 'active',
                        full_name: 'Future User',
                        email: 'future@example.com',
                        permissions: {},
                        organization_roles: {
                            id: 'r-member',
                            name: 'Member',
                            hierarchy_level: 1,
                            is_system_role: true,
                            permissions: {},
                        },
                    },
                ],
                error: null,
            })),
        }

        const channelsQuery: any = {
            select: vi.fn(() => channelsQuery),
            eq: vi.fn(() => channelsQuery),
            in: vi.fn(async () => ({ data: [], error: null })),
        }

        const availabilityQuery: any = {
            select: vi.fn(() => availabilityQuery),
            eq: vi.fn(() => availabilityQuery),
            in: vi.fn(async () => ({
                data: [
                    {
                        agent_id: 'user-stale',
                        status: 'online',
                        current_load: 18,
                        max_capacity: 100,
                        auto_assign_enabled: true,
                        last_seen_at: staleMarch,
                    },
                    {
                        agent_id: 'user-fresh',
                        status: 'online',
                        current_load: 4,
                        max_capacity: 100,
                        auto_assign_enabled: true,
                        last_seen_at: freshNow,
                    },
                    {
                        agent_id: 'user-future',
                        status: 'online',
                        current_load: 0,
                        max_capacity: 100,
                        auto_assign_enabled: true,
                        last_seen_at: futureTomorrow,
                    },
                ],
                error: null,
            })),
        }

        const profilesQuery: any = {
            select: vi.fn(() => profilesQuery),
            in: vi.fn(async () => ({ data: [], error: null })),
        }

        mocks.dbClient.auth.admin.listUsers.mockResolvedValue({
            data: {
                users: [
                    {
                        id: 'user-stale',
                        email: 'karen@example.com',
                        email_confirmed_at: '2026-03-01T00:00:00Z',
                        last_sign_in_at: staleMarch,
                    },
                    {
                        id: 'user-fresh',
                        email: 'imeiri@example.com',
                        email_confirmed_at: '2026-03-01T00:00:00Z',
                        last_sign_in_at: freshNow,
                    },
                    {
                        id: 'user-future',
                        email: 'future@example.com',
                        email_confirmed_at: '2026-03-01T00:00:00Z',
                        last_sign_in_at: freshNow,
                    },
                ],
            },
        })

        mocks.dbClient.from.mockImplementation(
            queuedAdminClient({
                organization_members: [membersQuery],
                agent_channels: [channelsQuery],
                agent_availability: [availabilityQuery],
                profiles: [profilesQuery],
            }).from
        )

        const { getOrganizationMembers } = await importTeamActions()
        const members = await getOrganizationMembers()

        const staleMember = members.find(m => m.user_id === 'user-stale')
        const freshMember = members.find(m => m.user_id === 'user-fresh')
        const futureMember = members.find(m => m.user_id === 'user-future')

        expect(staleMember?.agent_availability.status).toBe('offline')
        expect(staleMember?.agent_availability.is_online).toBe(false)
        expect(staleMember?.agent_availability.configured_status).toBe('online')

        expect(freshMember?.agent_availability.status).toBe('online')
        expect(freshMember?.agent_availability.is_online).toBe(true)

        expect(futureMember?.agent_availability.status).toBe('offline')
        expect(futureMember?.agent_availability.is_online).toBe(false)
    })

    describe('security & privilege escalation boundaries', () => {
        describe('self-modification prevention', () => {
            it('rejects self-modification in updateMemberPermissions', async () => {
                mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-self-id' } }, error: null })
                const { updateMemberPermissions } = await importTeamActions()
                const result = await updateMemberPermissions('actor-self-id', {
                    modules: { crm: true },
                })

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes modificar tus propios permisos o excepciones',
                })
                expect(mocks.dbClient.from).not.toHaveBeenCalled()
            })

            it('rejects self-modification in toggleMemberStatus', async () => {
                mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-self-id' } }, error: null })
                const { toggleMemberStatus } = await importTeamActions()
                const result = await toggleMemberStatus('actor-self-id', 'active')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes suspender o modificar el estado de tu propia cuenta',
                })
                expect(mocks.dbClient.from).not.toHaveBeenCalled()
            })

            it('rejects self-modification in setMemberPasswordManually', async () => {
                mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-self-id' } }, error: null })
                const { setMemberPasswordManually } = await importTeamActions()
                const result = await setMemberPasswordManually('actor-self-id', 'new-password-123')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes modificar tu propia contraseña desde este panel',
                })
                expect(mocks.dbClient.from).not.toHaveBeenCalled()
            })

            it('rejects self-modification in updateMemberRole', async () => {
                mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-self-id' } }, error: null })
                const { updateMemberRole } = await importTeamActions()
                const result = await updateMemberRole('actor-self-id', 'role-new')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes modificar tu propio rol',
                })
                expect(mocks.dbClient.from).not.toHaveBeenCalled()
            })

            it('rejects self-modification in removeMember', async () => {
                mocks.dbClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'actor-self-id' } }, error: null })
                const { removeMember } = await importTeamActions()
                const result = await removeMember('actor-self-id')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes removerte a ti mismo.',
                })
                expect(mocks.dbClient.from).not.toHaveBeenCalled()
            })
        })

        describe('hierarchy & role demotion protection', () => {
            it('prevents Administrator from modifying role of an Owner in updateMemberRole', async () => {
                const { updateMemberRole } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const newRole = selectEqSingle({ name: 'Member', hierarchy_level: 10 })
                const targetOwner = selectMatchSingle({
                    role: 'owner',
                    role_data: { hierarchy_level: 100 },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [newRole],
                    organization_members: [targetOwner],
                }).from)

                const result = await updateMemberRole('target-owner-id', 'role-member')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede modificar el rol de un Dueño',
                })
            })

            it('prevents Administrator from removing an Owner in removeMember', async () => {
                const { removeMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetOwner = selectMatchSingle({
                    role: 'owner',
                    role_data: { hierarchy_level: 100 },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetOwner],
                }).from)

                const result = await removeMember('target-owner-id')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede eliminar a otro Dueño',
                })
            })

            it('prevents Administrator from changing password of another Administrator', async () => {
                const { setMemberPasswordManually } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetAdmin = selectMatchSingle({
                    user_id: 'admin-actor-2',
                    role: 'admin',
                    role_data: { hierarchy_level: 50 },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await setMemberPasswordManually('admin-actor-2', 'new-pass-1234')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo puedes cambiar contraseñas de miembros con menor jerarquía a la tuya',
                })
                expect(mocks.dbClient.auth.admin.updateUserById).not.toHaveBeenCalled()
            })

            it('prevents Administrator from suspending an Owner in toggleMemberStatus', async () => {
                const { toggleMemberStatus } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetOwner = selectMatchSingle({
                    role: 'owner',
                    role_data: { hierarchy_level: 100 },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetOwner],
                }).from)

                const result = await toggleMemberStatus('target-owner-id', 'active')

                expect(result).toEqual({
                    success: false,
                    error: 'No se puede suspender al Dueño de la organización',
                })
            })
        })

        describe('unearned permission grant escalation protection', () => {
            it('blocks Administrator from granting permissions they do not possess in updateMemberPermissions', async () => {
                const { updateMemberPermissions } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetMember = selectMatchSingle({
                    role: 'member',
                    permissions: {},
                    role_data: { hierarchy_level: 10 },
                })

                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetMember],
                }).from)

                const result = await updateMemberPermissions('target-user', {
                    overrides: { 'billing.invoices.delete': true },
                })

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes conceder el permiso "billing.invoices.delete" porque no lo tienes habilitado',
                })
            })

            it('blocks Administrator from granting modules they do not possess in updateMemberPermissions', async () => {
                const { updateMemberPermissions } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetMember = selectMatchSingle({
                    role: 'member',
                    permissions: {},
                    role_data: { hierarchy_level: 10 },
                })

                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetMember],
                }).from)

                const result = await updateMemberPermissions('target-user', {
                    modules: { billing: true },
                })

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes habilitar el módulo "billing" porque no lo tienes habilitado',
                })
            })
        })

        describe('credential and link token containment (VULN-01)', () => {
            it('does not return recoveryLink when sendMemberPasswordReset succeeds', async () => {
                const targetMember = selectMatchSingle({
                    user_id: 'target-user',
                    role: 'member',
                    email: 'member@test.com',
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetMember],
                }).from)
                mocks.dbClient.auth.admin.getUserById.mockResolvedValue({
                    data: { user: { email: 'member@test.com' } },
                    error: null,
                })
                mocks.dbClient.auth.admin.generateLink.mockResolvedValue({
                    data: {
                        properties: { action_link: 'https://supabase.test/action-link?token=secret123' },
                    },
                    error: null,
                })
                mocks.emailSend.mockResolvedValue({ success: true })

                const { sendMemberPasswordReset } = await importTeamActions()
                const result = await sendMemberPasswordReset('target-user')

                expect(result).toEqual({ success: true })
                expect(result).not.toHaveProperty('recoveryLink')
                expect(result).not.toHaveProperty('link')
                expect(mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({
                    to: 'member@test.com',
                    subject: 'Restablecer Contraseña - Pixy',
                }))
            })

            it('does not return inviteLink when resendMemberInvitation succeeds', async () => {
                const targetMember = selectMatchSingle({
                    user_id: 'target-user',
                    role: 'member',
                    role_id: 'role-member',
                    email: 'member@test.com',
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetMember],
                }).from)
                mocks.dbClient.auth.admin.getUserById.mockResolvedValue({
                    data: { user: { email: 'member@test.com' } },
                    error: null,
                })
                mocks.dbClient.auth.admin.generateLink.mockResolvedValue({
                    data: {
                        properties: {
                            action_link: 'https://supabase.test/action-link?token=invite123',
                            verification_type: 'invite',
                        },
                    },
                    error: null,
                })
                mocks.emailSend.mockResolvedValue({ success: true })

                const { resendMemberInvitation } = await importTeamActions()
                const result = await resendMemberInvitation('target-user')

                expect(result).toEqual({ success: true })
                expect(result).not.toHaveProperty('inviteLink')
                expect(result).not.toHaveProperty('link')
                expect(mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({
                    to: 'member@test.com',
                    subject: 'Recordatorio: Invitación a unirte al equipo en Pixy',
                }))
            })

            it('does not return inviteLink when inviteMember succeeds', async () => {
                const roleQuery = selectEqSingle({
                    name: 'Member',
                    hierarchy_level: 10,
                })
                mocks.dbClient.auth.admin.generateLink.mockResolvedValue({
                    data: {
                        user: { id: 'user-invite', user_metadata: { full_name: 'Invited Member' } },
                        properties: {
                            action_link: 'https://supabase.test/action',
                            verification_type: 'invite',
                        },
                    },
                    error: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [roleQuery],
                    profiles: [directUpsert()],
                    organization_members: [directUpsert()],
                }).from)
                mocks.emailSend.mockResolvedValue({ success: true })

                const { inviteMember } = await importTeamActions()
                const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({ success: true })
                expect(result).not.toHaveProperty('inviteLink')
                expect(result).not.toHaveProperty('link')
                expect(mocks.emailSend).toHaveBeenCalledWith(expect.objectContaining({
                    to: 'member@example.com',
                    subject: 'Invitación a unirse al equipo',
                }))
            })
        })

        describe('granular IAM permission fallback (VULN-07)', () => {
            it('allows requireManageMembersAccess when caller has PERMISSIONS.ORG.MANAGE_MEMBERS', async () => {
                const { requireManageMembersAccess } = await importTeamActions()
                mocks.requireOrgRole.mockRejectedValue(new Error('Unauthorized: requires admin role'))
                mocks.hasPermission.mockResolvedValue(true)

                await expect(requireManageMembersAccess()).resolves.toBeUndefined()
                expect(mocks.hasPermission).toHaveBeenCalledWith('org.members.manage')
            })

            it('rejects requireManageMembersAccess when caller lacks both admin role and manage members permission', async () => {
                const { requireManageMembersAccess } = await importTeamActions()
                mocks.requireOrgRole.mockRejectedValue(new Error('Unauthorized: requires admin role'))
                mocks.hasPermission.mockResolvedValue(false)

                await expect(requireManageMembersAccess()).rejects.toThrow(
                    'Unauthorized: Requires admin role or manage members permission'
                )
            })
        })

        describe('Spanish role names and localized hierarchy protection', () => {
            it('blocks Administrator from setting password of another member with role "administrador"', async () => {
                const { setMemberPasswordManually } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetAdmin = selectMatchSingle({
                    user_id: 'target-admin-es',
                    role: 'administrador',
                    role_data: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await setMemberPasswordManually('target-admin-es', 'new-secure-password123')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo puedes cambiar contraseñas de miembros con menor jerarquía a la tuya',
                })
            })

            it('blocks Administrator from setting password of an Owner with role "dueño"', async () => {
                const { setMemberPasswordManually } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetOwner = selectMatchSingle({
                    user_id: 'target-owner-es',
                    role: 'dueño',
                    role_data: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetOwner],
                }).from)

                const result = await setMemberPasswordManually('target-owner-es', 'new-secure-password123')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede cambiar la contraseña de un Dueño',
                })
            })

            it('blocks Administrator from suspending a member with role "administrador"', async () => {
                const { toggleMemberStatus } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetAdmin = selectMatchSingle({
                    role: 'administrador',
                    role_data: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await toggleMemberStatus('target-admin-es', 'active')

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para modificar el estado de este miembro',
                })
            })

            it('blocks Administrator from removing a member with role "administrador"', async () => {
                const { removeMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetAdmin = selectMatchSingle({
                    role: 'administrador',
                    role_data: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await removeMember('target-admin-es')

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para eliminar a este miembro',
                })
            })

            it('blocks Administrator from modifying role of a member with role "administrador"', async () => {
                const { updateMemberRole } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const newRole = selectEqSingle({ name: 'Member', hierarchy_level: 10 })
                const targetAdmin = selectMatchSingle({
                    role: 'administrador',
                    role_data: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [newRole],
                    organization_members: [targetAdmin],
                }).from)

                const result = await updateMemberRole('target-admin-es', 'role-member')

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para modificar a este miembro',
                })
            })

            it('blocks Administrator from granting overrides: { all: true } in updateMemberPermissions', async () => {
                const { updateMemberPermissions } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })

                const targetMember = selectMatchSingle({
                    role: 'member',
                    permissions: {},
                    role_data: { hierarchy_level: 10 },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetMember],
                }).from)

                const result = await updateMemberPermissions('target-user', {
                    overrides: { all: true },
                })

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede conceder acceso total (all)',
                })
            })
        })

        describe('tenant isolation and non-existent target validations', () => {
            it('rejects updateMemberRole when target role does not exist in active organization', async () => {
                const missingRole = {
                    select: vi.fn(() => missingRole),
                    eq: vi.fn(() => missingRole),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [missingRole],
                }).from)

                const { updateMemberRole } = await importTeamActions()
                const result = await updateMemberRole('target-user', 'role-foreign-org')

                expect(result).toEqual({
                    success: false,
                    error: 'El rol seleccionado no pertenece a esta organización',
                })
            })

            it('returns error in removeMember when target member is not found in organization', async () => {
                const missingMember = {
                    select: vi.fn(() => missingMember),
                    match: vi.fn(() => missingMember),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [missingMember],
                }).from)

                const { removeMember } = await importTeamActions()
                const result = await removeMember('target-non-existent')

                expect(result).toEqual({
                    success: false,
                    error: 'Miembro no encontrado en esta organización',
                })
            })

            it('returns error in updateMemberRole when target member is not found in organization', async () => {
                const validRole = selectEqSingle({ name: 'Member', hierarchy_level: 10 })
                const missingMember = {
                    select: vi.fn(() => missingMember),
                    match: vi.fn(() => missingMember),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [validRole],
                    organization_members: [missingMember],
                }).from)

                const { updateMemberRole } = await importTeamActions()
                const result = await updateMemberRole('target-non-existent', 'role-member')

                expect(result).toEqual({
                    success: false,
                    error: 'Miembro no encontrado en esta organización',
                })
            })
        })

        describe('hardened privilege escalation & membership boundaries (GAP-01 to GAP-06)', () => {
            it('rejects createUserManually when target role does not exist in active organization (GAP-01)', async () => {
                const { createUserManually } = await importTeamActions()
                const missingRole = {
                    select: vi.fn(() => missingRole),
                    eq: vi.fn(() => missingRole),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.auth.admin.createUser.mockResolvedValue({
                    data: { user: { id: 'new-user' } },
                    error: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    profiles: [directUpsert()],
                    organization_roles: [missingRole],
                }).from)

                const result = await createUserManually({
                    email: 'new@example.com',
                    password: 'password123',
                    fullName: 'New User',
                    role: 'role-foreign',
                })

                expect(result).toEqual({
                    success: false,
                    error: 'El rol seleccionado no pertenece a esta organización',
                })
            })

            it('blocks Administrator from assigning owner role in createUserManually (GAP-02)', async () => {
                const { createUserManually } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const ownerRole = selectEqSingle({ name: 'Dueño', hierarchy_level: 100 })
                mocks.dbClient.auth.admin.createUser.mockResolvedValue({
                    data: { user: { id: 'new-user' } },
                    error: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    profiles: [directUpsert()],
                    organization_roles: [ownerRole],
                }).from)

                const result = await createUserManually({
                    email: 'new@example.com',
                    password: 'password123',
                    fullName: 'New User',
                    role: 'role-owner',
                })

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño de la organización puede crear o asignar otro Dueño',
                })
            })

            it('blocks Administrator from assigning role with equal/higher hierarchy in createUserManually (GAP-02)', async () => {
                const { createUserManually } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const adminRole = selectEqSingle({ name: 'Admin', hierarchy_level: 50 })
                mocks.dbClient.auth.admin.createUser.mockResolvedValue({
                    data: { user: { id: 'new-user' } },
                    error: null,
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    profiles: [directUpsert()],
                    organization_roles: [adminRole],
                }).from)

                const result = await createUserManually({
                    email: 'new@example.com',
                    password: 'password123',
                    fullName: 'New User',
                    role: 'role-admin',
                })

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes asignar un rol con jerarquía igual o superior a la tuya',
                })
            })

            it('rejects inviteMember when target role does not exist in active organization (GAP-01)', async () => {
                const { inviteMember } = await importTeamActions()
                const missingRole = {
                    select: vi.fn(() => missingRole),
                    eq: vi.fn(() => missingRole),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [missingRole],
                }).from)

                const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({
                    success: false,
                    error: 'El rol seleccionado no pertenece a esta organización',
                })
            })

            it('blocks Administrator from inviting owner role in inviteMember (GAP-02)', async () => {
                const { inviteMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const ownerRole = selectEqSingle({ name: 'Dueño', hierarchy_level: 100 })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [ownerRole],
                }).from)

                const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede invitar a otro Dueño',
                })
            })

            it('blocks Administrator from inviting role with equal/higher hierarchy in inviteMember (GAP-02)', async () => {
                const { inviteMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const adminRole = selectEqSingle({ name: 'Admin', hierarchy_level: 50 })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [adminRole],
                }).from)

                const result = await inviteMember('member@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes invitar a un miembro con jerarquía igual o superior a la tuya',
                })
            })

            it('rejects updateMemberAgentConfig when target member does not exist in organization (GAP-05)', async () => {
                const { updateMemberAgentConfig } = await importTeamActions()
                const missingMember = {
                    select: vi.fn(() => missingMember),
                    match: vi.fn(() => missingMember),
                    single: vi.fn(async () => ({ data: null, error: { message: 'Not found' } })),
                }
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [missingMember],
                }).from)

                const result = await updateMemberAgentConfig('target-nonexistent', { status: 'online' })

                expect(result).toEqual({
                    success: false,
                    error: 'El usuario no pertenece a esta organización',
                })
            })

            it('blocks Administrator from modifying agent config of member with equal/higher hierarchy (GAP-05)', async () => {
                const { updateMemberAgentConfig } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const targetAdmin = selectMatchSingle({
                    role: 'admin',
                    role_data: { hierarchy_level: 50, name: 'Admin' },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await updateMemberAgentConfig('other-admin', { status: 'online' })

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para modificar la configuración de este agente',
                })
            })

            it('blocks Administrator from resending invitation to an Owner or equal/higher hierarchy (GAP-06)', async () => {
                const { resendMemberInvitation } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const targetOwner = selectMatchSingle({
                    user_id: 'target-owner',
                    role: 'owner',
                    role_data: { hierarchy_level: 100, name: 'Dueño' },
                    email: 'owner@test.com',
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetOwner],
                }).from)

                const result = await resendMemberInvitation('target-owner')

                expect(result).toEqual({
                    success: false,
                    error: 'No puedes reenviar invitaciones a miembros con jerarquía igual o superior a la tuya',
                })
            })

            it('blocks Administrator from modifying profile of member with equal/higher hierarchy (GAP-03)', async () => {
                const { updateMemberProfile } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const targetAdmin = selectMatchSingle({
                    role: 'admin',
                    role_data: { hierarchy_level: 50, name: 'Admin' },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_members: [targetAdmin],
                }).from)

                const result = await updateMemberProfile('other-admin', { full_name: 'Renamed Admin' })

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para modificar la ficha de este miembro',
                })
            })

            it('blocks Administrator from demoting existing Owner via magiclink fallback in inviteMember', async () => {
                const { inviteMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const memberRole = selectEqSingle({ name: 'Miembro', hierarchy_level: 10 })
                mocks.dbClient.auth.admin.generateLink
                    .mockResolvedValueOnce({
                        data: null,
                        error: { message: 'User has already been registered' },
                    })
                    .mockResolvedValueOnce({
                        data: {
                            user: { id: 'existing-owner-id' },
                            properties: {
                                action_link: 'https://pixy.test/magic',
                                verification_type: 'magiclink',
                            },
                        },
                        error: null,
                    })
                const existingOwner = selectMatchSingle({
                    role: 'owner',
                    role_data: { hierarchy_level: 100, name: 'Dueño' },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [memberRole],
                    profiles: [directUpsert()],
                    organization_members: [existingOwner],
                }).from)

                const result = await inviteMember('owner@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({
                    success: false,
                    error: 'Solo el Dueño puede modificar el rol de un Dueño',
                })
            })

            it('blocks Administrator from demoting existing Admin with equal/higher hierarchy via magiclink fallback in inviteMember', async () => {
                const { inviteMember } = await importTeamActions()
                mocks.requireOrgRole.mockImplementation(async (role: string) => {
                    if (role === 'owner') throw new Error('Not owner')
                })
                const memberRole = selectEqSingle({ name: 'Miembro', hierarchy_level: 10 })
                mocks.dbClient.auth.admin.generateLink
                    .mockResolvedValueOnce({
                        data: null,
                        error: { message: 'User has already been registered' },
                    })
                    .mockResolvedValueOnce({
                        data: {
                            user: { id: 'existing-admin-id' },
                            properties: {
                                action_link: 'https://pixy.test/magic',
                                verification_type: 'magiclink',
                            },
                        },
                        error: null,
                    })
                const existingAdmin = selectMatchSingle({
                    role: 'admin',
                    role_data: { hierarchy_level: 50, name: 'Administrador' },
                })
                mocks.dbClient.from.mockImplementation(queuedAdminClient({
                    organization_roles: [memberRole],
                    profiles: [directUpsert()],
                    organization_members: [existingAdmin],
                }).from)

                const result = await inviteMember('admin2@example.com', '12345678-1234-1234-1234-123456789012')

                expect(result).toEqual({
                    success: false,
                    error: 'No tienes suficiente jerarquía para modificar a este miembro',
                })
            })
        })
    })
})



