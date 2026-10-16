'use client';

import { useState, useEffect } from 'react';
import { Role, getOrganizationRoles } from '../services/role-service';
import { getVisiblePermissionGroups, normalizeRoleRecord } from '../actions/permissions';
import { Button } from '@/components/ui/button';
import { Plus, Search, Users, Lock, MoreVertical, Trash2, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoleEditor } from './role-editor';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { createRole, deleteRole, duplicateRole } from "../actions/role-actions";

interface RoleManagerProps {
    initialRoles?: Role[];
    activeModules?: string[];
}

export function RoleManager({ initialRoles = [], activeModules }: RoleManagerProps) {
    const [roles, setRoles] = useState<Role[]>(() => initialRoles.map(normalizeRoleRecord));
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(initialRoles.length === 0);

    useEffect(() => {
        if (initialRoles.length > 0) {
            const normalizedInitial = initialRoles.map(normalizeRoleRecord);
            setRoles(normalizedInitial);
            if (!selectedRoleId) {
                setSelectedRoleId(normalizedInitial[0].id);
            }
            setIsLoading(false);
            return;
        }

        let mounted = true;
        getOrganizationRoles()
            .then((fetched) => {
                if (!mounted) return;
                const normalizedFetched = fetched.map(normalizeRoleRecord);
                setRoles(normalizedFetched);
                if (normalizedFetched.length > 0) {
                    setSelectedRoleId(prev => prev || normalizedFetched[0].id);
                }
            })
            .catch(() => {
                if (mounted) toast.error('No se pudieron cargar los roles de la organización');
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [initialRoles]);

    const activeRole = roles.find(r => r.id === selectedRoleId);

    const filteredRoles = roles.filter(role =>
        (role.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (role.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateRole = async () => {
        setIsCreating(true);
        try {
            const newRole = await createRole({
                name: 'Nuevo Rol Personalizado',
                description: 'Define permisos específicos para este perfil',
                permissions: {},
                hierarchy_level: 10
            });

            if (newRole) {
                const roleWithCount: Role = { ...normalizeRoleRecord(newRole), member_count: 0 };
                setRoles(prev => [...prev, roleWithCount]);
                setSelectedRoleId(newRole.id);
                toast.success('Rol personalizado creado. Configura sus permisos y guarda los cambios.');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al crear el rol');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDuplicateRole = async (rawSourceRole: Role) => {
        setIsCreating(true);
        try {
            const newRole = await duplicateRole(rawSourceRole.id);
            if (newRole) {
                const roleWithCount: Role = { ...normalizeRoleRecord(newRole), member_count: 0 };
                setRoles(prev => [...prev, roleWithCount]);
                setSelectedRoleId(newRole.id);
                toast.success(`Rol "${newRole.name}" creado a partir de "${rawSourceRole.name}"`);
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al duplicar el rol');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRole = async (role: Role) => {
        if (role.is_system_role) {
            toast.error('Los roles base del sistema no se pueden eliminar');
            return;
        }
        if ((role.member_count || 0) > 0) {
            toast.error(`El rol "${role.name}" tiene ${role.member_count} miembro(s) asignado(s). Reasígnalos desde la pestaña Equipo antes de eliminarlo.`);
            return;
        }
        if (!confirm(`¿Estás seguro de eliminar el rol "${role.name}"? Esta acción no se puede deshacer.`)) return;

        try {
            await deleteRole(role.id);
            const remaining = roles.filter(r => r.id !== role.id);
            setRoles(remaining);
            if (selectedRoleId === role.id) {
                setSelectedRoleId(remaining[0]?.id || null);
            }
            toast.success(`Rol "${role.name}" eliminado`);
        } catch (error: any) {
            toast.error(error?.message || 'No se pudo eliminar el rol');
        }
    };

    return (
        <div className="flex flex-col md:flex-row min-h-[640px] h-[calc(100vh-210px)] w-full overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800 bg-background shadow-sm">
            {/* Left Sidebar: Role List */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 bg-muted/10 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-sm text-gray-900 dark:text-white">Roles de Organización</h2>
                            <p className="text-[11px] text-muted-foreground">{roles.length} perfiles configurados</p>
                        </div>
                        <Button size="sm" variant="default" onClick={handleCreateRole} disabled={isCreating} className="h-8 text-xs">
                            {isCreating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                            Nuevo Rol
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar roles..."
                            className="pl-8 h-9 bg-background text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    {isLoading ? (
                        <div className="p-8 flex items-center justify-center text-muted-foreground text-xs gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando roles...
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {filteredRoles.map(role => (
                                <div
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    className={cn(
                                        "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm",
                                        selectedRoleId === role.id
                                            ? "bg-primary/10 text-primary border border-primary/20"
                                            : "hover:bg-muted border border-transparent"
                                    )}
                                >
                                    <div className="flex flex-col gap-1 overflow-hidden pr-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-medium truncate">{role.name}</span>
                                            {role.is_system_role && <Lock className="h-3 w-3 text-muted-foreground/70 shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                            <span className="inline-flex items-center gap-1">
                                                <Users className="h-3 w-3" />
                                                {role.member_count || 0} {role.member_count === 1 ? 'miembro' : 'miembros'}
                                            </span>
                                            {role.is_system_role ? (
                                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Sistema</Badge>
                                            ) : (
                                                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">Nivel {role.hierarchy_level}</Badge>
                                            )}
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-70 group-hover:opacity-100 transition-opacity shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                                                <Copy className="h-3.5 w-3.5 mr-2" />
                                                Duplicar Rol
                                            </DropdownMenuItem>
                                            {!role.is_system_role && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => handleDeleteRole(role)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                        Eliminar Rol
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Right Panel: Role Editor */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
                {activeRole ? (
                    <RoleEditor
                        role={activeRole}
                        key={activeRole.id}
                        activeModules={activeModules}
                        onDuplicate={handleDuplicateRole}
                        onUpdate={(updatedRole: Role) => {
                            setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
                        }}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6">
                        Selecciona un rol de la barra lateral para inspeccionar o editar sus permisos
                    </div>
                )}
            </div>
        </div>
    );
}
