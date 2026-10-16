'use client';

import { useState, useMemo, useEffect } from 'react';
import { Role } from '../services/role-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PERMISSION_GROUPS, getVisiblePermissionGroups, normalizeRoleRecord, resolveSystemRoleKind } from '../actions/permissions';
import { updateRole } from '../actions/role-actions';
import { DEFAULT_ROLES } from '../services/default-roles';
import { toast } from 'sonner';
import { Save, AlertCircle, CheckCircle2, Shield, Lock, Copy, Search, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useActiveModules } from '@/hooks/use-active-modules';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface RoleEditorProps {
    role: Role;
    onUpdate: (role: Role) => void;
    onDuplicate?: (role: Role) => void;
    activeModules?: string[];
}

function getHydratedPermissions(role: Role): Record<string, boolean> {
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

    return {
        ...templatePerms,
        ...extractedRaw,
    };
}

export function RoleEditor({ role: rawRole, onUpdate, onDuplicate, activeModules: propActiveModules }: RoleEditorProps) {
    const role = useMemo(() => normalizeRoleRecord(rawRole), [rawRole]);
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

    const [name, setName] = useState(role.name);
    const [description, setDescription] = useState(role.description || '');
    const [hierarchyLevel, setHierarchyLevel] = useState<number>(role.hierarchy_level || 10);
    const [permissions, setPermissions] = useState<Record<string, boolean>>(() => getHydratedPermissions(role));
    const [permissionSearch, setPermissionSearch] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>(() =>
        baseVisibleGroups.map(g => g.id)
    );

    useEffect(() => {
        const normalized = normalizeRoleRecord(rawRole);
        setName(normalized.name);
        setDescription(normalized.description || '');
        setHierarchyLevel(normalized.hierarchy_level || 10);
        setPermissions(getHydratedPermissions(normalized));
        setOpenAccordionItems(baseVisibleGroups.map(g => g.id));
        setIsDirty(false);
    }, [rawRole, baseVisibleGroups]);

    const isReadOnly = role.is_system_role || permissions['all'] === true;

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
        if (role.is_system_role) return;
        if (!name.trim()) {
            toast.error('El nombre del rol es obligatorio');
            return;
        }
        setIsSaving(true);
        try {
            const updatedRole = await updateRole({
                id: role.id,
                name: name.trim(),
                description: description.trim() || null,
                hierarchy_level: hierarchyLevel,
                permissions,
                is_system_role: role.is_system_role,
                organization_id: role.organization_id
            });

            onUpdate({
                ...normalizeRoleRecord(updatedRole),
                member_count: role.member_count
            });
            setIsDirty(false);
            toast.success('Permisos del rol actualizados correctamente');
        } catch (error: any) {
            console.error('[RoleEditor] Error:', error);
            toast.error(error?.message || 'Error al guardar los cambios del rol');
        } finally {
            setIsSaving(false);
        }
    };

    const visibleGroups = useMemo(() => {
        if (!permissionSearch.trim()) return baseVisibleGroups;

        const q = permissionSearch.toLowerCase().trim();
        return baseVisibleGroups
            .map(group => ({
                ...group,
                permissions: group.permissions.filter(
                    p =>
                        p.label.toLowerCase().includes(q) ||
                        p.description.toLowerCase().includes(q) ||
                        group.label.toLowerCase().includes(q)
                )
            }))
            .filter(group => group.permissions.length > 0);
    }, [baseVisibleGroups, permissionSearch]);

    useEffect(() => {
        if (visibleGroups.length > 0) {
            setOpenAccordionItems(visibleGroups.map(g => g.id));
        }
    }, [visibleGroups]);

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
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex flex-col lg:flex-row lg:items-start justify-between gap-4 bg-white dark:bg-zinc-900 w-full">
                <div className="space-y-2 w-full max-w-xl">
                    {role.is_system_role ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {role.name}
                                </h1>
                                <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    <Lock className="h-3 w-3" /> Rol Base del Sistema
                                </Badge>
                                <Badge variant="outline" className="text-xs gap-1">
                                    <Users className="h-3 w-3" /> {role.member_count || 0} miembro(s)
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <Input
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                                    placeholder="Nombre del rol..."
                                    className="text-lg font-bold h-9 flex-1"
                                />
                                <Select
                                    value={String(hierarchyLevel >= 40 ? 45 : hierarchyLevel >= 20 ? 25 : 10)}
                                    onValueChange={(val) => {
                                        setHierarchyLevel(Number(val));
                                        setIsDirty(true);
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-[210px] h-9 text-xs">
                                        <SelectValue placeholder="Nivel de jerarquía" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">Nivel 10 — Operativo / Estándar</SelectItem>
                                        <SelectItem value="25">Nivel 25 — Supervisor / Líder</SelectItem>
                                        <SelectItem value="45">Nivel 45 — Sub-Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Input
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                                placeholder="Añade una descripción sobre las responsabilidades de este rol..."
                                className="text-sm text-muted-foreground h-9"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {role.is_system_role ? (
                        onDuplicate && (
                            <Button variant="outline" onClick={() => onDuplicate(role)} className="gap-2">
                                <Copy className="h-4 w-4" />
                                Duplicar para personalizar
                            </Button>
                        )
                    ) : (
                        <>
                            {onDuplicate && (
                                <Button variant="outline" size="sm" onClick={() => onDuplicate(role)} className="gap-1.5">
                                    <Copy className="h-3.5 w-3.5" />
                                    Duplicar
                                </Button>
                            )}
                            <Button onClick={handleSave} disabled={!isDirty || isSaving} size="sm" className="gap-1.5">
                                <Save className="h-4 w-4" />
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Permission Matrix */}
            <ScrollArea className="flex-1 bg-slate-50/70 dark:bg-zinc-950/50 p-6">
                <div className="max-w-3xl mx-auto space-y-5">
                    {/* System Role Read-Only Banner */}
                    {role.is_system_role && (
                        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                        Este es un rol base protegido del sistema (Solo lectura)
                                    </p>
                                    <p className="text-xs text-amber-700/90 dark:text-amber-300/80">
                                        Los roles predeterminados garantizan la integridad de acceso. Si necesitas ajustar permisos específicos, duplica este rol para crear una variante personalizada.
                                    </p>
                                </div>
                            </div>
                            {onDuplicate && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onDuplicate(role)}
                                    className="shrink-0 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200"
                                >
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    Crear copia editable
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Stats & Search Bar */}
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-sm text-gray-900 dark:text-white">Matriz de Permisos</h3>
                                    {permissions['all'] === true && (
                                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Acceso Total (Dueño)
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {enabledCount} de {totalPermissions} permisos habilitados en los módulos activos
                                </p>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={permissionSearch}
                                onChange={(e) => setPermissionSearch(e.target.value)}
                                placeholder="Filtrar permisos..."
                                className="pl-8 h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Permission Groups */}
                    <Accordion
                        type="multiple"
                        value={openAccordionItems}
                        onValueChange={setOpenAccordionItems}
                        className="w-full space-y-3"
                    >
                        {visibleGroups.map((group) => {
                            const groupEnabledCount = group.permissions.filter(
                                p => permissions[p.id] === true || permissions['all'] === true
                            ).length;
                            const isFull = groupEnabledCount === group.permissions.length && group.permissions.length > 0;
                            const groupPermIds = group.permissions.map(p => p.id);

                            return (
                                <AccordionItem
                                    key={group.id}
                                    value={group.id}
                                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 border-b"
                                >
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <div className="flex items-center justify-between gap-4 w-full pr-3">
                                            <div className="text-left">
                                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">{group.label}</h4>
                                                <p className="text-xs text-muted-foreground">{group.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isFull ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Todos ({group.permissions.length})
                                                    </Badge>
                                                ) : groupEnabledCount > 0 ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {groupEnabledCount} / {group.permissions.length} activos
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                                        0 / {group.permissions.length}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-0 pb-4">
                                        <Separator className="mb-3" />
                                        {!isReadOnly && group.permissions.length > 1 && (
                                            <div className="flex justify-end mb-2">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleGroupToggleAll(groupPermIds, !isFull)}
                                                >
                                                    {isFull ? 'Desactivar todos en esta sección' : 'Activar todos en esta sección'}
                                                </Button>
                                            </div>
                                        )}
                                        <div className="grid gap-2">
                                            {group.permissions.map((perm) => {
                                                const isChecked = permissions[perm.id] === true || permissions['all'] === true;
                                                return (
                                                    <div
                                                        key={perm.id}
                                                        className="flex items-start space-x-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                                                    >
                                                        <Switch
                                                            id={`${role.id}-${perm.id}`}
                                                            checked={isChecked}
                                                            disabled={isReadOnly}
                                                            onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                                                        />
                                                        <div className="grid gap-1 leading-none">
                                                            <label
                                                                htmlFor={`${role.id}-${perm.id}`}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                            >
                                                                {perm.label}
                                                            </label>
                                                            <p className="text-xs text-muted-foreground">
                                                                {perm.description}
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
            </ScrollArea>
        </div>
    );
}
