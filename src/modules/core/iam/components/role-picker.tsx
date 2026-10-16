'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Role, getOrganizationRoles } from '../services/role-service';
import { normalizeRoleRecord } from '../actions/permissions';
import { getCurrentUserPermissions } from '@/modules/core/settings/actions/team';
import { Shield, User, Crown } from 'lucide-react';

interface RolePickerProps {
    value: string; // role_id
    onValueChange: (roleId: string) => void;
    disabled?: boolean;
    legacyRole?: string | null;
    onRoleSelected?: (role: Role | undefined, allRoles: Role[]) => void;
    isCurrentUserOwner?: boolean;
}

export function RolePicker({
    value,
    onValueChange,
    disabled,
    legacyRole,
    onRoleSelected,
    isCurrentUserOwner
}: RolePickerProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOwnerSession, setIsOwnerSession] = useState<boolean>(isCurrentUserOwner ?? false);

    useEffect(() => {
        if (typeof isCurrentUserOwner === 'boolean') {
            setIsOwnerSession(isCurrentUserOwner);
            return;
        }

        let mounted = true;
        getCurrentUserPermissions()
            .then(perms => {
                if (!mounted || !perms) return;
                const isOwner = (perms.hierarchy ?? 0) >= 100 || perms.role === 'owner' || perms.role === 'dueño';
                setIsOwnerSession(isOwner);
            })
            .catch(() => {});

        return () => {
            mounted = false;
        };
    }, [isCurrentUserOwner]);

    useEffect(() => {
        let mounted = true;
        getOrganizationRoles()
            .then(rawData => {
                if (!mounted) return;
                const data = rawData.map(normalizeRoleRecord);
                setRoles(data);

                // Resolve initial role if value is missing or legacy string ('admin', 'member', 'owner')
                const isUuid = Boolean(value && value.length >= 30);
                if (!isUuid && data.length > 0) {
                    const hint = (value || legacyRole || '').toLowerCase();
                    let matchedRole: Role | undefined;

                    if (hint === 'owner' || hint === 'dueño') {
                        matchedRole = data.find(r => r.hierarchy_level >= 100 || r.name.toLowerCase().includes('dueño') || r.name.toLowerCase().includes('owner'));
                    } else if (hint === 'admin' || hint === 'administrador') {
                        matchedRole = data.find(r => (r.hierarchy_level >= 50 && r.hierarchy_level < 100) || r.name.toLowerCase().includes('admin'));
                    }

                    if (!matchedRole) {
                        matchedRole = data.find(r => r.name === 'Miembro' || r.name === 'Member') || data.find(r => r.hierarchy_level < 50) || data[data.length - 1];
                    }

                    if (matchedRole) {
                        onValueChange(matchedRole.id);
                        onRoleSelected?.(matchedRole, data);
                        return;
                    }
                }

                const current = data.find(r => r.id === value);
                onRoleSelected?.(current, data);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [legacyRole]);

    const selectedRole = roles.find(r => r.id === value);

    useEffect(() => {
        if (roles.length > 0) {
            onRoleSelected?.(selectedRole, roles);
        }
    }, [value, roles]);

    const filteredRoles = roles.filter(r => {
        // Show Owner role (hierarchy >= 100) if the session user is Owner OR if the selected role is already Owner
        const isOwnerRole = (r.hierarchy_level ?? 0) >= 100 || r.name?.toLowerCase().trim() === 'owner' || r.name?.toLowerCase().trim() === 'dueño';
        if (isOwnerRole) {
            return isOwnerSession || selectedRole?.id === r.id;
        }
        return true;
    });

    return (
        <Select value={selectedRole?.id || value} onValueChange={onValueChange} disabled={disabled || loading}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Cargando roles..." : "Selecciona un rol"}>
                    {selectedRole && (
                        <div className="flex items-center gap-2">
                            {((selectedRole.hierarchy_level ?? 0) >= 100 || selectedRole.name?.toLowerCase().trim() === 'owner' || selectedRole.name?.toLowerCase().trim() === 'dueño') ? (
                                <Crown className="h-4 w-4 text-amber-500" />
                            ) : ((selectedRole.hierarchy_level ?? 0) >= 50 || selectedRole.name?.toLowerCase().trim() === 'admin' || selectedRole.name?.toLowerCase().trim() === 'administrador') ? (
                                <Shield className="h-4 w-4 text-indigo-500" />
                            ) : (
                                <User className="h-4 w-4 text-gray-500" />
                            )}
                            <span>{selectedRole.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {filteredRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                            {((role.hierarchy_level ?? 0) >= 100 || role.name?.toLowerCase().trim() === 'owner' || role.name?.toLowerCase().trim() === 'dueño') ? (
                                <Crown className="h-4 w-4 text-amber-500" />
                            ) : ((role.hierarchy_level ?? 0) >= 50 || role.name?.toLowerCase().trim() === 'admin' || role.name?.toLowerCase().trim() === 'administrador') ? (
                                <Shield className="h-4 w-4 text-indigo-500" />
                            ) : (
                                <User className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="flex flex-col text-left">
                                <span className="font-medium">{role.name}</span>
                                {role.description && <span className="text-[10px] text-muted-foreground">{role.description}</span>}
                            </div>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
