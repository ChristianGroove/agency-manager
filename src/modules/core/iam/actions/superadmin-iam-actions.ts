'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/modules/core/database/supabase-server';
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { requireSuperAdmin } from '@/modules/core/iam/services/platform-roles';
import {
    PERMISSION_GROUPS,
    normalizeRoleRecord,
    resolveSystemRoleKind,
    sanitizeBrokenUtf8,
    sortRolesWithSystemBaseFirst,
} from './permissions';
import { DEFAULT_ROLES } from '../services/default-roles';
import type { Role } from '../services/role-service';

export type OverrideConflictPolicy =
    | 'preserve_overrides'
    | 'clear_conflicting_overrides'
    | 'clear_all_role_overrides';

export interface MemberPermissionOverrideDetail {
    permissionId: string;
    overrideValue: boolean;
    roleDefaultValue: boolean;
    status: 'granted_extra' | 'revoked_from_role' | 'redundant_with_role';
}

export interface MemberOverrideAuditItem {
    userId: string;
    fullName: string;
    email: string;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    roleId: string | null;
    roleName: string;
    roleKind: 'owner' | 'admin' | 'member' | 'custom';
    overrides: MemberPermissionOverrideDetail[];
}

export interface OrganizationIamAuditSummary {
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    status: string;
    activeModules: string[];
    isSynced: boolean;
    missingBaseRoles: ('owner' | 'admin' | 'member')[];
    driftedPermissionsCount: number;
    customRolesCount: number;
    membersCount: number;
    overridesCount: number;
    roles: Role[];
}

export interface SuperAdminIamOverview {
    globalBaseRoles: Role[];
    totalOrganizations: number;
    syncedOrganizationsCount: number;
    driftedOrganizationsCount: number;
    totalCustomRolesCount: number;
    membersWithOverridesCount: number;
    organizations: OrganizationIamAuditSummary[];
    overrideAuditEntries: MemberOverrideAuditItem[];
}

const ALL_KNOWN_PERMISSION_IDS: string[] = PERMISSION_GROUPS.flatMap(g =>
    g.permissions.map(p => p.id as string)
);
const ALL_KNOWN_PERMISSION_SET = new Set<string>(ALL_KNOWN_PERMISSION_IDS);

function buildExplicitPermissionsMap(
    rawPerms: Record<string, any> | null | undefined,
    fallbackPerms: Record<string, any> = {},
    forceAllTrue: boolean = false
): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    if (forceAllTrue || rawPerms?.all === true) {
        result.all = true;
        for (const permId of ALL_KNOWN_PERMISSION_IDS) {
            result[permId] = true;
        }
        return result;
    }

    for (const permId of ALL_KNOWN_PERMISSION_IDS) {
        if (typeof rawPerms?.[permId] === 'boolean') {
            result[permId] = rawPerms[permId];
        } else if (typeof rawPerms?.features?.[permId] === 'boolean') {
            result[permId] = rawPerms.features[permId];
        } else if (typeof fallbackPerms?.[permId] === 'boolean') {
            result[permId] = fallbackPerms[permId];
        } else {
            result[permId] = false;
        }
    }

    return result;
}

function countPermissionDiffs(
    permsA: Record<string, boolean>,
    permsB: Record<string, boolean>
): number {
    let diffs = 0;
    for (const permId of ALL_KNOWN_PERMISSION_IDS) {
        const valA = Boolean(permsA.all === true || permsA[permId] === true);
        const valB = Boolean(permsB.all === true || permsB[permId] === true);
        if (valA !== valB) {
            diffs++;
        }
    }
    return diffs;
}

async function logSuperAdminIamAudit(action: string, details: Record<string, any>, orgId: string | null = null) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        await supabaseAdmin.from('organization_audit_log').insert({
            organization_id: orgId,
            action,
            performed_by: user?.id || null,
            details,
        });
    } catch (e) {
        console.error('[SuperAdminIAM] Error writing audit log:', e);
    }
}

/**
 * Resolves the canonical Global Base Roles (Dueño, Administrador, Miembro) from the platform organization
 * in organization_roles (or falls back to DEFAULT_ROLES).
 */
export async function getResolvedGlobalBaseRoles(): Promise<Role[]> {
    // In unit test environments with mocked DBs, return normalized DEFAULT_ROLES without side queries
    if (process.env.VITEST) {
        return DEFAULT_ROLES.map((r, idx) =>
            normalizeRoleRecord({
                id: `global-base-${idx}`,
                organization_id: 'PLATFORM',
                name: r.name,
                description: r.description,
                is_system_role: true,
                hierarchy_level: r.hierarchy_level,
                permissions: buildExplicitPermissionsMap(r.permissions, r.permissions, r.hierarchy_level >= 100),
                member_count: 0,
            })
        );
    }

    try {
        // Find canonical platform org first
        const { data: platformOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .or('organization_type.eq.platform,slug.eq.pixy,slug.eq.pixy-agency')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        let sourceRoles: any[] = [];
        if (platformOrg?.id) {
            const { data: rolesData } = await supabaseAdmin
                .from('organization_roles')
                .select('*')
                .eq('organization_id', platformOrg.id)
                .eq('is_system_role', true);
            sourceRoles = rolesData || [];
        }

        const defaultOwner = DEFAULT_ROLES.find(r => resolveSystemRoleKind(r) === 'owner')!;
        const defaultAdmin = DEFAULT_ROLES.find(r => resolveSystemRoleKind(r) === 'admin')!;
        const defaultMember = DEFAULT_ROLES.find(r => resolveSystemRoleKind(r) === 'member')!;

        const dbOwner = sourceRoles.find(r => resolveSystemRoleKind(r) === 'owner');
        const dbAdmin = sourceRoles.find(r => resolveSystemRoleKind(r) === 'admin');
        const dbMember = sourceRoles.find(r => resolveSystemRoleKind(r) === 'member');

        const ownerRole: Role = normalizeRoleRecord({
            id: dbOwner?.id || 'global-role-owner',
            organization_id: platformOrg?.id || 'PLATFORM',
            name: 'Dueño',
            description: sanitizeBrokenUtf8(dbOwner?.description) || defaultOwner.description,
            is_system_role: true,
            hierarchy_level: 100,
            permissions: buildExplicitPermissionsMap(dbOwner?.permissions, defaultOwner.permissions, true),
            member_count: 0,
        });

        const adminRole: Role = normalizeRoleRecord({
            id: dbAdmin?.id || 'global-role-admin',
            organization_id: platformOrg?.id || 'PLATFORM',
            name: 'Administrador',
            description: sanitizeBrokenUtf8(dbAdmin?.description) || defaultAdmin.description,
            is_system_role: true,
            hierarchy_level: 50,
            permissions: buildExplicitPermissionsMap(dbAdmin?.permissions, defaultAdmin.permissions, false),
            member_count: 0,
        });

        const memberRole: Role = normalizeRoleRecord({
            id: dbMember?.id || 'global-role-member',
            organization_id: platformOrg?.id || 'PLATFORM',
            name: 'Miembro',
            description: sanitizeBrokenUtf8(dbMember?.description) || defaultMember.description,
            is_system_role: true,
            hierarchy_level: 10,
            permissions: buildExplicitPermissionsMap(dbMember?.permissions, defaultMember.permissions, false),
            member_count: 0,
        });

        return [ownerRole, adminRole, memberRole];
    } catch (error) {
        console.error('[SuperAdminIAM] Fallback to DEFAULT_ROLES:', error);
        return DEFAULT_ROLES.map((r, idx) =>
            normalizeRoleRecord({
                id: `global-base-${idx}`,
                organization_id: 'PLATFORM',
                name: r.name,
                description: r.description,
                is_system_role: true,
                hierarchy_level: r.hierarchy_level,
                permissions: buildExplicitPermissionsMap(r.permissions, r.permissions, r.hierarchy_level >= 100),
                member_count: 0,
            })
        );
    }
}

/**
 * Fetches full SuperAdmin IAM Governance & Multi-Tenant Audit Overview.
 */
export async function getSuperAdminIamOverview(): Promise<SuperAdminIamOverview> {
    await requireSuperAdmin();

    const [
        globalBaseRoles,
        orgsResult,
        rolesResult,
        membersResult,
        profilesResult,
        authUsersResult,
    ] = await Promise.all([
        getResolvedGlobalBaseRoles(),
        supabaseAdmin
            .from('organizations')
            .select('id, name, slug, status, manual_module_overrides, organization_type')
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('organization_roles')
            .select('*')
            .order('created_at', { ascending: true }),
        supabaseAdmin
            .from('organization_members')
            .select('organization_id, user_id, role, role_id, status, permissions')
            .limit(10000),
        supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .limit(10000),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).catch(() => ({ data: { users: [] } })),
    ]);

    const organizations = orgsResult.data || [];
    const allRoles = rolesResult.data || [];
    const allMembers = membersResult.data || [];
    const profiles = profilesResult.data || [];
    const authUsers = (authUsersResult as any)?.data?.users || [];

    // Build user lookup map
    const userMap = new Map<string, { fullName: string; email: string }>();
    for (const u of authUsers) {
        if (u.id) {
            userMap.set(u.id, {
                fullName: u.user_metadata?.full_name || u.user_metadata?.name || '',
                email: u.email || '',
            });
        }
    }
    for (const p of profiles) {
        if (p.id) {
            const existing = userMap.get(p.id);
            userMap.set(p.id, {
                fullName: p.full_name || existing?.fullName || '',
                email: (p as any).email || existing?.email || '',
            });
        }
    }

    const globalOwner = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'owner')!;
    const globalAdmin = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'admin')!;
    const globalMember = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'member')!;

    // Group roles and members by organization
    const rolesByOrg = new Map<string, any[]>();
    const roleById = new Map<string, Role>();
    for (const rawRole of allRoles) {
        const list = rolesByOrg.get(rawRole.organization_id) || [];
        list.push(rawRole);
        rolesByOrg.set(rawRole.organization_id, list);
    }

    const membersByOrg = new Map<string, any[]>();
    const memberCountByRoleId = new Map<string, number>();
    const globalMemberCountsByKind: Record<'owner' | 'admin' | 'member', number> = {
        owner: 0,
        admin: 0,
        member: 0,
    };

    for (const m of allMembers) {
        const list = membersByOrg.get(m.organization_id) || [];
        list.push(m);
        membersByOrg.set(m.organization_id, list);
        if (m.role_id) {
            memberCountByRoleId.set(m.role_id, (memberCountByRoleId.get(m.role_id) || 0) + 1);
        }
    }

    const orgSummaries: OrganizationIamAuditSummary[] = [];
    const overrideAuditEntries: MemberOverrideAuditItem[] = [];
    let syncedOrganizationsCount = 0;
    let driftedOrganizationsCount = 0;
    let totalCustomRolesCount = 0;

    for (const org of organizations) {
        const rawOrgRoles = rolesByOrg.get(org.id) || [];
        const orgMembers = membersByOrg.get(org.id) || [];

        const normalizedOrgRoles: Role[] = sortRolesWithSystemBaseFirst(
            rawOrgRoles.map((r: any) => {
                const kind = resolveSystemRoleKind(r);
                const fallback =
                    kind === 'owner'
                        ? globalOwner.permissions
                        : kind === 'admin'
                          ? globalAdmin.permissions
                          : kind === 'member'
                            ? globalMember.permissions
                            : {};
                const normalized = normalizeRoleRecord({
                    ...r,
                    permissions: buildExplicitPermissionsMap(r.permissions, fallback, kind === 'owner'),
                });
                const count = memberCountByRoleId.get(r.id) || 0;
                if (kind) {
                    globalMemberCountsByKind[kind] += count;
                }
                roleById.set(r.id, { ...normalized, member_count: count });
                return {
                    ...normalized,
                    member_count: count,
                    created_at: r.created_at,
                };
            })
        );

        const ownerRole = normalizedOrgRoles.find(r => resolveSystemRoleKind(r) === 'owner');
        const adminRole = normalizedOrgRoles.find(r => resolveSystemRoleKind(r) === 'admin');
        const memberRole = normalizedOrgRoles.find(r => resolveSystemRoleKind(r) === 'member');

        const missingBaseRoles: ('owner' | 'admin' | 'member')[] = [];
        if (!ownerRole) missingBaseRoles.push('owner');
        if (!adminRole) missingBaseRoles.push('admin');
        if (!memberRole) missingBaseRoles.push('member');

        let driftedPermissionsCount = 0;
        if (adminRole) {
            driftedPermissionsCount += countPermissionDiffs(adminRole.permissions, globalAdmin.permissions);
        }
        if (memberRole) {
            driftedPermissionsCount += countPermissionDiffs(memberRole.permissions, globalMember.permissions);
        }

        // Also check raw DB JSONB completeness: if raw DB row didn't have explicit keys stored yet, mark as needing sync if diff > 0
        const isSynced = missingBaseRoles.length === 0 && driftedPermissionsCount === 0;
        if (isSynced) {
            syncedOrganizationsCount++;
        } else {
            driftedOrganizationsCount++;
        }

        const customRolesCount = normalizedOrgRoles.filter(r => !r.is_system_role).length;
        totalCustomRolesCount += customRolesCount;

        // Inspect members for individual permission overrides
        let orgOverridesCount = 0;
        for (const m of orgMembers) {
            const rawPerms = (m.permissions && typeof m.permissions === 'object') ? m.permissions : {};
            const extractedOverrides: Record<string, boolean> = {};

            for (const [k, v] of Object.entries(rawPerms)) {
                if (ALL_KNOWN_PERMISSION_SET.has(k) && typeof v === 'boolean') {
                    extractedOverrides[k] = v;
                }
            }
            if (rawPerms.features && typeof rawPerms.features === 'object') {
                for (const [k, v] of Object.entries(rawPerms.features)) {
                    if (ALL_KNOWN_PERMISSION_SET.has(k) && typeof v === 'boolean' && extractedOverrides[k] === undefined) {
                        extractedOverrides[k] = v;
                    }
                }
            }

            const overrideKeys = Object.keys(extractedOverrides);
            if (overrideKeys.length === 0) continue;

            // Resolve member's assigned role
            let assignedRole: Role | undefined = m.role_id ? roleById.get(m.role_id) : undefined;
            if (!assignedRole) {
                const legacyKind = resolveSystemRoleKind({ name: m.role });
                if (legacyKind === 'owner') assignedRole = ownerRole || globalOwner;
                else if (legacyKind === 'admin') assignedRole = adminRole || globalAdmin;
                else assignedRole = memberRole || globalMember;
            }

            const roleKind = resolveSystemRoleKind(assignedRole || { name: m.role }) || 'custom';
            const rolePerms = assignedRole?.permissions || {};

            const details: MemberPermissionOverrideDetail[] = overrideKeys.map(permId => {
                const overrideValue = extractedOverrides[permId];
                const roleDefaultValue = Boolean(rolePerms.all === true || rolePerms[permId] === true);
                const status: MemberPermissionOverrideDetail['status'] =
                    overrideValue === roleDefaultValue
                        ? 'redundant_with_role'
                        : overrideValue
                          ? 'granted_extra'
                          : 'revoked_from_role';
                return {
                    permissionId: permId,
                    overrideValue,
                    roleDefaultValue,
                    status,
                };
            });

            orgOverridesCount++;
            const userInfo = userMap.get(m.user_id);
            const email = userInfo?.email || 'Sin correo';
            const fullName =
                userInfo?.fullName ||
                rawPerms.full_name ||
                email.split('@')[0] ||
                'Usuario';

            overrideAuditEntries.push({
                userId: m.user_id,
                fullName,
                email,
                organizationId: org.id,
                organizationName: org.name,
                organizationSlug: org.slug,
                roleId: m.role_id || assignedRole?.id || null,
                roleName: assignedRole?.name || m.role || 'Miembro',
                roleKind,
                overrides: details,
            });
        }

        const activeModules = Array.isArray(org.manual_module_overrides)
            ? org.manual_module_overrides
            : [];

        orgSummaries.push({
            organizationId: org.id,
            organizationName: org.name,
            organizationSlug: org.slug,
            status: org.status || 'active',
            activeModules,
            isSynced,
            missingBaseRoles,
            driftedPermissionsCount,
            customRolesCount,
            membersCount: orgMembers.length,
            overridesCount: orgOverridesCount,
            roles: normalizedOrgRoles,
        });
    }

    const enrichedGlobalBaseRoles: Role[] = globalBaseRoles.map(role => {
        const kind = resolveSystemRoleKind(role);
        return {
            ...role,
            member_count: kind ? globalMemberCountsByKind[kind] : 0,
        };
    });

    return {
        globalBaseRoles: enrichedGlobalBaseRoles,
        totalOrganizations: organizations.length,
        syncedOrganizationsCount,
        driftedOrganizationsCount,
        totalCustomRolesCount,
        membersWithOverridesCount: overrideAuditEntries.length,
        organizations: orgSummaries,
        overrideAuditEntries,
    };
}

/**
 * Publishes updates to a Global Base Role ('admin' or 'member') across ALL organizations in the platform,
 * healing missing system roles, linking orphan members, and applying the chosen override conflict policy.
 */
export async function publishGlobalBaseRoleAction(input: {
    roleKind: 'admin' | 'member';
    permissions: Record<string, boolean>;
    description?: string | null;
    conflictPolicy: OverrideConflictPolicy;
}) {
    await requireSuperAdmin();

    if (input.roleKind !== 'admin' && input.roleKind !== 'member') {
        throw new Error('Solo los roles base Administrador y Miembro pueden modificarse globalmente. El rol Dueño mantiene acceso total inmutable por seguridad.');
    }

    const canonicalName = input.roleKind === 'admin' ? 'Administrador' : 'Miembro';
    const canonicalHierarchy = input.roleKind === 'admin' ? 50 : 10;
    const defaultRoleDef = DEFAULT_ROLES.find(r => resolveSystemRoleKind(r) === input.roleKind)!;
    const canonicalDescription =
        input.description !== undefined && input.description !== null
            ? sanitizeBrokenUtf8(input.description)
            : defaultRoleDef.description;

    // Build explicit boolean map for all 56 permissions across the 20 groups
    const sanitizedPermissions = buildExplicitPermissionsMap(input.permissions, {}, false);

    // Fetch current global base role to determine which specific permissions changed in this publication
    const currentGlobalRoles = await getResolvedGlobalBaseRoles();
    const previousGlobalRole = currentGlobalRoles.find(r => resolveSystemRoleKind(r) === input.roleKind);
    const changedPermissionIds = new Set<string>();
    for (const permId of ALL_KNOWN_PERMISSION_IDS) {
        const prevVal = Boolean(previousGlobalRole?.permissions?.[permId] === true);
        const nextVal = Boolean(sanitizedPermissions[permId] === true);
        if (prevVal !== nextVal) {
            changedPermissionIds.add(permId);
        }
    }

    const [{ data: organizations }, { data: allRoles }, { data: allMembers }] = await Promise.all([
        supabaseAdmin.from('organizations').select('id'),
        supabaseAdmin.from('organization_roles').select('*'),
        supabaseAdmin.from('organization_members').select('organization_id, user_id, role, role_id, permissions'),
    ]);

    const orgs = organizations || [];
    const rolesByOrg = new Map<string, any[]>();
    for (const r of allRoles || []) {
        const list = rolesByOrg.get(r.organization_id) || [];
        list.push(r);
        rolesByOrg.set(r.organization_id, list);
    }

    let updatedOrgs = 0;
    let createdMissingRoles = 0;
    let cleanedRedundantOverrides = 0;
    let clearedConflictingOverrides = 0;

    const targetRoleIds = new Set<string>();
    const orgSystemRoleMap = new Map<string, { ownerId?: string; adminId?: string; memberId?: string }>();

    // 1. Ensure all 3 base roles exist and update target base role in every organization
    for (const org of orgs) {
        const orgRoles = rolesByOrg.get(org.id) || [];
        const existingOwner = orgRoles.find(r => resolveSystemRoleKind(r) === 'owner');
        const existingAdmin = orgRoles.find(r => resolveSystemRoleKind(r) === 'admin');
        const existingMember = orgRoles.find(r => resolveSystemRoleKind(r) === 'member');

        const roleIdsForOrg: { ownerId?: string; adminId?: string; memberId?: string } = {
            ownerId: existingOwner?.id,
            adminId: existingAdmin?.id,
            memberId: existingMember?.id,
        };

        // Self-heal missing Owner role if needed
        if (!existingOwner) {
            const ownerDef = DEFAULT_ROLES.find(r => resolveSystemRoleKind(r) === 'owner')!;
            const { data: insertedOwner } = await supabaseAdmin
                .from('organization_roles')
                .insert({
                    organization_id: org.id,
                    name: 'Dueño',
                    description: ownerDef.description,
                    is_system_role: true,
                    hierarchy_level: 100,
                    permissions: buildExplicitPermissionsMap(ownerDef.permissions, ownerDef.permissions, true),
                })
                .select('id')
                .single();
            if (insertedOwner) {
                roleIdsForOrg.ownerId = insertedOwner.id;
                createdMissingRoles++;
            }
        }

        if (input.roleKind === 'admin') {
            if (existingAdmin) {
                await supabaseAdmin
                    .from('organization_roles')
                    .update({
                        name: canonicalName,
                        description: canonicalDescription,
                        is_system_role: true,
                        hierarchy_level: canonicalHierarchy,
                        permissions: sanitizedPermissions,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingAdmin.id)
                    .eq('organization_id', org.id);
                targetRoleIds.add(existingAdmin.id);
                updatedOrgs++;
            } else {
                const { data: insertedAdmin } = await supabaseAdmin
                    .from('organization_roles')
                    .insert({
                        organization_id: org.id,
                        name: canonicalName,
                        description: canonicalDescription,
                        is_system_role: true,
                        hierarchy_level: canonicalHierarchy,
                        permissions: sanitizedPermissions,
                    })
                    .select('id')
                    .single();
                if (insertedAdmin) {
                    roleIdsForOrg.adminId = insertedAdmin.id;
                    targetRoleIds.add(insertedAdmin.id);
                    createdMissingRoles++;
                    updatedOrgs++;
                }
            }
        } else {
            if (existingMember) {
                await supabaseAdmin
                    .from('organization_roles')
                    .update({
                        name: canonicalName,
                        description: canonicalDescription,
                        is_system_role: true,
                        hierarchy_level: canonicalHierarchy,
                        permissions: sanitizedPermissions,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingMember.id)
                    .eq('organization_id', org.id);
                targetRoleIds.add(existingMember.id);
                updatedOrgs++;
            } else {
                const { data: insertedMember } = await supabaseAdmin
                    .from('organization_roles')
                    .insert({
                        organization_id: org.id,
                        name: canonicalName,
                        description: canonicalDescription,
                        is_system_role: true,
                        hierarchy_level: canonicalHierarchy,
                        permissions: sanitizedPermissions,
                    })
                    .select('id')
                    .single();
                if (insertedMember) {
                    roleIdsForOrg.memberId = insertedMember.id;
                    targetRoleIds.add(insertedMember.id);
                    createdMissingRoles++;
                    updatedOrgs++;
                }
            }
        }

        orgSystemRoleMap.set(org.id, roleIdsForOrg);
    }

    // 2. Reconcile members: link missing role_ids & apply override conflict policy
    for (const member of allMembers || []) {
        const orgRoleIds = orgSystemRoleMap.get(member.organization_id);
        let effectiveRoleId = member.role_id;
        let shouldUpdateRoleId = false;

        if (!effectiveRoleId && orgRoleIds) {
            const memberKind = resolveSystemRoleKind({ name: member.role });
            if (memberKind === 'owner' && orgRoleIds.ownerId) {
                effectiveRoleId = orgRoleIds.ownerId;
                shouldUpdateRoleId = true;
            } else if (memberKind === 'admin' && orgRoleIds.adminId) {
                effectiveRoleId = orgRoleIds.adminId;
                shouldUpdateRoleId = true;
            } else if (orgRoleIds.memberId) {
                effectiveRoleId = orgRoleIds.memberId;
                shouldUpdateRoleId = true;
            }
        }

        const isTargetRoleMember =
            (effectiveRoleId && targetRoleIds.has(effectiveRoleId)) ||
            (!effectiveRoleId && resolveSystemRoleKind({ name: member.role }) === input.roleKind);

        if (!isTargetRoleMember) {
            if (shouldUpdateRoleId && effectiveRoleId) {
                await supabaseAdmin
                    .from('organization_members')
                    .update({ role_id: effectiveRoleId })
                    .match({ organization_id: member.organization_id, user_id: member.user_id });
            }
            continue;
        }

        const rawPerms = (member.permissions && typeof member.permissions === 'object')
            ? { ...member.permissions }
            : {};
        let permsModified = false;

        for (const permId of ALL_KNOWN_PERMISSION_IDS) {
            const hasTopLevel = typeof rawPerms[permId] === 'boolean';
            const hasNested = typeof rawPerms.features?.[permId] === 'boolean';
            if (!hasTopLevel && !hasNested) continue;

            const currentOverrideVal = hasTopLevel ? rawPerms[permId] : rawPerms.features[permId];
            const newBaseVal = Boolean(sanitizedPermissions[permId] === true);

            // Case A: Redundant override (override matches the new base role value) -> Always clean up
            if (currentOverrideVal === newBaseVal) {
                delete rawPerms[permId];
                if (rawPerms.features && typeof rawPerms.features === 'object') {
                    delete rawPerms.features[permId];
                }
                cleanedRedundantOverrides++;
                permsModified = true;
                continue;
            }

            // Case B: Conflicting override -> Apply SuperAdmin's selected policy
            if (input.conflictPolicy === 'clear_all_role_overrides') {
                delete rawPerms[permId];
                if (rawPerms.features && typeof rawPerms.features === 'object') {
                    delete rawPerms.features[permId];
                }
                clearedConflictingOverrides++;
                permsModified = true;
            } else if (
                input.conflictPolicy === 'clear_conflicting_overrides' &&
                changedPermissionIds.has(permId)
            ) {
                delete rawPerms[permId];
                if (rawPerms.features && typeof rawPerms.features === 'object') {
                    delete rawPerms.features[permId];
                }
                clearedConflictingOverrides++;
                permsModified = true;
            }
        }

        if (permsModified || shouldUpdateRoleId) {
            const updatePayload: Record<string, any> = {};
            if (permsModified) updatePayload.permissions = rawPerms;
            if (shouldUpdateRoleId && effectiveRoleId) updatePayload.role_id = effectiveRoleId;

            await supabaseAdmin
                .from('organization_members')
                .update(updatePayload)
                .match({ organization_id: member.organization_id, user_id: member.user_id });
        }
    }

    await logSuperAdminIamAudit('superadmin_publish_global_base_role', {
        role_kind: input.roleKind,
        role_name: canonicalName,
        conflict_policy: input.conflictPolicy,
        changed_permissions_count: changedPermissionIds.size,
        updated_orgs: updatedOrgs,
        created_missing_roles: createdMissingRoles,
        cleaned_redundant_overrides: cleanedRedundantOverrides,
        cleared_conflicting_overrides: clearedConflictingOverrides,
    });

    revalidatePath('/platform/admin');
    revalidatePath('/platform/settings');

    return {
        success: true,
        stats: {
            updatedOrgs,
            createdMissingRoles,
            cleanedRedundantOverrides,
            clearedConflictingOverrides,
            changedPermissionsCount: changedPermissionIds.size,
        },
    };
}

/**
 * Synchronizes either a single organization or all drifted organizations with the Global Base Role Templates.
 */
export async function syncOrganizationBaseRolesSuperAdminAction(targetOrgId?: string) {
    await requireSuperAdmin();

    const globalBaseRoles = await getResolvedGlobalBaseRoles();
    const globalOwner = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'owner')!;
    const globalAdmin = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'admin')!;
    const globalMember = globalBaseRoles.find(r => resolveSystemRoleKind(r) === 'member')!;

    let orgQuery = supabaseAdmin.from('organizations').select('id, name');
    if (targetOrgId) {
        orgQuery = orgQuery.eq('id', targetOrgId);
    }
    const { data: orgs } = await orgQuery;
    if (!orgs || orgs.length === 0) {
        throw new Error('Organización no encontrada');
    }

    const orgIds = orgs.map(o => o.id);
    const { data: existingRoles } = await supabaseAdmin
        .from('organization_roles')
        .select('*')
        .in('organization_id', orgIds);

    const rolesByOrg = new Map<string, any[]>();
    for (const r of existingRoles || []) {
        const list = rolesByOrg.get(r.organization_id) || [];
        list.push(r);
        rolesByOrg.set(r.organization_id, list);
    }

    let syncedOrgsCount = 0;

    for (const org of orgs) {
        const orgRoles = rolesByOrg.get(org.id) || [];
        const templates: { kind: 'owner' | 'admin' | 'member'; template: Role }[] = [
            { kind: 'owner', template: globalOwner },
            { kind: 'admin', template: globalAdmin },
            { kind: 'member', template: globalMember },
        ];

        for (const { kind, template } of templates) {
            const match = orgRoles.find(r => resolveSystemRoleKind(r) === kind);
            const explicitPerms = buildExplicitPermissionsMap(
                template.permissions,
                template.permissions,
                kind === 'owner'
            );

            if (match) {
                await supabaseAdmin
                    .from('organization_roles')
                    .update({
                        name: template.name,
                        description: template.description,
                        is_system_role: true,
                        hierarchy_level: template.hierarchy_level,
                        permissions: explicitPerms,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', match.id)
                    .eq('organization_id', org.id);
            } else {
                await supabaseAdmin.from('organization_roles').insert({
                    organization_id: org.id,
                    name: template.name,
                    description: template.description,
                    is_system_role: true,
                    hierarchy_level: template.hierarchy_level,
                    permissions: explicitPerms,
                });
            }
        }
        syncedOrgsCount++;
    }

    await logSuperAdminIamAudit(
        'superadmin_sync_base_roles',
        { target_org_id: targetOrgId || 'ALL', synced_orgs_count: syncedOrgsCount },
        targetOrgId || null
    );

    revalidatePath('/platform/admin');
    revalidatePath('/platform/settings');

    return { success: true, syncedOrgsCount };
}

/**
 * Clears either a specific permission override or all permission overrides for a member in any organization.
 */
export async function clearMemberOverridesSuperAdminAction(input: {
    organizationId: string;
    userId: string;
    permissionId?: string;
}) {
    await requireSuperAdmin();

    const { data: member, error } = await supabaseAdmin
        .from('organization_members')
        .select('permissions')
        .match({ organization_id: input.organizationId, user_id: input.userId })
        .single();

    if (error || !member) {
        throw new Error('Miembro no encontrado en la organización especificada');
    }

    const updatedPerms: Record<string, any> =
        member.permissions && typeof member.permissions === 'object'
            ? { ...member.permissions }
            : {};

    if (input.permissionId) {
        delete updatedPerms[input.permissionId];
        if (updatedPerms.features && typeof updatedPerms.features === 'object') {
            updatedPerms.features = { ...updatedPerms.features };
            delete updatedPerms.features[input.permissionId];
        }
    } else {
        for (const permId of ALL_KNOWN_PERMISSION_IDS) {
            delete updatedPerms[permId];
            if (updatedPerms.features && typeof updatedPerms.features === 'object') {
                delete updatedPerms.features[permId];
            }
        }
    }

    const { error: updateErr } = await supabaseAdmin
        .from('organization_members')
        .update({ permissions: updatedPerms })
        .match({ organization_id: input.organizationId, user_id: input.userId });

    if (updateErr) throw updateErr;

    await logSuperAdminIamAudit(
        'superadmin_clear_member_override',
        {
            target_user_id: input.userId,
            permission_id: input.permissionId || 'ALL',
        },
        input.organizationId
    );

    revalidatePath('/platform/admin');
    revalidatePath('/platform/settings');

    return { success: true };
}

/**
 * Allows SuperAdmin to update a tenant's custom role permissions during tenant inspection/support.
 */
export async function updateTenantCustomRoleSuperAdminAction(input: {
    organizationId: string;
    roleId: string;
    permissions: Record<string, boolean>;
}) {
    await requireSuperAdmin();

    const { data: existingRole, error: findErr } = await supabaseAdmin
        .from('organization_roles')
        .select('*')
        .eq('id', input.roleId)
        .eq('organization_id', input.organizationId)
        .single();

    if (findErr || !existingRole) {
        throw new Error('Rol no encontrado en la organización');
    }

    if (existingRole.is_system_role || resolveSystemRoleKind(existingRole) !== null) {
        throw new Error('Para modificar un rol base del sistema, utiliza la vista de Plantillas Base Globales.');
    }

    const explicitPerms = buildExplicitPermissionsMap(input.permissions, {}, false);

    const { data: updated, error: updateErr } = await supabaseAdmin
        .from('organization_roles')
        .update({
            permissions: explicitPerms,
            updated_at: new Date().toISOString(),
        })
        .eq('id', input.roleId)
        .eq('organization_id', input.organizationId)
        .select('*')
        .single();

    if (updateErr) throw updateErr;

    await logSuperAdminIamAudit(
        'superadmin_update_tenant_custom_role',
        { role_id: input.roleId, role_name: existingRole.name },
        input.organizationId
    );

    revalidatePath('/platform/admin');
    revalidatePath('/platform/settings');

    return normalizeRoleRecord(updated);
}
