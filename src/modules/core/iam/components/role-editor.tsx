'use client';

import { useState, useMemo, useEffect } from 'react';
import { Role } from '../services/role-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PERMISSION_GROUPS, getVisiblePermissionGroups, normalizeRoleRecord, resolveSystemRoleKind } from '../actions/permissions';
import { updateRole } from '../actions/role-actions';
import { DEFAULT_ROLES } from '../services/default-roles';
import { toast } from 'sonner';
import { Save, AlertCircle, CheckCircle2, Shield, Lock, Search, ChevronDown } from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import { useActiveModules } from '@/hooks/use-active-modules';
import { getHierarchyKey } from './role-manager';
import { useTranslation } from '@/modules/core/i18n/use-translation';
import { useLocalizedIam } from '../actions/use-localized-iam';

interface RoleEditorProps {
    role: Role;
    onUpdate: (role: Role) => void;
    onDuplicate?: (role: Role) => void;
    onEditInfo?: (role: Role) => void;
    activeModules?: string[];
    allowSystemRoleEdit?: boolean;
    customSaveHandler?: (permissions: Record<string, boolean>, role: Role) => Promise<void> | void;
    saveButtonLabel?: string;
}

export function getHydratedPermissions(role: Role): Record<string, boolean> {
    const raw = (role?.permissions && typeof role.permissions === 'object') ? role.permissions : {};
    const kind = resolveSystemRoleKind(role);
    const defaults = DEFAULT_ROLES;

    if (kind === 'owner' || raw.all === true || (role.hierarchy_level ?? 0) >= 100) {
        const fullPerms: Record<string, boolean> = { all: true };
        for (const g of PERMISSION_GROUPS) {
            for (const p of g.permissions) {
                fullPerms[p.id] = true;
            }
        }
        return fullPerms;
    }

    let templatePerms: Record<string, boolean> = {};
    if (kind === 'admin') {
        const defaultAdmin = defaults.find(d => resolveSystemRoleKind(d) === 'admin');
        if (defaultAdmin?.permissions) {
            for (const [k, v] of Object.entries(defaultAdmin.permissions)) {
                if (typeof v === 'boolean') templatePerms[k] = v;
            }
        }
    } else if (kind === 'member') {
        const defaultMember = defaults.find(d => resolveSystemRoleKind(d) === 'member');
        if (defaultMember?.permissions) {
            for (const [k, v] of Object.entries(defaultMember.permissions)) {
                if (typeof v === 'boolean') templatePerms[k] = v;
            }
        }
    }

    const extractedRaw: Record<string, boolean> = {};
    if (raw.features && typeof raw.features === 'object' && !Array.isArray(raw.features)) {
        for (const [k, v] of Object.entries(raw.features)) {
            if (typeof v === 'boolean') extractedRaw[k] = v;
        }
    }
    for (const [key, val] of Object.entries(raw)) {
        if (typeof val === 'boolean') {
            extractedRaw[key] = val;
        }
    }

    const merged: Record<string, boolean> = {
        ...templatePerms,
        ...extractedRaw,
    };

    // Ensure every known permission ID has an explicit boolean so disabling a default permission persists as false
    for (const g of PERMISSION_GROUPS) {
        for (const p of g.permissions) {
            if (typeof merged[p.id] !== 'boolean') {
                merged[p.id] = false;
            }
        }
    }

    return merged;
}

export function RoleEditor({
    role: rawRole,
    onUpdate,
    onDuplicate,
    onEditInfo,
    activeModules: propActiveModules,
    allowSystemRoleEdit = false,
    customSaveHandler,
    saveButtonLabel
}: RoleEditorProps) {
    const { t } = useTranslation();
    const { getGroupInfo, getPermissionInfo, getRoleInfo } = useLocalizedIam();
    const role = useMemo(() => normalizeRoleRecord(rawRole), [rawRole]);
    const localizedRole = useMemo(() => getRoleInfo(role), [role, getRoleInfo]);
    const { modules: hookActiveModules } = useActiveModules();
    const activeModules = useMemo(() => {
        if (propActiveModules !== undefined) {
            return propActiveModules;
        }
        return hookActiveModules || [];
    }, [propActiveModules, hookActiveModules]);

    const baseVisibleGroups = useMemo(
        () => getVisiblePermissionGroups(activeModules),
        [activeModules]
    );

    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => getHydratedPermissions(role));
    const [permissionSearch, setPermissionSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

    useEffect(() => {
        const normalized = normalizeRoleRecord(rawRole);
        setPermissions(getHydratedPermissions(normalized));
        setOpenAccordionItems([]); // Cards start collapsed by default
        setIsDirty(false);
    }, [rawRole]);

    const systemKind = resolveSystemRoleKind(role);
    const isOwnerRole = systemKind === 'owner' || permissions['all'] === true || (role.hierarchy_level ?? 0) >= 100;
    const isReadOnly = isOwnerRole || (role.is_system_role && !allowSystemRoleEdit);

    const handlePermissionToggle = (permissionId: string, checked: boolean) => {
        if (isReadOnly) return;
        setPermissions(prev => ({
            ...prev,
            [permissionId]: checked
        }));
        setIsDirty(true);
    };

    const handleGroupToggleAll = (groupPermIds: string[], enable: boolean) => {
        if (isReadOnly) return;
        setPermissions(prev => {
            const next = { ...prev };
            for (const id of groupPermIds) {
                next[id] = enable;
            }
            return next;
        });
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (isReadOnly) return;
        if (customSaveHandler) {
            setIsSaving(true);
            try {
                await customSaveHandler(permissions, role);
                setIsDirty(false);
            } catch (error: any) {
                console.error('[RoleEditor] Custom Save Error:', error);
                toast.error(error?.message || t('settings.roles.toasts.save_error'));
            } finally {
                setIsSaving(false);
            }
            return;
        }

        if (role.is_system_role) return;
        setIsSaving(true);
        try {
            const updatedRole = await updateRole({
                id: role.id,
                name: role.name,
                description: role.description || null,
                hierarchy_level: role.hierarchy_level ?? 10,
                permissions,
                is_system_role: role.is_system_role,
                organization_id: role.organization_id
            });

            onUpdate({
                ...normalizeRoleRecord(updatedRole),
                member_count: role.member_count
            });
            setIsDirty(false);
            toast.success(t('settings.roles.toasts.permissions_saved', { name: localizedRole.name || role.name }));
        } catch (error: any) {
            console.error('[RoleEditor] Error:', error);
            toast.error(error?.message || t('settings.roles.toasts.save_error'));
        } finally {
            setIsSaving(false);
        }
    };

    const visibleGroups = useMemo(() => {
        if (!permissionSearch.trim()) return baseVisibleGroups;

        const q = permissionSearch.toLowerCase().trim();
        return baseVisibleGroups
            .map(group => {
                const groupInfo = getGroupInfo(group);
                const matchedPerms = group.permissions.filter(p => {
                    const permInfo = getPermissionInfo(p);
                    return (
                        p.label.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        permInfo.label.toLowerCase().includes(q) ||
                        permInfo.description.toLowerCase().includes(q) ||
                        group.label.toLowerCase().includes(q) ||
                        groupInfo.label.toLowerCase().includes(q) ||
                        groupInfo.description.toLowerCase().includes(q)
                    );
                });
                return {
                    ...group,
                    permissions: matchedPerms
                };
            })
            .filter(group => group.permissions.length > 0);
    }, [baseVisibleGroups, permissionSearch, getGroupInfo, getPermissionInfo]);

    useEffect(() => {
        if (permissionSearch.trim()) {
            setOpenAccordionItems(visibleGroups.map(g => g.id));
        }
    }, [permissionSearch, visibleGroups]);

    const totalPermissions = useMemo(
        () => baseVisibleGroups.reduce((acc, g) => acc + g.permissions.length, 0),
        [baseVisibleGroups]
    );

    const enabledCount = useMemo(() => {
        if (permissions['all'] === true) return totalPermissions;
        return baseVisibleGroups.reduce(
            (acc, g) => acc + g.permissions.filter(p => permissions[p.id] === true).length,
            0
        );
    }, [permissions, baseVisibleGroups, totalPermissions]);

    return (
        <div className="w-full space-y-4">
            {/* Stats, Search & Global Actions Bar (componentes agrupados sueltos sin contenedor) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 py-1">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                                {localizedRole.name}
                            </h3>
                            {role.is_system_role ? (
                                <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-[10px]">
                                    <Lock className="h-3 w-3" /> {t('settings.roles.editor.base_badge')}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] font-semibold border-brand-pink/30 text-brand-pink bg-brand-pink/5">
                                    {t(('settings.roles.hierarchy_' + getHierarchyKey(role.hierarchy_level)) as any)}
                                </Badge>
                            )}
                            {permissions['all'] === true && (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {t('settings.roles.editor.total_access')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('settings.roles.editor.enabled_count', {
                                enabled: String(enabledCount),
                                total: String(totalPermissions),
                                count: String(role.member_count || 0),
                                member_text: role.member_count === 1 ? t('settings.roles.editor.member_singular') : t('settings.roles.editor.member_plural')
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="search"
                            name="filter_role_permissions_no_autofill"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-form-type="other"
                            value={permissionSearch}
                            onChange={(e) => setPermissionSearch(e.target.value)}
                            placeholder={t('settings.roles.editor.search_placeholder')}
                            className="pl-8 h-8 text-xs"
                        />
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (openAccordionItems.length === visibleGroups.length) {
                                setOpenAccordionItems([]);
                            } else {
                                setOpenAccordionItems(visibleGroups.map(g => g.id));
                            }
                        }}
                        className="h-8 text-xs shrink-0"
                    >
                        {openAccordionItems.length === visibleGroups.length ? t('settings.roles.editor.collapse_all') : t('settings.roles.editor.expand_all')}
                    </Button>

                    {!isReadOnly && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                                const allPermIds = baseVisibleGroups.flatMap(g => g.permissions.map(p => p.id));
                                const allEnabled = enabledCount === totalPermissions;
                                handleGroupToggleAll(allPermIds, !allEnabled);
                            }}
                            className="h-8 text-xs shrink-0 font-medium"
                        >
                            {enabledCount === totalPermissions ? t('settings.roles.editor.deactivate_all') : t('settings.roles.editor.activate_all')}
                        </Button>
                    )}

                    {!isReadOnly && (
                        <Button
                            onClick={handleSave}
                            disabled={!isDirty || isSaving}
                            size="sm"
                            className="h-8 text-xs px-3.5 bg-brand-pink hover:bg-brand-pink/90 text-white font-medium shadow-xs shrink-0 gap-1.5"
                        >
                            <Save className="h-3.5 w-3.5" />
                            {isSaving ? t('settings.roles.editor.saving_btn') : (saveButtonLabel || t('settings.roles.editor.save_btn'))}
                        </Button>
                    )}
                </div>
            </div>

            {/* Permission Groups (Collapsible Cards) */}
            <Accordion
                type="multiple"
                value={openAccordionItems}
                onValueChange={setOpenAccordionItems}
                className="w-full space-y-2.5"
            >
                {visibleGroups.map((group) => {
                    const groupInfo = getGroupInfo(group);
                    const groupEnabledCount = group.permissions.filter(
                        p => permissions[p.id] === true || permissions['all'] === true
                    ).length;
                    const isFull = groupEnabledCount === group.permissions.length && group.permissions.length > 0;
                    const groupPermIds = group.permissions.map(p => p.id);

                    return (
                        <AccordionItem
                            key={group.id}
                            value={group.id}
                            className="glass-card rounded-2xl px-4 py-0.5 border border-zinc-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl"
                        >
                            <div className="flex items-center justify-between gap-3 w-full py-2.5 px-1">
                                <AccordionPrimitive.Header className="flex flex-1 min-w-0">
                                    <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between text-left hover:no-underline py-1 pr-3 [&[data-state=open]>svg]:rotate-180 group transition-all">
                                        <div className="min-w-0 pr-3">
                                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-brand-pink transition-colors">
                                                {groupInfo.label}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {groupInfo.description}
                                            </p>
                                        </div>
                                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                                    </AccordionPrimitive.Trigger>
                                </AccordionPrimitive.Header>

                                <div className="flex items-center gap-2.5 shrink-0 pl-2 border-l border-zinc-200/70 dark:border-white/10">
                                    {isFull ? (
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1 text-[11px]">
                                            <CheckCircle2 className="h-3 w-3" /> {t('settings.roles.editor.all_active', { count: String(group.permissions.length) })}
                                        </Badge>
                                    ) : groupEnabledCount > 0 ? (
                                        <Badge variant="secondary" className="text-[11px]">
                                            {t('settings.roles.editor.active_count', { count: String(groupEnabledCount), total: String(group.permissions.length) })}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                            0 / {group.permissions.length}
                                        </Badge>
                                    )}

                                    {/* Quick Switch to activate/deactivate all permissions in this group */}
                                    <div className="flex items-center gap-1.5 pl-1">
                                        <span className="text-[11px] text-muted-foreground hidden sm:inline select-none">
                                            {isFull ? t('settings.roles.editor.deactivate_all') : t('settings.roles.editor.activate_all')}
                                        </span>
                                        <Switch
                                            id={`toggle-group-${group.id}`}
                                            checked={isFull}
                                            disabled={isReadOnly}
                                            onCheckedChange={(checked) => handleGroupToggleAll(groupPermIds, checked)}
                                            className="data-[state=checked]:bg-emerald-600 scale-90"
                                        />
                                    </div>
                                </div>
                            </div>
                            <AccordionContent className="pt-0 pb-3.5 px-1">
                                <Separator className="mb-3 bg-zinc-200/60 dark:bg-white/10" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {group.permissions.map((perm) => {
                                        const permInfo = getPermissionInfo(perm);
                                        const isChecked = permissions[perm.id] === true || permissions['all'] === true;
                                        return (
                                            <div
                                                key={perm.id}
                                                className="flex items-start space-x-3 p-2.5 rounded-xl hover:bg-zinc-100/60 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-zinc-200/40 dark:hover:border-white/5"
                                            >
                                                <Switch
                                                    id={`${role.id}-${perm.id}`}
                                                    checked={isChecked}
                                                    disabled={isReadOnly}
                                                    onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                                                    className="mt-0.5"
                                                />
                                                <div className="grid gap-1 leading-none">
                                                    <label
                                                        htmlFor={`${role.id}-${perm.id}`}
                                                        className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {permInfo.label}
                                                    </label>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {permInfo.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}
