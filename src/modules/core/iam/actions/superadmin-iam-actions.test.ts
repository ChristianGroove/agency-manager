import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireSuperAdmin: vi.fn(),
    createClient: vi.fn(),
    from: vi.fn(),
    listUsers: vi.fn(),
}));

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    requireSuperAdmin: mocks.requireSuperAdmin,
}));

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}));

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: mocks.from,
        auth: {
            admin: {
                listUsers: mocks.listUsers,
            },
        },
    },
}));

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}));

describe('SuperAdmin IAM Governance & Multi-Tenant Propagation Actions', () => {
    let memberUpdates: Array<{ match: any; payload: any }>;
    let roleUpdates: Array<{ payload: any }>;

    beforeEach(() => {
        vi.resetAllMocks();
        memberUpdates = [];
        roleUpdates = [];

        mocks.requireSuperAdmin.mockResolvedValue(undefined);
        mocks.createClient.mockResolvedValue({
            auth: {
                getUser: vi.fn(async () => ({ data: { user: { id: 'superadmin-1' } } })),
            },
        });
        mocks.listUsers.mockResolvedValue({ data: { users: [] } });
    });

    it('rejects non-SuperAdmin callers immediately', async () => {
        mocks.requireSuperAdmin.mockRejectedValueOnce(new Error('Unauthorized: SuperAdmin required'));
        const { publishGlobalBaseRoleAction } = await import('./superadmin-iam-actions');

        await expect(
            publishGlobalBaseRoleAction({
                roleKind: 'member',
                permissions: { 'crm.leads.view': true },
                conflictPolicy: 'preserve_overrides',
            })
        ).rejects.toThrow('Unauthorized: SuperAdmin required');
    });

    it('forbids modifying the Owner base role to prevent lockout', async () => {
        const { publishGlobalBaseRoleAction } = await import('./superadmin-iam-actions');

        await expect(
            publishGlobalBaseRoleAction({
                roleKind: 'owner' as any,
                permissions: {},
                conflictPolicy: 'preserve_overrides',
            })
        ).rejects.toThrow('Solo los roles base Administrador y Miembro pueden modificarse globalmente');
    });

    it('cleans redundant overrides while preserving intentional conflicting overrides under preserve_overrides policy', async () => {
        mocks.from.mockImplementation((table: string) => {
            const builder: any = {
                select: vi.fn(() => builder),
                insert: vi.fn(() => builder),
                update: vi.fn((payload: any) => {
                    if (table === 'organization_roles') {
                        roleUpdates.push({ payload });
                    }
                    builder._updatePayload = payload;
                    return builder;
                }),
                eq: vi.fn(() => builder),
                match: vi.fn((criteria: any) => {
                    if (table === 'organization_members' && builder._updatePayload) {
                        memberUpdates.push({ match: criteria, payload: builder._updatePayload });
                    }
                    return Promise.resolve({ data: null, error: null });
                }),
                single: vi.fn(async () => ({ data: { id: 'inserted-role-id' }, error: null })),
                then: (resolve: any) => {
                    if (table === 'organizations') {
                        return Promise.resolve({ data: [{ id: 'org-1' }], error: null }).then(resolve);
                    }
                    if (table === 'organization_roles') {
                        return Promise.resolve({
                            data: [
                                { id: 'r-owner', organization_id: 'org-1', name: 'Dueño', is_system_role: true, hierarchy_level: 100, permissions: { all: true } },
                                { id: 'r-admin', organization_id: 'org-1', name: 'Administrador', is_system_role: true, hierarchy_level: 50, permissions: {} },
                                { id: 'r-member', organization_id: 'org-1', name: 'Miembro', is_system_role: true, hierarchy_level: 10, permissions: { 'crm.leads.view': true, 'quotes.manage': false } },
                            ],
                            error: null,
                        }).then(resolve);
                    }
                    if (table === 'organization_members') {
                        return Promise.resolve({
                            data: [
                                {
                                    organization_id: 'org-1',
                                    user_id: 'user-1',
                                    role: 'member',
                                    role_id: 'r-member',
                                    permissions: {
                                        'quotes.manage': true, // Now matches new base role (redundant -> should be cleaned)
                                        'crm.leads.delete': true, // Still differs from new base role (false -> should be preserved)
                                        inbox_access: ['wa-1'], // Non-permission metadata -> must be preserved
                                    },
                                },
                            ],
                            error: null,
                        }).then(resolve);
                    }
                    return Promise.resolve({ data: [], error: null }).then(resolve);
                },
            };
            return builder;
        });

        const { publishGlobalBaseRoleAction } = await import('./superadmin-iam-actions');
        const res = await publishGlobalBaseRoleAction({
            roleKind: 'member',
            permissions: {
                'crm.leads.view': true,
                'quotes.manage': true, // Enabled globally for Member
                'crm.leads.delete': false,
            },
            conflictPolicy: 'preserve_overrides',
        });

        expect(res.success).toBe(true);
        expect(res.stats.cleanedRedundantOverrides).toBe(1);
        expect(res.stats.clearedConflictingOverrides).toBe(0);
        expect(memberUpdates).toHaveLength(1);
        expect(memberUpdates[0].payload.permissions['quotes.manage']).toBeUndefined();
        expect(memberUpdates[0].payload.permissions['crm.leads.delete']).toBe(true);
        expect(memberUpdates[0].payload.permissions.inbox_access).toEqual(['wa-1']);
    });

    it('clears all boolean permission overrides when conflictPolicy is clear_all_role_overrides while preserving inbox_access', async () => {
        mocks.from.mockImplementation((table: string) => {
            const builder: any = {
                select: vi.fn(() => builder),
                insert: vi.fn(() => builder),
                update: vi.fn((payload: any) => {
                    builder._updatePayload = payload;
                    return builder;
                }),
                eq: vi.fn(() => builder),
                match: vi.fn((criteria: any) => {
                    if (table === 'organization_members' && builder._updatePayload) {
                        memberUpdates.push({ match: criteria, payload: builder._updatePayload });
                    }
                    return Promise.resolve({ data: null, error: null });
                }),
                single: vi.fn(async () => ({ data: { id: 'inserted-role-id' }, error: null })),
                then: (resolve: any) => {
                    if (table === 'organizations') {
                        return Promise.resolve({ data: [{ id: 'org-1' }], error: null }).then(resolve);
                    }
                    if (table === 'organization_roles') {
                        return Promise.resolve({
                            data: [
                                { id: 'r-owner', organization_id: 'org-1', name: 'Dueño', is_system_role: true, hierarchy_level: 100, permissions: { all: true } },
                                { id: 'r-admin', organization_id: 'org-1', name: 'Administrador', is_system_role: true, hierarchy_level: 50, permissions: {} },
                                { id: 'r-member', organization_id: 'org-1', name: 'Miembro', is_system_role: true, hierarchy_level: 10, permissions: {} },
                            ],
                            error: null,
                        }).then(resolve);
                    }
                    if (table === 'organization_members') {
                        return Promise.resolve({
                            data: [
                                {
                                    organization_id: 'org-1',
                                    user_id: 'user-1',
                                    role: 'member',
                                    role_id: 'r-member',
                                    permissions: {
                                        'crm.leads.delete': true,
                                        'invoicing.manage': true,
                                        inbox_access: ['ch-1'],
                                        job_title: 'Asesor Comercial',
                                    },
                                },
                            ],
                            error: null,
                        }).then(resolve);
                    }
                    return Promise.resolve({ data: [], error: null }).then(resolve);
                },
            };
            return builder;
        });

        const { publishGlobalBaseRoleAction } = await import('./superadmin-iam-actions');
        const res = await publishGlobalBaseRoleAction({
            roleKind: 'member',
            permissions: {
                'crm.leads.view': true,
                'crm.leads.delete': false,
                'invoicing.manage': false,
            },
            conflictPolicy: 'clear_all_role_overrides',
        });

        expect(res.success).toBe(true);
        expect(res.stats.clearedConflictingOverrides).toBe(2);
        expect(memberUpdates).toHaveLength(1);
        expect(memberUpdates[0].payload.permissions['crm.leads.delete']).toBeUndefined();
        expect(memberUpdates[0].payload.permissions['invoicing.manage']).toBeUndefined();
        expect(memberUpdates[0].payload.permissions.inbox_access).toEqual(['ch-1']);
        expect(memberUpdates[0].payload.permissions.job_title).toBe('Asesor Comercial');
    });
});
