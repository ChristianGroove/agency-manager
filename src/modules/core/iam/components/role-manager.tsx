'use client';

import { useState } from 'react';
import { Role } from '../services/role-service';
import { Button } from '@/components/ui/button';
import { Plus, Search, Shield, Users, Lock, MoreVertical, Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RoleEditor } from './role-editor';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { createRole, deleteRole } from "../actions"; // We'll need a server action wrapper

interface RoleManagerProps {
    initialRoles: Role[];
}

export function RoleManager({ initialRoles }: RoleManagerProps) {
    const [roles, setRoles] = useState<Role[]>(initialRoles);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(initialRoles[0]?.id || null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const activeRole = roles.find(r => r.id === selectedRoleId);

    const filteredRoles = roles.filter(role =>
        (role.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateRole = async () => {
        setIsCreating(true);
        try {
            // Optimistic update or wait for editor?
            // Let's create a blank "New Role" and select it
            const newRole = await createRole({
                name: 'New Custom Role',
                description: 'Define custom permissions',
                permissions: {},
                hierarchy_level: 1
            });

            if (newRole) {
                setRoles(prev => [...prev, newRole]);
                setSelectedRoleId(newRole.id);
                toast.success('New role created');
            }
        } catch (error) {
            toast.error('Failed to create role');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!confirm('Are you sure you want to delete this role? assigned members will lose access.')) return;

        try {
            await deleteRole(roleId);
            setRoles(prev => prev.filter(r => r.id !== roleId));
            if (selectedRoleId === roleId) {
                setSelectedRoleId(roles[0]?.id || null);
            }
            toast.success('Role deleted');
        } catch (error) {
            toast.error('Failed to delete role');
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden rounded-xl border bg-background shadow-sm">
            {/* Left Sidebar: Role List */}
            <div className="w-80 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-sm">Roles</h2>
                        <Button size="sm" variant="outline" onClick={handleCreateRole} disabled={isCreating}>
                            <Plus className="h-3 w-3 mr-1" />
                            New Role
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search roles..."
                            className="pl-8 h-9 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1">
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
                                <div className="flex flex-col gap-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{role.name}</span>
                                        {role.is_system_role && <Lock className="h-3 w-3 text-muted-foreground/70" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>{role.member_count || 0} members</span>
                                        {role.is_system_role && <Badge variant="secondary" className="h-4 px-1 text-[10px]">System</Badge>}
                                    </div>
                                </div>

                                {!role.is_system_role && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* Clone logic */ }}>
                                                <Copy className="h-3 w-3 mr-2" /> Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                                            >
                                                <Trash2 className="h-3 w-3 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Right Panel: Role Editor */}
            <div className="flex-1 flex flex-col bg-background">
                {activeRole ? (
                    <RoleEditor
                        role={activeRole}
                        key={activeRole.id} // Re-mount on role change
                        onUpdate={(updatedRole: Role) => {
                            setRoles(prev => prev.map(r => r.id === updatedRole.id ? updatedRole : r));
                        }}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Select a role to view permissions
                    </div>
                )}
            </div>
        </div>
    );
}
