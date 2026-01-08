'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Role } from '../services/role-service';
import { getOrganizationRoles } from '../services/role-service'; // We need a way to fetch this client-side or pass as prop
// Since role-service is server-side, we should probably fetch it in the parent or use a server action wrapper
// optimally, we pass the roles as props, or use swr/react-query. 
// For simplicity in this architecture, let's assume we pass roles or fetch on mount.

import { Shield, User, Lock, Crown } from 'lucide-react';

interface RolePickerProps {
    value: string; // role_id
    onValueChange: (roleId: string) => void;
    disabled?: boolean;
}

export function RolePicker({ value, onValueChange, disabled }: RolePickerProps) {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOrganizationRoles()
            .then(data => setRoles(data))
            .finally(() => setLoading(false));
    }, []);

    // Handle legacy values ('member', 'admin') or UUIDs
    const selectedRole = roles.find(r =>
        r.id === value ||
        (value === 'member' && (r.name === 'Member' || r.name === 'Miembro')) ||
        (value === 'admin' && (r.name === 'Admin' || r.name === 'Administrador')) ||
        (value === 'owner' && (r.name === 'Owner' || r.name === 'Dueño'))
    );

    // If we found a legacy match, we should ideally call onValueChange(id) to upgrade it,
    // but React setState in render is bad. We rely on the user selecting a new value 
    // or the parent handling the upgrade on save. 
    // For display purposes, selectedRole is now correct.

    const filteredRoles = roles.filter(r => {
        // Hide Owner role from list UNLESS the current user is already an Owner
        // (Prevents accidental assignment of Owner role which requires transfer)
        if (r.name === 'Owner' || r.name === 'Dueño') {
            return selectedRole?.id === r.id;
        }
        return true;
    });

    return (
        <Select value={selectedRole?.id || value} onValueChange={onValueChange} disabled={disabled || loading}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Cargando roles..." : "Selecciona un rol"}>
                    {selectedRole && (
                        <div className="flex items-center gap-2">
                            {(selectedRole.name === 'Owner' || selectedRole.name === 'Dueño') ? <Crown className="h-4 w-4 text-amber-500" /> :
                                (selectedRole.name === 'Admin' || selectedRole.name === 'Administrador') ? <Shield className="h-4 w-4 text-indigo-500" /> :
                                    <User className="h-4 w-4 text-gray-500" />
                            }
                            <span>{selectedRole.name}</span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {filteredRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                            {(role.name === 'Owner' || role.name === 'Dueño') ? <Crown className="h-4 w-4 text-amber-500" /> :
                                (role.name === 'Admin' || role.name === 'Administrador') ? <Shield className="h-4 w-4 text-indigo-500" /> :
                                    <User className="h-4 w-4 text-gray-500" />
                            }
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
