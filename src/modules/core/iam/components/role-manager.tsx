'use client';

import { useState, useEffect } from 'react';
import { Role, getOrganizationRoles } from '../services/role-service';
import { normalizeRoleRecord, getDefaultBaseRolePermissions, resolveSystemRoleKind, sortRolesWithSystemBaseFirst } from '../actions/permissions';
import { Button } from '@/components/ui/button';
import { Plus, Users, Lock, MoreVertical, Trash2, Copy, Loader2, Pencil, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';
import { Input } from '@/components/ui/input';
import { RoleEditor } from './role-editor';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { createRole, deleteRole, duplicateRole, updateRole } from "../actions/role-actions";
import { useTranslation } from "@/modules/core/i18n/use-translation";
import { useLocalizedIam } from "../actions/use-localized-iam";

export function getHierarchyKey(level?: number | null): 'dueño' | 'admin' | 'supervisor' | 'operativo' {
    const l = typeof level === 'number' ? level : 10;
    if (l >= 100) return 'dueño';
    if (l >= 40) return 'admin';
    if (l >= 20) return 'supervisor';
    return 'operativo';
}

export function getHierarchyLabel(level?: number | null): 'Operativo' | 'Supervisor' | 'Administrador' | 'Dueño' {
    const key = getHierarchyKey(level);
    switch (key) {
        case 'dueño': return 'Dueño';
        case 'admin': return 'Administrador';
        case 'supervisor': return 'Supervisor';
        default: return 'Operativo';
    }
}

interface RoleManagerProps {
    initialRoles?: Role[];
    activeModules?: string[];
}

export function RoleManager({ initialRoles = [], activeModules }: RoleManagerProps) {
    const { t, getRoleInfo } = useLocalizedIam();
    const [roles, setRoles] = useState<Role[]>(() => sortRolesWithSystemBaseFirst(initialRoles.map(normalizeRoleRecord)));
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id || null);
    const [isLoading, setIsLoading] = useState(initialRoles.length === 0);

    // Modal state for Creating Role
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleType, setNewRoleType] = useState<'operativo' | 'supervisor' | 'admin'>('operativo');
    const [newRoleTemplate, setNewRoleTemplate] = useState<'member' | 'admin' | 'blank'>('member');
    const [newRoleDesc, setNewRoleDesc] = useState('');

    // Modal state for Editing Role Info
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editRoleName, setEditRoleName] = useState('');
    const [editRoleType, setEditRoleType] = useState<'operativo' | 'supervisor' | 'admin'>('operativo');
    const [editRoleDesc, setEditRoleDesc] = useState('');

    // Deletion states
    const [blockedDeleteRole, setBlockedDeleteRole] = useState<Role | null>(null);
    const [confirmDeleteRole, setConfirmDeleteRole] = useState<Role | null>(null);

    useEffect(() => {
        if (initialRoles.length > 0) {
            const normalizedInitial = sortRolesWithSystemBaseFirst(initialRoles.map(normalizeRoleRecord));
            setRoles(normalizedInitial);
            if (!selectedRoleId) {
                setSelectedRoleId(normalizedInitial[0]?.id || null);
            }
            setIsLoading(false);
            return;
        }

        let mounted = true;
        getOrganizationRoles()
            .then((fetched) => {
                if (!mounted) return;
                const normalizedFetched = sortRolesWithSystemBaseFirst(fetched.map(normalizeRoleRecord));
                setRoles(normalizedFetched);
                if (normalizedFetched.length > 0) {
                    setSelectedRoleId(prev => prev || normalizedFetched[0].id);
                }
            })
            .catch(() => {
                if (mounted) toast.error(t('settings.roles.toasts.load_error'));
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [initialRoles]);

    const activeRole = roles.find(r => r.id === selectedRoleId);

    // Handle Create Role from Modal
    const handleConfirmCreateRole = async () => {
        if (!newRoleName.trim()) {
            toast.error(t('settings.roles.toasts.name_required'));
            return;
        }
        setIsCreating(true);
        try {
            let initialPerms: Record<string, boolean> = {};
            if (newRoleTemplate === 'member' || newRoleTemplate === 'admin') {
                const liveSystemRole = roles.find(r => resolveSystemRoleKind(r) === newRoleTemplate);
                if (liveSystemRole?.permissions && Object.keys(liveSystemRole.permissions).length > 0) {
                    initialPerms = { ...liveSystemRole.permissions };
                    delete (initialPerms as any).all;
                } else {
                    initialPerms = getDefaultBaseRolePermissions(newRoleTemplate);
                }
            }

            const hierarchy = newRoleType === 'admin' ? 45 : newRoleType === 'supervisor' ? 25 : 10;

            const newRole = await createRole({
                name: newRoleName.trim(),
                description: newRoleDesc.trim() || null,
                permissions: initialPerms,
                hierarchy_level: hierarchy
            });

            if (newRole) {
                const roleWithCount: Role = { ...normalizeRoleRecord(newRole), member_count: 0 };
                setRoles(prev => sortRolesWithSystemBaseFirst([...prev, roleWithCount]));
                setSelectedRoleId(newRole.id);
                setIsCreateModalOpen(false);
                setNewRoleName('');
                setNewRoleDesc('');
                setNewRoleType('operativo');
                setNewRoleTemplate('member');
                toast.success(t('settings.roles.toasts.created', { name: newRole.name }));
            }
        } catch (error: any) {
            toast.error(error?.message || t('settings.roles.toasts.save_error'));
        } finally {
            setIsCreating(false);
        }
    };

    // Open Edit Info Modal
    const handleOpenEditModal = (roleToEdit: Role) => {
        setEditingRole(roleToEdit);
        setEditRoleName(roleToEdit.name);
        const lvl = roleToEdit.hierarchy_level || 10;
        setEditRoleType(lvl >= 40 ? 'admin' : lvl >= 20 ? 'supervisor' : 'operativo');
        setEditRoleDesc(roleToEdit.description || '');
    };

    // Save Edit Info Modal
    const handleConfirmEditRole = async () => {
        if (!editingRole) return;
        if (!editRoleName.trim()) {
            toast.error(t('settings.roles.toasts.name_required'));
            return;
        }
        setIsSavingEdit(true);
        try {
            const hierarchy = editRoleType === 'admin' ? 45 : editRoleType === 'supervisor' ? 25 : 10;
            const updated = await updateRole({
                id: editingRole.id,
                name: editRoleName.trim(),
                description: editRoleDesc.trim() || null,
                hierarchy_level: hierarchy,
                permissions: editingRole.permissions || {},
                is_system_role: editingRole.is_system_role,
                organization_id: editingRole.organization_id
            });

            if (updated) {
                const normalized: Role = {
                    ...normalizeRoleRecord(updated),
                    member_count: editingRole.member_count
                };
                setRoles(prev => prev.map(r => r.id === updated.id ? normalized : r));
                setEditingRole(null);
                toast.success(t('settings.roles.toasts.info_updated'));
            }
        } catch (error: any) {
            toast.error(error?.message || t('settings.roles.toasts.save_error'));
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Duplicate Role
    const handleDuplicateRole = async (rawSourceRole: Role) => {
        try {
            const newRole = await duplicateRole(rawSourceRole.id);
            if (newRole) {
                const roleWithCount: Role = { ...normalizeRoleRecord(newRole), member_count: 0 };
                setRoles(prev => sortRolesWithSystemBaseFirst([...prev, roleWithCount]));
                setSelectedRoleId(newRole.id);
                toast.success(t('settings.roles.toasts.duplicated', { name: newRole.name, source: rawSourceRole.name }));
            }
        } catch (error: any) {
            toast.error(error?.message || t('settings.roles.toasts.save_error'));
        }
    };

    // Request Delete Role (checks member count)
    const handleRequestDeleteRole = (roleToDelete: Role) => {
        if (roleToDelete.is_system_role) {
            toast.error(t('settings.roles.toasts.protected_role_error'));
            return;
        }
        if ((roleToDelete.member_count || 0) > 0) {
            setBlockedDeleteRole(roleToDelete);
            return;
        }
        setConfirmDeleteRole(roleToDelete);
    };

    // Execute Delete Role
    const handleExecuteDeleteRole = async (roleToDelete: Role) => {
        try {
            await deleteRole(roleToDelete.id);
            const remaining = roles.filter(r => r.id !== roleToDelete.id);
            setRoles(remaining);
            if (selectedRoleId === roleToDelete.id) {
                setSelectedRoleId(remaining[0]?.id || null);
            }
            setConfirmDeleteRole(null);
            toast.success(t('settings.roles.toasts.deleted', { name: roleToDelete.name }));
        } catch (error: any) {
            toast.error(error?.message || t('settings.roles.toasts.delete_error'));
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Top Selector Bar: Suelto sin contenedor que corte bordes, con wrap natural */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-1">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('settings.roles.loading')}
                        </div>
                    ) : (
                        roles.map(role => {
                            const isSelected = selectedRoleId === role.id;
                            const hierarchyText = t(('settings.roles.hierarchy_' + getHierarchyKey(role.hierarchy_level)) as any);

                            return (
                                <div
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
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

                                    {/* Action Dropdown ONLY for custom roles (base roles have NO dropdown) */}
                                    {!role.is_system_role && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-5 w-5 rounded flex items-center justify-center transition-opacity ml-0.5 -mr-1",
                                                        isSelected ? "hover:bg-brand-pink/10 text-brand-pink" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground opacity-60 group-hover:opacity-100"
                                                    )}
                                                >
                                                    <MoreVertical className="h-3 w-3" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem onClick={() => handleOpenEditModal(role)}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                                    {t('settings.roles.actions.edit_info')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                                                    <Copy className="h-3.5 w-3.5 mr-2" />
                                                    {t('settings.roles.actions.duplicate')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => handleRequestDeleteRole(role)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                    {t('settings.roles.actions.delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Action: "+ Nuevo Rol" */}
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        size="sm"
                        variant="default"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-9 text-xs font-semibold px-4 shadow-xs bg-brand-pink hover:bg-brand-pink/90 text-white"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {t('settings.roles.new_role_button')}
                    </Button>
                </div>
            </div>

            {/* Role Editor: Single unified block underneath */}
            {activeRole ? (
                <RoleEditor
                    role={activeRole}
                    key={activeRole.id}
                    activeModules={activeModules}
                    onDuplicate={handleDuplicateRole}
                    onEditInfo={() => handleOpenEditModal(activeRole)}
                    onUpdate={(updatedRole: Role) => {
                        setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
                    }}
                />
            ) : (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-muted-foreground text-sm">
                    {t('settings.roles.select_role_prompt')}
                </div>
            )}

            {/* Modal: Crear Nuevo Rol */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                            <Shield className="h-5 w-5 text-brand-pink" />
                            {t('settings.roles.modals.create_title')}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {t('settings.roles.modals.create_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.name_label')} <span className="text-brand-pink">*</span>
                            </label>
                            <Input
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value)}
                                placeholder={t('settings.roles.modals.name_placeholder')}
                                className="text-xs h-9"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.hierarchy_label')}
                            </label>
                            <Select value={newRoleType} onValueChange={(val: any) => setNewRoleType(val)}>
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder={t('settings.roles.modals.hierarchy_label')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operativo">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_operativo_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_operativo_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="supervisor">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_supervisor_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_supervisor_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_admin_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_admin_desc')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                {t('settings.roles.modals.hierarchy_help')}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.template_label')}
                            </label>
                            <Select value={newRoleTemplate} onValueChange={(val: any) => setNewRoleTemplate(val)}>
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder={t('settings.roles.modals.template_label')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.template_member_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.template_member_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.template_admin_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.template_admin_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="blank">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.template_blank_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.template_blank_desc')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.desc_label')}
                            </label>
                            <Input
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                                placeholder={t('settings.roles.modals.desc_placeholder')}
                                className="text-xs h-9"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)} className="h-9 text-xs">
                            {t('settings.roles.modals.cancel_btn')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmCreateRole}
                            disabled={isCreating || !newRoleName.trim()}
                            className="h-9 text-xs font-semibold px-4 bg-brand-pink hover:bg-brand-pink/90 text-white"
                        >
                            {isCreating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                            {t('settings.roles.modals.create_btn')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal: Editar Información del Rol */}
            <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
                            <Pencil className="h-4 w-4 text-brand-pink" />
                            {t('settings.roles.modals.edit_title')}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {t('settings.roles.modals.edit_desc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.name_label')} <span className="text-brand-pink">*</span>
                            </label>
                            <Input
                                value={editRoleName}
                                onChange={(e) => setEditRoleName(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.hierarchy_label')}
                            </label>
                            <Select value={editRoleType} onValueChange={(val: any) => setEditRoleType(val)}>
                                <SelectTrigger className="w-full h-9 text-xs">
                                    <SelectValue placeholder={t('settings.roles.modals.hierarchy_label')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operativo">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_operativo_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_operativo_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="supervisor">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_supervisor_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_supervisor_desc')}</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        <div className="flex flex-col text-left py-0.5">
                                            <span className="font-semibold text-xs">{t('settings.roles.modals.hierarchy_admin_title')}</span>
                                            <span className="text-[10px] text-muted-foreground">{t('settings.roles.modals.hierarchy_admin_desc')}</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                {t('settings.roles.modals.edit_hierarchy_help')}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                                {t('settings.roles.modals.edit_desc_label')}
                            </label>
                            <Input
                                value={editRoleDesc}
                                onChange={(e) => setEditRoleDesc(e.target.value)}
                                className="text-xs h-9"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setEditingRole(null)} className="h-9 text-xs">
                            {t('settings.roles.modals.cancel_btn')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmEditRole}
                            disabled={isSavingEdit || !editRoleName.trim()}
                            className="h-9 text-xs font-semibold px-4 bg-brand-pink hover:bg-brand-pink/90 text-white"
                        >
                            {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                            {t('settings.roles.modals.save_btn')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Bloqueo de Eliminación: Cuando el rol tiene miembros asignados */}
            <Dialog open={!!blockedDeleteRole} onOpenChange={(open) => !open && setBlockedDeleteRole(null)}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex items-start gap-3.5 pt-2">
                        <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                {t('settings.roles.modals.delete_blocked_title')}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('settings.roles.modals.delete_blocked_desc', {
                                    name: blockedDeleteRole?.name || '',
                                    count: String(blockedDeleteRole?.member_count || 0),
                                    member_text: blockedDeleteRole?.member_count === 1 ? t('settings.roles.editor.member_singular') : t('settings.roles.editor.member_plural')
                                })}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('settings.roles.modals.delete_blocked_help')}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end pt-3 border-t mt-2">
                        <Button variant="default" onClick={() => setBlockedDeleteRole(null)} className="h-9 text-xs font-medium">
                            {t('settings.roles.modals.delete_blocked_btn')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmación de Eliminación: Cuando el rol tiene 0 miembros */}
            <Dialog open={!!confirmDeleteRole} onOpenChange={(open) => !open && setConfirmDeleteRole(null)}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex items-start gap-3.5 pt-2">
                        <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-base text-gray-900 dark:text-white">
                                {t('settings.roles.modals.delete_confirm_title', { name: confirmDeleteRole?.name || '' })}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {t('settings.roles.modals.delete_confirm_desc')}
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={() => setConfirmDeleteRole(null)} className="h-9 text-xs">
                            {t('settings.roles.modals.cancel_btn')}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => confirmDeleteRole && handleExecuteDeleteRole(confirmDeleteRole)}
                            className="h-9 text-xs font-semibold"
                        >
                            {t('settings.roles.modals.delete_confirm_btn')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
