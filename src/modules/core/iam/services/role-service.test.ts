import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

function memberQuery(data: unknown) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => ({ data, error: null })),
    }

    return query
}

function authClient(adminFrom: any) {
    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: {
                    user: { id: 'user-1' },
                },
            })),
        },
        from: vi.fn((table: string) => {
            if (table === 'organization_roles') {
                return adminFrom(table);
            }
            if (table !== 'organization_members') {
                throw new Error(`Unexpected table ${table}`)
            }
            return memberQuery({
                role: 'owner',
                role_id: null,
                permissions: {},
            })
        }),
    }
}

function insertSelectSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function selectEqSingleQuery(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function createQueuedAdmin(queues: Record<string, any[]>) {
    const adminFrom = vi.fn((table: string) => {
        const queue = queues[table]
        if (!queue?.length) throw new Error(`Unexpected admin table ${table}`)
        return queue.shift()
    })
    mocks.createClient.mockResolvedValue(authClient(adminFrom))
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
})

describe('role service safeguards', () => {
    it('strips owner-level permission and clamps hierarchy when creating custom roles', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const insert = insertSelectSingleQuery({
            data: { id: 'role-1', name: 'Custom Admin' },
            error: null,
        })
        createQueuedAdmin({
            organization_roles: [insert],
        })

        const { upsertRole } = await import('./role-service')
        const result = await upsertRole({
            name: 'Custom Admin',
            description: 'Unsafe client payload',
            permissions: {
                all: true,
                'crm.view_leads': true,
                'crm.edit_leads': false,
                ignored: 'yes',
            } as any,
            hierarchy_level: 100,
        })

        expect(result).toEqual({ id: 'role-1', name: 'Custom Admin' })
        expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({
            organization_id: 'org-current',
            name: 'Custom Admin',
            hierarchy_level: 49,
            permissions: {
                'crm.view_leads': true,
                'crm.edit_leads': false,
            },
        }))
        expect(JSON.stringify(insert.insert.mock.calls)).not.toContain('"all"')
    })

    it('blocks editing system roles through the custom role upsert path', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const existingRole = selectEqSingleQuery({
            data: { is_system_role: true },
            error: null,
        })
        createQueuedAdmin({
            organization_roles: [existingRole],
        })

        const { upsertRole } = await import('./role-service')

        await expect(upsertRole({
            id: 'owner-role',
            name: 'Owner',
            permissions: {
                all: true,
            } as any,
            hierarchy_level: 100,
        })).rejects.toThrow('Cannot modify a System Role')
    })

    it('blocks deleting a custom role that still has assigned members', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const roleLookup = selectEqSingleQuery({
            data: { is_system_role: false, hierarchy_level: 20, name: 'Supervisor' },
            error: null,
        })
        const countQuery: any = {
            select: vi.fn((_cols: string, opts?: any) => (opts?.head ? countQuery : memberLookup)),
            eq: vi.fn(() => countQuery),
            single: vi.fn(async () => ({
                data: {
                    role: 'owner',
                    role_id: null,
                    status: 'active',
                    permissions: {},
                },
                error: null,
            })),
            then: (resolve: any) => resolve({ count: 3, error: null }),
        }
        const memberLookup = countQuery
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
            },
            from: vi.fn((table: string) => {
                if (table === 'organization_roles') return roleLookup
                if (table === 'organization_members') return countQuery
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { deleteRole } = await import('./role-service')
        await expect(deleteRole('role-custom')).rejects.toThrow('tiene 3 miembro(s) asignado(s)')
    })

    it('denies all permissions when member status is blocked', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'blocked-user' } } })),
            },
            from: vi.fn(() =>
                memberQuery({
                    role: 'owner',
                    role_id: null,
                    status: 'blocked',
                    permissions: { all: true },
                })
            ),
        })

        const { hasPermission } = await import('./role-service')
        const allowed = await hasPermission('org.settings.manage')
        expect(allowed).toBe(false)
    })

    it('respects explicit member boolean overrides (both false deny and true grant) over role permissions', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const roleQuery = selectEqSingleQuery({
            data: {
                permissions: {
                    'crm.leads.delete': true,
                    'crm.leads.edit': false,
                },
            },
            error: null,
        })
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'custom-member' } } })),
            },
            from: vi.fn((table: string) => {
                if (table === 'organization_roles') return roleQuery
                if (table === 'organization_members') {
                    return memberQuery({
                        role: 'member',
                        role_id: 'role-sales',
                        status: 'active',
                        permissions: {
                            'crm.leads.delete': false, // Explicitly denied on member
                            'crm.leads.edit': true,    // Explicitly granted on member
                        },
                    })
                }
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { hasPermission } = await import('./role-service')
        expect(await hasPermission('crm.leads.delete')).toBe(false)
        expect(await hasPermission('crm.leads.edit')).toBe(true)
    })

    it('hydrates base system roles (Owner, Admin, Member) and repairs broken UTF-8 descriptions in getOrganizationRoles', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        const rolesListQuery: any = {
            select: vi.fn(() => rolesListQuery),
            eq: vi.fn(() => rolesListQuery),
            order: vi.fn(() => rolesListQuery),
            then: (resolve: any) =>
                resolve({
                    data: [
                        {
                            id: 'role-member',
                            organization_id: 'org-current',
                            name: 'Member',
                            description: 'Acceso est??ndar a las funciones asignadas',
                            is_system_role: true,
                            hierarchy_level: 1,
                            permissions: {},
                            members: [{ count: 30 }],
                        },
                        {
                            id: 'role-admin',
                            organization_id: 'org-current',
                            name: 'Admin',
                            description: 'Gesti??n operativa de todos los m??dulos',
                            is_system_role: true,
                            hierarchy_level: 2,
                            permissions: { 'admin.access': true },
                            members: [{ count: 3 }],
                        },
                        {
                            id: 'role-owner',
                            organization_id: 'org-current',
                            name: 'Due??o',
                            description: 'Control de la organizaci??n y configuraci??n',
                            is_system_role: true,
                            hierarchy_level: 3,
                            permissions: { all: true },
                            members: [{ count: 1 }],
                        },
                    ],
                    error: null,
                }),
        }

        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
            },
            from: vi.fn(() => rolesListQuery),
        })

        const { getOrganizationRoles } = await import('./role-service')
        const roles = await getOrganizationRoles()

        expect(roles.map(r => r.name)).toEqual(['Dueño', 'Admin', 'Member'])
        expect(roles[0].hierarchy_level).toBe(100)
        expect(roles[0].description).toBe('Control de la organización y configuración')
        expect(roles[0].permissions.all).toBe(true)

        expect(roles[1].hierarchy_level).toBe(50)
        expect(roles[1].description).toBe('Gestión operativa de todos los módulos')
        expect(roles[1].permissions['org.members.manage']).toBe(true)
        expect(roles[1].permissions['crm.leads.view']).toBe(true)
        expect(roles[1].permissions['inbox.conversations.view_all']).toBe(true)

        expect(roles[2].hierarchy_level).toBe(10)
        expect(roles[2].description).toBe('Acceso estándar a las funciones asignadas')
        expect(roles[2].permissions['crm.leads.view']).toBe(true)
        expect(roles[2].permissions['crm.leads.edit']).toBe(true)
    })

    it('filters permission groups strictly by tenant active modules while preserving core modules', async () => {
        const { getVisiblePermissionGroups } = await import('../actions/permissions')

        // Custom override only (e.g. IMEI manifests) still preserves core_clients and core_settings
        const manifestsOnlyGroups = getVisiblePermissionGroups(['module_manifests'])
        const manifestsKeys = manifestsOnlyGroups.map(g => g.id)
        expect(manifestsKeys).toContain('crm')
        expect(manifestsKeys).toContain('org')
        expect(manifestsKeys).toContain('vault')
        expect(manifestsKeys).not.toContain('resto')
        expect(manifestsKeys).not.toContain('tasks')
        expect(manifestsKeys).not.toContain('marketing')

        // Messaging + custom override includes inbox, crm (core_clients), and org/vault (core_settings)
        const messagingGroups = getVisiblePermissionGroups(['module_messaging', 'module_manifests'])
        const messagingKeys = messagingGroups.map(g => g.id)
        expect(messagingKeys).toEqual(['crm', 'inbox', 'org', 'vault'])

        // Empty array strictly returns ONLY core modules, never falling back to all modules
        const coreOnlyGroups = getVisiblePermissionGroups([])
        const coreOnlyKeys = coreOnlyGroups.map(g => g.id)
        expect(coreOnlyKeys).toEqual(['crm', 'org', 'vault'])
        expect(coreOnlyKeys).not.toContain('resto')
        expect(coreOnlyKeys).not.toContain('inbox')
    })

    it('sanitizes broken mojibake encoding and double-encoded UTF-8 strings', async () => {
        const { sanitizeBrokenUtf8 } = await import('../actions/permissions')

        expect(sanitizeBrokenUtf8('Acceso est??ndar a las funciones asignadas'))
            .toBe('Acceso estándar a las funciones asignadas')
        expect(sanitizeBrokenUtf8('Due??o del espacio'))
            .toBe('Dueño del espacio')
        expect(sanitizeBrokenUtf8('Gesti??n de m??dulos y configuraci??n'))
            .toBe('Gestión de módulos y configuración')
        expect(sanitizeBrokenUtf8('dise??o'))
            .toBe('diseño')
        expect(sanitizeBrokenUtf8('campa??a'))
            .toBe('campaña')
        expect(sanitizeBrokenUtf8('descripci??n'))
            .toBe('descripción')
        expect(sanitizeBrokenUtf8('validaci??n'))
            .toBe('validación')
        expect(sanitizeBrokenUtf8('estÃ¡ndar'))
            .toBe('estándar')
        expect(sanitizeBrokenUtf8('DueÃ±o'))
            .toBe('Dueño')
    })

    it('exports DEFAULT_ROLES constant and getDefaultRoles function', async () => {
        const { DEFAULT_ROLES, getDefaultRoles } = await import('./default-roles')
        expect(Array.isArray(DEFAULT_ROLES)).toBe(true)
        expect(DEFAULT_ROLES.length).toBeGreaterThanOrEqual(3)
        expect(getDefaultRoles()).toBe(DEFAULT_ROLES)

        const ownerRole = DEFAULT_ROLES.find(r => r.name === 'Dueño')
        const adminRole = DEFAULT_ROLES.find(r => r.name === 'Administrador')
        const memberRole = DEFAULT_ROLES.find(r => r.name === 'Miembro')

        expect(ownerRole?.permissions?.all).toBe(true)
        expect(adminRole?.permissions?.['org.members.manage']).toBe(true)
        expect(memberRole?.permissions?.['crm.leads.view']).toBe(true)
    })

    it('duplicates an owner role by hydrating all active permissions and stripping wildcard', async () => {
        mocks.getCurrentOrganizationId.mockResolvedValue('org-1')
        const { duplicateRole } = await import('./role-service')
        const { PERMISSIONS } = await import('../actions/permissions')

        let insertedPayload: any = null
        const adminFrom = (table: string) => {
            if (table === 'organization_roles') {
                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            eq: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: {
                                        id: 'role-system-owner',
                                        name: 'Dueño',
                                        description: 'Acceso total',
                                        hierarchy_level: 100,
                                        is_system_role: true,
                                        permissions: { all: true },
                                    },
                                    error: null,
                                })),
                            })),
                        })),
                    })),
                    insert: vi.fn((payload: any) => {
                        insertedPayload = payload
                        return {
                            select: vi.fn(() => ({
                                single: vi.fn(async () => ({
                                    data: { id: 'new-dup-role', ...payload },
                                    error: null,
                                })),
                            })),
                        }
                    }),
                }
            }
            throw new Error(`Unexpected table ${table}`)
        }

        mocks.createClient.mockResolvedValue(authClient(adminFrom))

        const duplicated = await duplicateRole('role-system-owner', 'Dueño Personalizado')
        expect(duplicated.id).toBe('new-dup-role')
        expect(insertedPayload.name).toBe('Dueño Personalizado')
        expect(insertedPayload.hierarchy_level).toBeLessThanOrEqual(45)
        expect(insertedPayload.permissions.all).toBeUndefined()
        // Hydrated permissions should include all known permissions
        expect(insertedPayload.permissions[PERMISSIONS.CRM.VIEW_LEADS]).toBe(true)
        expect(insertedPayload.permissions[PERMISSIONS.ORG.MANAGE_ROLES]).toBe(true)
        expect(insertedPayload.permissions[PERMISSIONS.MARKETING.VIEW]).toBe(true)
        expect(insertedPayload.permissions[PERMISSIONS.RENTALS.VIEW]).toBe(true)
        expect(insertedPayload.permissions[PERMISSIONS.VAULT.MANAGE]).toBe(true)
    })

    describe('requirePermission canonical primitive', () => {
        it('resolves cleanly when the user possesses the required permission', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: { id: 'owner-user' } } })),
                },
                from: vi.fn(() =>
                    memberQuery({
                        role: 'owner',
                        role_id: null,
                        status: 'active',
                        permissions: { all: true },
                    })
                ),
            })

            const { requirePermission } = await import('./role-service')
            await expect(requirePermission('crm.leads.view')).resolves.toBeUndefined()
        })

        it('throws exact canonical Spanish error when the permission is missing', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: { id: 'basic-member' } } })),
                },
                from: vi.fn((table: string) => {
                    if (table === 'organization_roles') {
                        return selectEqSingleQuery({
                            data: { permissions: { 'crm.leads.view': true } },
                            error: null,
                        })
                    }
                    return memberQuery({
                        role: 'member',
                        role_id: 'role-restricted',
                        status: 'active',
                        permissions: { 'org.members.manage': false },
                    })
                }),
            })

            const { requirePermission } = await import('./role-service')
            await expect(requirePermission('org.members.manage')).rejects.toThrow(
                'Acceso denegado: Se requiere el permiso "org.members.manage".'
            )
        })

        it('respects explicitOrgId parameter over cookie/header context', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue('org-cookie')
            const memberFromOrgParam = vi.fn(() =>
                memberQuery({
                    role: 'owner',
                    role_id: null,
                    status: 'active',
                    permissions: { all: true },
                })
            )
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: { id: 'owner-user' } } })),
                },
                from: memberFromOrgParam,
            })

            const { requirePermission } = await import('./role-service')
            await expect(requirePermission('rentals.view', 'org-explicit-123')).resolves.toBeUndefined()
        })

        it('deduplicates database queries across multiple permission checks via request cache', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue('org-cache-test')
            const memberLookup = vi.fn(() =>
                memberQuery({
                    role: 'member',
                    role_id: null,
                    status: 'active',
                    permissions: { 'crm.leads.view': true, 'rentals.view': true },
                })
            )
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: { id: 'cache-member' } } })),
                },
                from: memberLookup,
            })

            const { hasPermission } = await import('./role-service')
            const check1 = await hasPermission('crm.leads.view')
            const check2 = await hasPermission('rentals.view')
            const check3 = await hasPermission('vault.backup.manage')

            expect(check1).toBe(true)
            expect(check2).toBe(true)
            expect(check3).toBe(false)
            // Even though hasPermission was called 3 times, the member row was only queried once from DB
            expect(memberLookup).toHaveBeenCalledTimes(1)
        })

        it('hydrates default permissions for legacy owner without role_id in getUserPermissionsPayload', async () => {
            mocks.getCurrentOrganizationId.mockResolvedValue('org-owner-test')
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(async () => ({ data: { user: { id: 'legacy-owner' } } })),
                },
                from: vi.fn(() =>
                    memberQuery({
                        role: 'Dueño',
                        role_id: null,
                        status: 'active',
                        permissions: {},
                    })
                ),
            })

            const { getUserPermissionsPayload } = await import('./role-service')
            const payload = await getUserPermissionsPayload()

            expect(payload).not.toBeNull()
            expect(payload?.isOwner).toBe(true)
            expect(payload?.hierarchyLevel).toBe(100)
            expect(payload?.effectivePermissions.all).toBe(true)
            // Default role permissions must be populated, not an empty object
            expect(Object.keys(payload?.rolePermissions || {}).length).toBeGreaterThan(0)
            expect(payload?.rolePermissions['rentals.view']).toBe(true)
        })

        it('resolves explicitOrgId and explicitUserId without requiring auth or current org cookies', async () => {
            const memberLookup = vi.fn(() =>
                memberQuery({
                    role: 'admin',
                    role_id: null,
                    status: 'active',
                    permissions: {},
                })
            )
            mocks.createClient.mockResolvedValue({
                auth: {
                    getUser: vi.fn(), // Should not be called
                },
                from: memberLookup,
            })

            const { getUserPermissionsPayload } = await import('./role-service')
            const payload = await getUserPermissionsPayload('org-explicit-456', 'user-explicit-789')

            expect(payload).not.toBeNull()
            expect(payload?.roleName.toLowerCase()).toBe('admin')
            expect(payload?.hierarchyLevel).toBe(50)
            expect(memberLookup).toHaveBeenCalledWith('organization_members')
        })
    })

    describe('IAM V2 Catalog Completeness & Orphan Sanitation', () => {
        it('includes all newly required permission domains in PERMISSIONS', async () => {
            const { PERMISSIONS } = await import('../actions/permissions')

            // RENTALS
            expect(PERMISSIONS.RENTALS.VIEW).toBe('rentals.view')
            expect(PERMISSIONS.RENTALS.MANAGE_PROPERTIES).toBe('rentals.properties.manage')
            expect(PERMISSIONS.RENTALS.MANAGE_CONTRACTS).toBe('rentals.contracts.manage')
            expect(PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS).toBe('rentals.settlements.manage')

            // QUOTES
            expect(PERMISSIONS.QUOTES.VIEW).toBe('quotes.view')
            expect(PERMISSIONS.QUOTES.MANAGE).toBe('quotes.manage')
            expect(PERMISSIONS.QUOTES.CONVERT).toBe('quotes.convert')

            // WORK_ORDERS
            expect(PERMISSIONS.WORK_ORDERS.VIEW).toBe('work_orders.view')
            expect(PERMISSIONS.WORK_ORDERS.MANAGE).toBe('work_orders.manage')

            // PAYROLL
            expect(PERMISSIONS.PAYROLL.VIEW).toBe('payroll.view')
            expect(PERMISSIONS.PAYROLL.PROCESS).toBe('payroll.process')
            expect(PERMISSIONS.PAYROLL.PAY).toBe('payroll.pay')

            // VAULT
            expect(PERMISSIONS.VAULT.MANAGE).toBe('vault.backup.manage')
            expect(PERMISSIONS.VAULT.RESTORE).toBe('vault.backup.restore')
        })

        it('sanitizes orphaned permissions in PERMISSION_GROUPS (automation.execute and org.audit.view)', async () => {
            const { PERMISSION_GROUPS, PERMISSIONS } = await import('../actions/permissions')

            const automationGroup = PERMISSION_GROUPS.find(g => g.id === 'automation')
            expect(automationGroup).toBeDefined()
            const autoPermIds = automationGroup!.permissions.map(p => p.id)
            expect(autoPermIds).toContain(PERMISSIONS.AUTOMATION.EXECUTE)

            const orgGroup = PERMISSION_GROUPS.find(g => g.id === 'org')
            expect(orgGroup).toBeDefined()
            const orgPermIds = orgGroup!.permissions.map(p => p.id)
            expect(orgPermIds).toContain(PERMISSIONS.ORG.VIEW_AUDIT_LOGS)
        })

        it('defines accordion UI metadata in PERMISSION_GROUPS for all new domains', async () => {
            const { PERMISSION_GROUPS } = await import('../actions/permissions')

            const groupIds = PERMISSION_GROUPS.map(g => g.id)
            expect(groupIds).toContain('rentals')
            expect(groupIds).toContain('quotes')
            expect(groupIds).toContain('work_orders')
            expect(groupIds).toContain('payroll')
            expect(groupIds).toContain('vault')

            const rentals = PERMISSION_GROUPS.find(g => g.id === 'rentals')!
            expect(rentals.moduleKey).toBe('module_rentals')
            expect(rentals.label).toBe('Arriendos e Inmuebles')

            const quotes = PERMISSION_GROUPS.find(g => g.id === 'quotes')!
            expect(quotes.moduleKey).toBe('module_quotes')
            expect(quotes.label).toBe('Cotizaciones')

            const workOrders = PERMISSION_GROUPS.find(g => g.id === 'work_orders')!
            expect(workOrders.moduleKey).toBe('module_cleaning')
            expect(workOrders.label).toBe('Órdenes de Trabajo')

            const payroll = PERMISSION_GROUPS.find(g => g.id === 'payroll')!
            expect(payroll.moduleKey).toBe('module_attendance')
            expect(payroll.label).toBe('Nómina y Liquidaciones')

            const vault = PERMISSION_GROUPS.find(g => g.id === 'vault')!
            expect(vault.moduleKey).toBe('core_settings')
            expect(vault.label).toBe('Bóveda de Datos (Backups)')
        })

        it('includes default permissions in DEFAULT_ROLES for Dueño, Administrador, and Miembro', async () => {
            const { DEFAULT_ROLES } = await import('./default-roles')
            const { PERMISSIONS } = await import('../actions/permissions')

            const owner = DEFAULT_ROLES.find(r => r.name === 'Dueño')!
            const admin = DEFAULT_ROLES.find(r => r.name === 'Administrador')!
            const member = DEFAULT_ROLES.find(r => r.name === 'Miembro')!

            // Dueño has wildcard and granular
            expect(owner.permissions.all).toBe(true)
            expect(owner.permissions[PERMISSIONS.RENTALS.VIEW]).toBe(true)
            expect(owner.permissions[PERMISSIONS.QUOTES.VIEW]).toBe(true)
            expect(owner.permissions[PERMISSIONS.WORK_ORDERS.VIEW]).toBe(true)
            expect(owner.permissions[PERMISSIONS.PAYROLL.VIEW]).toBe(true)
            expect(owner.permissions[PERMISSIONS.VAULT.MANAGE]).toBe(true)

            // Administrador has full operational & administrative control
            expect(admin.permissions[PERMISSIONS.AUTOMATION.EXECUTE]).toBe(true)
            expect(admin.permissions[PERMISSIONS.RENTALS.MANAGE_PROPERTIES]).toBe(true)
            expect(admin.permissions[PERMISSIONS.QUOTES.MANAGE]).toBe(true)
            expect(admin.permissions[PERMISSIONS.WORK_ORDERS.MANAGE]).toBe(true)
            expect(admin.permissions[PERMISSIONS.PAYROLL.PROCESS]).toBe(true)
            expect(admin.permissions[PERMISSIONS.VAULT.MANAGE]).toBe(true)

            // Miembro has read-level permissions for assigned modules
            expect(member.permissions[PERMISSIONS.RENTALS.VIEW]).toBe(true)
            expect(member.permissions[PERMISSIONS.QUOTES.VIEW]).toBe(true)
            expect(member.permissions[PERMISSIONS.WORK_ORDERS.VIEW]).toBe(true)
            expect(member.permissions[PERMISSIONS.VAULT.MANAGE]).toBeUndefined()
        })
    })
})


