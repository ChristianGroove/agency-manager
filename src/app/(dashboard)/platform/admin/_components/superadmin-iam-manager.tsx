'use client';

import { useState, useMemo } from 'react';
import {
    type SuperAdminIamOverview,
    type OverrideConflictPolicy,
    getSuperAdminIamOverview,
    publishGlobalBaseRoleAction,
    syncOrganizationBaseRolesSuperAdminAction,
    clearMemberOverridesSuperAdminAction,
    updateTenantCustomRoleSuperAdminAction,
} from '@/modules/core/iam/actions/superadmin-iam-actions';
import {
    PERMISSION_GROUPS,
    normalizeRoleRecord,
    resolveSystemRoleKind,
    sortRolesWithSystemBaseFirst,
} from '@/modules/core/iam/actions/permissions';
import type { Role } from '@/modules/core/iam/services/role-service';
import { RoleEditor, getHydratedPermissions } from '@/modules/core/iam/components/role-editor';
import { getHierarchyKey } from '@/modules/core/iam/components/role-manager';
import { useLocalizedIam } from '@/modules/core/iam/actions/use-localized-iam';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Shield,
    Lock,
    Globe,
    Building2,
    Users,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Search,
    RotateCcw,
    Info,
    Layers,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';
import { toast } from 'sonner';

interface SuperAdminIamManagerProps {
    initialOverview: SuperAdminIamOverview;
}

type ViewMode = 'global_templates' | 'tenant_audit' | 'overrides_audit';

export function SuperAdminIamManager({ initialOverview }: SuperAdminIamManagerProps) {
    const { t, getRoleInfo, getPermissionInfo, getGroupInfo } = useLocalizedIam();
    const [overview, setOverview] = useState<SuperAdminIamOverview>(initialOverview);
    const [viewMode, setViewMode] = useState<ViewMode>('global_templates');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSyncingNetwork, setIsSyncingNetwork] = useState(false);

    // 1. Global Templates Mode State
    const [selectedGlobalRoleId, setSelectedGlobalRoleId] = useState<string>(
        initialOverview.globalBaseRoles[1]?.id || initialOverview.globalBaseRoles[0]?.id || ''
    );
    const [pendingPublish, setPendingPublish] = useState<{
        role: Role;
        roleKind: 'admin' | 'member';
        nextPermissions: Record<string, boolean>;
        addedPermissions: string[];
        removedPermissions: string[];
        affectedMembersWithOverridesCount: number;
    } | null>(null);
    const [conflictPolicy, setConflictPolicy] = useState<OverrideConflictPolicy>('preserve_overrides');
    const [isPublishingGlobal, setIsPublishingGlobal] = useState(false);

    // 2. Tenant Audit Mode State
    const [selectedOrgId, setSelectedOrgId] = useState<string>(
        initialOverview.organizations[0]?.organizationId || ''
    );
    const [tenantSelectedRoleId, setTenantSelectedRoleId] = useState<string>('');
    const [showOnlyTenantContractedModules, setShowOnlyTenantContractedModules] = useState<boolean>(false);
    const [isSyncingSingleOrg, setIsSyncingSingleOrg] = useState(false);

    // 3. Overrides Audit Mode State
    const [overrideSearch, setOverrideSearch] = useState('');
    const [overrideFilter, setOverrideFilter] = useState<'all' | 'granted_extra' | 'revoked_from_role' | 'redundant_with_role'>('all');
    const [clearingOverrideKey, setClearingOverrideKey] = useState<string | null>(null);

    // Lookup dictionary for permission metadata
    const permissionMetaMap = useMemo(() => {
        const map = new Map<string, { label: string; groupLabel: string }>();
        for (const group of PERMISSION_GROUPS) {
            const gInfo = getGroupInfo(group);
            for (const perm of group.permissions) {
                const pInfo = getPermissionInfo(perm);
                map.set(perm.id, {
                    label: pInfo.label,
                    groupLabel: gInfo.label,
                });
            }
        }
        return map;
    }, [getGroupInfo, getPermissionInfo]);

    const handleRefreshOverview = async () => {
        setIsRefreshing(true);
        try {
            const fresh = await getSuperAdminIamOverview();
            setOverview(fresh);
        } catch (error: any) {
            toast.error(error?.message || 'Error al actualizar el estado de IAM');
        } finally {
            setIsRefreshing(false);
        }
    };

    const sortedGlobalRoles = useMemo(
        () => sortRolesWithSystemBaseFirst(overview.globalBaseRoles.map(normalizeRoleRecord)),
        [overview.globalBaseRoles]
    );

    const activeGlobalRole = useMemo(
        () => sortedGlobalRoles.find(r => r.id === selectedGlobalRoleId) || sortedGlobalRoles[0],
        [sortedGlobalRoles, selectedGlobalRoleId]
    );

    const selectedOrg = useMemo(
        () => overview.organizations.find(o => o.organizationId === selectedOrgId) || overview.organizations[0],
        [overview.organizations, selectedOrgId]
    );

    const sortedTenantRoles = useMemo(() => {
        if (!selectedOrg) return [];
        return sortRolesWithSystemBaseFirst(selectedOrg.roles.map(normalizeRoleRecord));
    }, [selectedOrg]);

    const activeTenantRole = useMemo(() => {
        if (sortedTenantRoles.length === 0) return null;
        return sortedTenantRoles.find(r => r.id === tenantSelectedRoleId) || sortedTenantRoles[0];
    }, [sortedTenantRoles, tenantSelectedRoleId]);

    // Prepare Global Publish Confirmation Modal with full diff
    const handleRequestGlobalPublish = async (nextPermissions: Record<string, boolean>, role: Role) => {
        const kind = resolveSystemRoleKind(role);
        if (kind !== 'admin' && kind !== 'member') {
            toast.error('El rol Dueño posee acceso total inmutable por seguridad.');
            return;
        }

        const currentPerms = getHydratedPermissions(role);
        const added: string[] = [];
        const removed: string[] = [];

        for (const group of PERMISSION_GROUPS) {
            for (const perm of group.permissions) {
                const wasEnabled = Boolean(currentPerms[perm.id] === true);
                const isNowEnabled = Boolean(nextPermissions[perm.id] === true);
                if (!wasEnabled && isNowEnabled) {
                    added.push(perm.id);
                } else if (wasEnabled && !isNowEnabled) {
                    removed.push(perm.id);
                }
            }
        }

        const changedSet = new Set([...added, ...removed]);
        const affectedMembers = overview.overrideAuditEntries.filter(
            entry =>
                entry.roleKind === kind &&
                entry.overrides.some(o => changedSet.has(o.permissionId))
        ).length;

        setConflictPolicy('preserve_overrides');
        setPendingPublish({
            role,
            roleKind: kind,
            nextPermissions,
            addedPermissions: added,
            removedPermissions: removed,
            affectedMembersWithOverridesCount: affectedMembers,
        });
    };

    const handleConfirmGlobalPublish = async () => {
        if (!pendingPublish) return;
        setIsPublishingGlobal(true);
        try {
            const res = await publishGlobalBaseRoleAction({
                roleKind: pendingPublish.roleKind,
                permissions: pendingPublish.nextPermissions,
                description: pendingPublish.role.description,
                conflictPolicy,
            });

            if (res.success) {
                toast.success(
                    `Plantilla global "${getRoleInfo(pendingPublish.role).name}" publicada en ${res.stats.updatedOrgs} organizaciones`
                );
                setPendingPublish(null);
                await handleRefreshOverview();
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al publicar plantilla global');
        } finally {
            setIsPublishingGlobal(false);
        }
    };

    const handleSyncEntireNetwork = async () => {
        setIsSyncingNetwork(true);
        try {
            const res = await syncOrganizationBaseRolesSuperAdminAction();
            if (res.success) {
                toast.success(`Red sincronizada: ${res.syncedOrgsCount} organizaciones alineadas con las plantillas base.`);
                await handleRefreshOverview();
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al sincronizar la red');
        } finally {
            setIsSyncingNetwork(false);
        }
    };

    const handleSyncSingleOrg = async (orgId: string) => {
        setIsSyncingSingleOrg(true);
        try {
            const res = await syncOrganizationBaseRolesSuperAdminAction(orgId);
            if (res.success) {
                toast.success('Roles base de la organización sincronizados con el estándar global');
                await handleRefreshOverview();
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al sincronizar la organización');
        } finally {
            setIsSyncingSingleOrg(false);
        }
    };

    const handleSaveTenantCustomRole = async (nextPermissions: Record<string, boolean>, role: Role) => {
        if (!selectedOrg) return;
        const updated = await updateTenantCustomRoleSuperAdminAction({
            organizationId: selectedOrg.organizationId,
            roleId: role.id,
            permissions: nextPermissions,
        });
        toast.success(`Rol personalizado "${updated.name}" actualizado en ${selectedOrg.organizationName}`);
        await handleRefreshOverview();
    };

    const handleClearOverride = async (organizationId: string, userId: string, permissionId?: string) => {
        const key = `${organizationId}:${userId}:${permissionId || 'ALL'}`;
        setClearingOverrideKey(key);
        try {
            await clearMemberOverridesSuperAdminAction({
                organizationId,
                userId,
                permissionId,
            });
            toast.success(
                permissionId
                    ? 'Excepción individual eliminada; el usuario vuelve a heredar el permiso del rol'
                    : 'Todas las excepciones del usuario fueron restablecidas al rol base'
            );
            await handleRefreshOverview();
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo restablecer la excepción');
        } finally {
            setClearingOverrideKey(null);
        }
    };

    const filteredOverrideEntries = useMemo(() => {
        const q = overrideSearch.toLowerCase().trim();
        return overview.overrideAuditEntries
            .map(entry => {
                const matchingOverrides =
                    overrideFilter === 'all'
                        ? entry.overrides
                        : entry.overrides.filter(o => o.status === overrideFilter);
                return {
                    ...entry,
                    overrides: matchingOverrides,
                };
            })
            .filter(entry => {
                if (entry.overrides.length === 0) return false;
                if (!q) return true;
                return (
                    entry.fullName.toLowerCase().includes(q) ||
                    entry.email.toLowerCase().includes(q) ||
                    entry.organizationName.toLowerCase().includes(q) ||
                    entry.roleName.toLowerCase().includes(q) ||
                    entry.overrides.some(o => {
                        const meta = permissionMetaMap.get(o.permissionId);
                        return (
                            o.permissionId.toLowerCase().includes(q) ||
                            meta?.label.toLowerCase().includes(q) ||
                            meta?.groupLabel.toLowerCase().includes(q)
                        );
                    })
                );
            });
    }, [overview.overrideAuditEntries, overrideSearch, overrideFilter, permissionMetaMap]);

    return (
        <div className="space-y-6">
            {/* Header & KPI Governance Strip */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
                            <Shield className="h-5 w-5 text-brand-pink" />
                            Gobernanza Global de Roles y Permisos (IAM V2)
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Administra los permisos estándar de los 3 roles base de toda la plataforma, propaga cambios a la red y audita excepciones individuales por tenant.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {overview.driftedOrganizationsCount > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSyncEntireNetwork}
                                disabled={isSyncingNetwork}
                                className="h-9 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                            >
                                {isSyncingNetwork ? (
                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Sincronizar Red ({overview.driftedOrganizationsCount} con desfase)
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRefreshOverview}
                            disabled={isRefreshing}
                            className="h-9 text-xs gap-1.5"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                            Actualizar Auditoría
                        </Button>
                    </div>
                </div>

                {/* 4 Interactive KPI Filter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div
                        onClick={() => setViewMode('global_templates')}
                        className={cn(
                            "glass-card cursor-pointer rounded-2xl p-4 border transition-all backdrop-blur-xl",
                            viewMode === 'global_templates'
                                ? "bg-white/90 dark:bg-zinc-800/80 border-brand-pink/50 ring-1 ring-brand-pink/40 shadow-sm"
                                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/60"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Plantillas Base Globales</span>
                            <Globe className="h-4 w-4 text-brand-pink" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">3 Roles Maestros</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Dueño (100) • Admin (50) • Miembro (10)
                        </p>
                    </div>

                    <div
                        onClick={() => setViewMode('tenant_audit')}
                        className={cn(
                            "glass-card cursor-pointer rounded-2xl p-4 border transition-all backdrop-blur-xl",
                            viewMode === 'tenant_audit'
                                ? "bg-white/90 dark:bg-zinc-800/80 border-brand-pink/50 ring-1 ring-brand-pink/40 shadow-sm"
                                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/60"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Sincronización de Tenants</span>
                            {overview.driftedOrganizationsCount === 0 ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )}
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {overview.syncedOrganizationsCount} / {overview.totalOrganizations} Orgs
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {overview.driftedOrganizationsCount === 0
                                ? '100% alineadas con la plantilla global'
                                : `${overview.driftedOrganizationsCount} org(s) con diferencias o roles por reparar`}
                        </p>
                    </div>

                    <div
                        onClick={() => setViewMode('tenant_audit')}
                        className={cn(
                            "glass-card cursor-pointer rounded-2xl p-4 border transition-all backdrop-blur-xl",
                            "bg-white/60 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/60"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Roles Personalizados</span>
                            <Layers className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {overview.totalCustomRolesCount}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Creados a medida por las organizaciones
                        </p>
                    </div>

                    <div
                        onClick={() => setViewMode('overrides_audit')}
                        className={cn(
                            "glass-card cursor-pointer rounded-2xl p-4 border transition-all backdrop-blur-xl",
                            viewMode === 'overrides_audit'
                                ? "bg-white/90 dark:bg-zinc-800/80 border-brand-pink/50 ring-1 ring-brand-pink/40 shadow-sm"
                                : "bg-white/60 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-white/10 hover:bg-white/80 dark:hover:bg-zinc-800/60"
                        )}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Usuarios con Overrides</span>
                            <Users className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                            {overview.membersWithOverridesCount}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Excepciones individuales sobre su rol base
                        </p>
                    </div>
                </div>

                {/* Mode Selector Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                        size="sm"
                        variant={viewMode === 'global_templates' ? 'default' : 'outline'}
                        onClick={() => setViewMode('global_templates')}
                        className={cn(
                            "h-9 text-xs font-semibold rounded-xl gap-2",
                            viewMode === 'global_templates' && "bg-brand-pink hover:bg-brand-pink/90 text-white"
                        )}
                    >
                        <Globe className="h-3.5 w-3.5" />
                        1. Plantillas Base Globales (Estándar SaaS)
                    </Button>
                    <Button
                        size="sm"
                        variant={viewMode === 'tenant_audit' ? 'default' : 'outline'}
                        onClick={() => setViewMode('tenant_audit')}
                        className={cn(
                            "h-9 text-xs font-semibold rounded-xl gap-2",
                            viewMode === 'tenant_audit' && "bg-brand-pink hover:bg-brand-pink/90 text-white"
                        )}
                    >
                        <Building2 className="h-3.5 w-3.5" />
                        2. Auditoría e Inspección por Tenant ({overview.totalOrganizations})
                    </Button>
                    <Button
                        size="sm"
                        variant={viewMode === 'overrides_audit' ? 'default' : 'outline'}
                        onClick={() => setViewMode('overrides_audit')}
                        className={cn(
                            "h-9 text-xs font-semibold rounded-xl gap-2",
                            viewMode === 'overrides_audit' && "bg-brand-pink hover:bg-brand-pink/90 text-white"
                        )}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        3. Auditoría de Overrides y Reglas de Herencia ({overview.membersWithOverridesCount})
                    </Button>
                </div>
            </div>

            {/* ================================================================= */}
            {/* VIEW 1: GLOBAL BASE ROLE TEMPLATES (SUPERADMIN MASTER EDITOR)     */}
            {/* ================================================================= */}
            {viewMode === 'global_templates' && (
                <div className="w-full space-y-4">
                    {/* Top Selector Bar: Identical structure to RoleManager with the 3 base roles pinned left */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-1">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                            {sortedGlobalRoles.map(role => {
                                const isSelected = activeGlobalRole?.id === role.id;
                                const kind = resolveSystemRoleKind(role);
                                const isImmutableOwner = kind === 'owner';

                                return (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedGlobalRoleId(role.id)}
                                        className={cn(
                                            "glass-card group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-all border shrink-0 select-none backdrop-blur-xl",
                                            isSelected
                                                ? "bg-white/90 dark:bg-zinc-800/80 text-brand-pink border-brand-pink/50 shadow-xs ring-1 ring-brand-pink/50 font-semibold"
                                                : "bg-white/60 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-zinc-800/60 border-zinc-200/80 dark:border-white/10 shadow-2xs font-medium"
                                        )}
                                    >
                                        <span className="font-semibold">{getRoleInfo(role).name}</span>
                                        {isImmutableOwner ? (
                                            <Lock className={cn("h-3 w-3 shrink-0", isSelected ? "text-brand-pink" : "text-muted-foreground/60")} />
                                        ) : (
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] px-1.5 py-0 h-4 leading-none shrink-0 font-normal",
                                                    isSelected
                                                        ? "border-brand-pink/30 text-brand-pink bg-brand-pink/5"
                                                        : "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                                                )}
                                            >
                                                Editable Global
                                            </Badge>
                                        )}
                                        <span
                                            title="Total de miembros con este rol en toda la red"
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0",
                                                isSelected
                                                    ? "bg-brand-pink/10 text-brand-pink font-semibold"
                                                    : "bg-zinc-100/80 dark:bg-white/5 text-muted-foreground"
                                            )}
                                        >
                                            {role.member_count || 0} en red
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                            <Sparkles className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                            <span>
                                En las organizaciones los 3 roles base están bloqueados (`🔒`). Solo desde aquí (SuperAdmin) puedes modificar y publicar sus permisos estándar.
                            </span>
                        </div>
                    </div>

                    {activeGlobalRole && (
                        <RoleEditor
                            key={`global-${activeGlobalRole.id}-${JSON.stringify(activeGlobalRole.permissions)}`}
                            role={activeGlobalRole}
                            activeModules={undefined} // SuperAdmin sees all 20 platform permission groups across all Spaces
                            allowSystemRoleEdit={true}
                            saveButtonLabel="Guardar y Publicar Globalmente"
                            customSaveHandler={handleRequestGlobalPublish}
                            onUpdate={() => {}}
                        />
                    )}
                </div>
            )}

            {/* ================================================================= */}
            {/* VIEW 2: MULTI-TENANT AUDIT & INSPECTION                           */}
            {/* ================================================================= */}
            {viewMode === 'tenant_audit' && (
                <div className="w-full space-y-4">
                    {/* Organization Selector Bar */}
                    <div className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                            <div className="min-w-[260px] sm:w-80">
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                                    Organización a Inspeccionar / Auditar
                                </label>
                                <Select
                                    value={selectedOrg?.organizationId || ''}
                                    onValueChange={(val) => {
                                        setSelectedOrgId(val);
                                        const nextOrg = overview.organizations.find(o => o.organizationId === val);
                                        if (nextOrg?.roles?.[0]) {
                                            setTenantSelectedRoleId(nextOrg.roles[0].id);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Selecciona una organización" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {overview.organizations.map(org => (
                                            <SelectItem key={org.organizationId} value={org.organizationId}>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-semibold">{org.organizationName}</span>
                                                    <span className="text-muted-foreground font-mono text-[10px]">({org.organizationSlug})</span>
                                                    {!org.isSynced && (
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-amber-500/40 text-amber-600">
                                                            Desfase
                                                        </Badge>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedOrg && (
                                <div className="flex flex-wrap items-center gap-2 pt-3 sm:pt-4">
                                    {selectedOrg.isSynced ? (
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 text-xs py-1">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Sincronizado con Estándar Global
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-xs py-1">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            {selectedOrg.missingBaseRoles.length > 0
                                                ? `Faltan roles base: ${selectedOrg.missingBaseRoles.join(', ')}`
                                                : `${selectedOrg.driftedPermissionsCount} permiso(s) difieren de la plantilla global`}
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                        {selectedOrg.membersCount} miembro(s)
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                        {selectedOrg.customRolesCount} rol(es) custom
                                    </Badge>
                                    {selectedOrg.overridesCount > 0 && (
                                        <Badge
                                            variant="outline"
                                            onClick={() => {
                                                setOverrideSearch(selectedOrg.organizationName);
                                                setViewMode('overrides_audit');
                                            }}
                                            className="cursor-pointer border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 text-xs hover:bg-amber-500/10"
                                        >
                                            {selectedOrg.overridesCount} usuario(s) con overrides →
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </div>

                        {selectedOrg && (
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    size="sm"
                                    variant={showOnlyTenantContractedModules ? 'default' : 'outline'}
                                    onClick={() => setShowOnlyTenantContractedModules(prev => !prev)}
                                    className="h-8 text-xs"
                                >
                                    {showOnlyTenantContractedModules
                                        ? 'Viendo solo módulos contratados del tenant'
                                        : 'Viendo todos los módulos (20 grupos)'}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSyncSingleOrg(selectedOrg.organizationId)}
                                    disabled={isSyncingSingleOrg}
                                    className="h-8 text-xs gap-1.5 border-brand-pink/30 text-brand-pink hover:bg-brand-pink/10"
                                >
                                    {isSyncingSingleOrg ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    )}
                                    Sincronizar Roles Base
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Tenant Roles Pill Bar (Base Roles on Left, Custom Roles on Right) */}
                    {selectedOrg && (
                        <>
                            <div className="flex flex-wrap items-center gap-2.5 p-1">
                                {sortedTenantRoles.map(role => {
                                    const isSelected = activeTenantRole?.id === role.id;
                                    const hierarchyText = t(('settings.roles.hierarchy_' + getHierarchyKey(role.hierarchy_level)) as any);

                                    return (
                                        <div
                                            key={role.id}
                                            onClick={() => setTenantSelectedRoleId(role.id)}
                                            className={cn(
                                                "glass-card group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs cursor-pointer transition-all border shrink-0 select-none backdrop-blur-xl",
                                                isSelected
                                                    ? "bg-white/90 dark:bg-zinc-800/80 text-brand-pink border-brand-pink/50 shadow-xs ring-1 ring-brand-pink/50 font-semibold"
                                                    : "bg-white/60 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-zinc-800/60 border-zinc-200/80 dark:border-white/10 shadow-2xs font-medium"
                                            )}
                                        >
                                            <span className="font-semibold">{getRoleInfo(role).name}</span>
                                            {role.is_system_role ? (
                                                <Lock className={cn("h-3 w-3 shrink-0", isSelected ? "text-brand-pink" : "text-muted-foreground/60")} />
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-0 h-4 leading-none shrink-0 font-normal",
                                                        isSelected
                                                            ? "border-brand-pink/30 text-brand-pink bg-brand-pink/5"
                                                            : "border-zinc-200/70 dark:border-white/10 text-muted-foreground bg-white/40 dark:bg-white/5"
                                                    )}
                                                >
                                                    {hierarchyText}
                                                </Badge>
                                            )}
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full font-mono shrink-0",
                                                isSelected
                                                    ? "bg-brand-pink/10 text-brand-pink font-semibold"
                                                    : "bg-zinc-100/80 dark:bg-white/5 text-muted-foreground"
                                            )}>
                                                {role.member_count || 0}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {activeTenantRole ? (
                                <RoleEditor
                                    key={`tenant-${activeTenantRole.id}-${showOnlyTenantContractedModules ? 'filtered' : 'all'}`}
                                    role={activeTenantRole}
                                    activeModules={
                                        showOnlyTenantContractedModules && selectedOrg.activeModules.length > 0
                                            ? selectedOrg.activeModules
                                            : undefined
                                    }
                                    allowSystemRoleEdit={false} // Base roles are edited via Tab 1 (Global Templates); custom tenant roles are editable here
                                    customSaveHandler={
                                        !activeTenantRole.is_system_role ? handleSaveTenantCustomRole : undefined
                                    }
                                    onUpdate={() => {}}
                                />
                            ) : (
                                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-muted-foreground text-sm">
                                    Esta organización aún no tiene roles registrados. Usa "Sincronizar Roles Base" para repararla.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ================================================================= */}
            {/* VIEW 3: USER OVERRIDES AUDIT & INHERITANCE PRECEDENCE RULES       */}
            {/* ================================================================= */}
            {viewMode === 'overrides_audit' && (
                <div className="space-y-4">
                    {/* Precedence & Propagation Rules Reference Card */}
                    <div className="glass-card rounded-2xl p-4 border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-xl">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                                <Info className="h-4 w-4" />
                            </div>
                            <div className="space-y-2 text-xs">
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                                    Arquitectura de Precedencia y Reglas de Propagación Global (IAM V2)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                                    <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-white/10">
                                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                            1. Precedencia en Tiempo de Ejecución
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            El motor evalúa en orden estricto: <strong>Capa 0: Dueño (Wildcard 100)</strong> → <strong>Capa 1: Override Individual del Usuario</strong> (`true` concede extra, `false` revoca) → <strong>Capa 2: Permiso del Rol Asignado</strong> (`Base` o `Personalizado`).
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-white/10">
                                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                            2. ¿Qué pasa al Publicar un Rol Base Globalmente?
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            • <strong>Usuarios sin override</strong> heredan el cambio al instante.<br />
                                            • <strong>Overrides redundantes</strong> (donde la excepción ya coincide con el nuevo valor del rol base) se limpian solos.<br />
                                            • <strong>Overrides en conflicto</strong> se preservan o se limpian según la política que elijas al publicar.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/60 dark:border-white/10">
                                        <div className="font-semibold text-gray-900 dark:text-white mb-1">
                                            3. ¿Qué pasa con Roles Personalizados?
                                        </div>
                                        <p className="text-muted-foreground leading-relaxed">
                                            Los roles custom (`is_system_role = false`) de cada cliente se mantienen intactos al publicar cambios a los 3 roles base. Cuando un cliente cree un nuevo rol basado en plantilla <em>Admin</em> o <em>Miembro</em>, tomará tu nueva plantilla global.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/80 dark:border-white/10">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="search"
                                value={overrideSearch}
                                onChange={(e) => setOverrideSearch(e.target.value)}
                                placeholder="Buscar por miembro, correo, organización o permiso..."
                                className="pl-8 h-8 text-xs"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                                variant={overrideFilter === 'all' ? 'default' : 'outline'}
                                onClick={() => setOverrideFilter('all')}
                                className="cursor-pointer text-xs rounded-lg"
                            >
                                Todos ({overview.overrideAuditEntries.length})
                            </Badge>
                            <Badge
                                variant={overrideFilter === 'granted_extra' ? 'default' : 'outline'}
                                onClick={() => setOverrideFilter('granted_extra')}
                                className="cursor-pointer text-xs rounded-lg border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                            >
                                + Concedidos Extra
                            </Badge>
                            <Badge
                                variant={overrideFilter === 'revoked_from_role' ? 'default' : 'outline'}
                                onClick={() => setOverrideFilter('revoked_from_role')}
                                className="cursor-pointer text-xs rounded-lg border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10"
                            >
                                - Revocados del Rol
                            </Badge>
                            <Badge
                                variant={overrideFilter === 'redundant_with_role' ? 'default' : 'outline'}
                                onClick={() => setOverrideFilter('redundant_with_role')}
                                className="cursor-pointer text-xs rounded-lg"
                            >
                                Redundantes
                            </Badge>
                        </div>
                    </div>

                    {/* Overrides List */}
                    {filteredOverrideEntries.length === 0 ? (
                        <div className="glass-card rounded-2xl p-12 text-center border border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-zinc-900/50">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                Sin excepciones individuales activas para este filtro
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Todos los usuarios están operando bajo la herencia limpia de su rol asignado.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredOverrideEntries.map(entry => {
                                const clearAllKey = `${entry.organizationId}:${entry.userId}:ALL`;
                                return (
                                    <div
                                        key={`${entry.organizationId}:${entry.userId}`}
                                        className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl space-y-3"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-white/10 pb-2.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                                    {entry.fullName}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    ({entry.email})
                                                </span>
                                                <Badge variant="outline" className="text-[11px] gap-1">
                                                    <Building2 className="h-3 w-3 text-brand-pink" />
                                                    {entry.organizationName}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[11px]">
                                                    Rol: {getRoleInfo({ name: entry.roleName, is_system_role: entry.roleKind !== 'custom' }).name}
                                                </Badge>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={clearingOverrideKey === clearAllKey}
                                                onClick={() => handleClearOverride(entry.organizationId, entry.userId)}
                                                className="h-7 text-[11px] gap-1.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                            >
                                                {clearingOverrideKey === clearAllKey ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="h-3 w-3" />
                                                )}
                                                Restablecer Todo al Rol ({entry.overrides.length})
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {entry.overrides.map(ovr => {
                                                const meta = permissionMetaMap.get(ovr.permissionId);
                                                const singleKey = `${entry.organizationId}:${entry.userId}:${ovr.permissionId}`;
                                                return (
                                                    <div
                                                        key={ovr.permissionId}
                                                        className={cn(
                                                            "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs",
                                                            ovr.status === 'granted_extra'
                                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                                                : ovr.status === 'revoked_from_role'
                                                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                                                                  : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-muted-foreground"
                                                        )}
                                                    >
                                                        {ovr.status === 'granted_extra' ? (
                                                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                        ) : ovr.status === 'revoked_from_role' ? (
                                                            <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                                        ) : (
                                                            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        )}
                                                        <div>
                                                            <span className="font-semibold">
                                                                {meta?.label || ovr.permissionId}
                                                            </span>
                                                            <span className="text-[10px] opacity-75 ml-1.5">
                                                                ({ovr.status === 'granted_extra'
                                                                    ? 'Concedido por Override • Rol: OFF'
                                                                    : ovr.status === 'revoked_from_role'
                                                                      ? 'Revocado por Override • Rol: ON'
                                                                      : 'Redundante • Igual al Rol'})
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            title="Eliminar esta excepción individual y volver al valor del rol"
                                                            disabled={clearingOverrideKey === singleKey}
                                                            onClick={() =>
                                                                handleClearOverride(
                                                                    entry.organizationId,
                                                                    entry.userId,
                                                                    ovr.permissionId
                                                                )
                                                            }
                                                            className="ml-1 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 text-[10px] font-semibold transition-colors"
                                                        >
                                                            {clearingOverrideKey === singleKey ? '...' : 'Quitar'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================= */}
            {/* MODAL: CONFIRM GLOBAL BASE ROLE PUBLICATION & OVERRIDE POLICY     */}
            {/* ================================================================= */}
            <Dialog open={!!pendingPublish} onOpenChange={(open) => !open && setPendingPublish(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                            <Globe className="h-5 w-5 text-brand-pink" />
                            Publicar Plantilla Base Global: {pendingPublish ? getRoleInfo(pendingPublish.role).name : ''}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Esta acción actualizará el rol base del sistema en las <strong>{overview.totalOrganizations} organizaciones</strong> de la plataforma y definirá el estándar para todas las organizaciones futuras.
                        </DialogDescription>
                    </DialogHeader>

                    {pendingPublish && (
                        <div className="space-y-4 py-2">
                            {/* Diff Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                        <ArrowUpRight className="h-4 w-4" />
                                        Permisos Habilitados (+{pendingPublish.addedPermissions.length})
                                    </div>
                                    {pendingPublish.addedPermissions.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground mt-1">Sin nuevos permisos activados</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1 mt-2 max-h-28 overflow-y-auto">
                                            {pendingPublish.addedPermissions.map(pid => (
                                                <Badge key={pid} variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                                                    {permissionMetaMap.get(pid)?.label || pid}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                        <ArrowDownRight className="h-4 w-4" />
                                        Permisos Revocados (-{pendingPublish.removedPermissions.length})
                                    </div>
                                    {pendingPublish.removedPermissions.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground mt-1">Sin permisos desactivados</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1 mt-2 max-h-28 overflow-y-auto">
                                            {pendingPublish.removedPermissions.map(pid => (
                                                <Badge key={pid} variant="outline" className="text-[10px] border-rose-500/30 text-rose-700 dark:text-rose-300">
                                                    {permissionMetaMap.get(pid)?.label || pid}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Override Conflict Policy Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-800 dark:text-zinc-200 block">
                                    ¿Qué hacer con las Excepciones Individuales (`Overrides`) de usuarios con este rol?
                                    {pendingPublish.affectedMembersWithOverridesCount > 0 && (
                                        <Badge variant="outline" className="ml-2 text-[10px] border-amber-500/40 text-amber-600">
                                            {pendingPublish.affectedMembersWithOverridesCount} usuario(s) tienen overrides en estos permisos
                                        </Badge>
                                    )}
                                </label>

                                <div className="space-y-2">
                                    <div
                                        onClick={() => setConflictPolicy('preserve_overrides')}
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer transition-all text-xs",
                                            conflictPolicy === 'preserve_overrides'
                                                ? "border-brand-pink bg-brand-pink/5 ring-1 ring-brand-pink/40"
                                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            1. Preservar excepciones manuales y limpiar redundantes (Recomendado)
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Todos los usuarios sin excepción heredan el cambio al instante. Si una excepción manual ahora coincide con el nuevo valor del rol base, se limpia automáticamente. Las excepciones deliberadas asignadas por los dueños se respetan.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setConflictPolicy('clear_conflicting_overrides')}
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer transition-all text-xs",
                                            conflictPolicy === 'clear_conflicting_overrides'
                                                ? "border-brand-pink bg-brand-pink/5 ring-1 ring-brand-pink/40"
                                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            2. Forzar estándar en los permisos modificados
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Además de actualizar el rol base, elimina cualquier excepción individual en los permisos que acabas de modificar para que ningún usuario contradiga este cambio puntual.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setConflictPolicy('clear_all_role_overrides')}
                                        className={cn(
                                            "p-3 rounded-xl border cursor-pointer transition-all text-xs",
                                            conflictPolicy === 'clear_all_role_overrides'
                                                ? "border-brand-pink bg-brand-pink/5 ring-1 ring-brand-pink/40"
                                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                        )}
                                    >
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            3. Restablecimiento estricto (Limpiar todos los overrides de este rol)
                                        </div>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                            Limpia todas las excepciones individuales de todos los miembros con este rol en la red para que el 100% opere bajo herencia pura del rol base.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingPublish(null)}
                            className="h-9 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmGlobalPublish}
                            disabled={isPublishingGlobal}
                            className="h-9 text-xs font-semibold px-4 bg-brand-pink hover:bg-brand-pink/90 text-white gap-1.5"
                        >
                            {isPublishingGlobal ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Globe className="h-3.5 w-3.5" />
                            )}
                            Confirmar y Publicar en {overview.totalOrganizations} Organizaciones
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
