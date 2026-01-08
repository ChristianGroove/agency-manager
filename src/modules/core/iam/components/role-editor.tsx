'use client';

import { useState } from 'react';
import { Role } from '../services/role-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PERMISSION_GROUPS, PERMISSIONS } from '../permissions';
import { updateRole } from '../actions'; // Server action
import { toast } from 'sonner';
import { Save, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface RoleEditorProps {
    role: Role;
    onUpdate: (role: Role) => void;
}

export function RoleEditor({ role, onUpdate }: RoleEditorProps) {
    const [name, setName] = useState(role.name);
    const [description, setDescription] = useState(role.description || '');
    const [permissions, setPermissions] = useState<Record<string, boolean>>(role.permissions || {});
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const handlePermissionToggle = (permissionId: string, checked: boolean) => {
        setPermissions(prev => ({
            ...prev,
            [permissionId]: checked
        }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedRole = await updateRole({
                id: role.id,
                name,
                description,
                permissions,
                // Pass existing fields
                is_system_role: role.is_system_role,
                organization_id: role.organization_id // Assuming needed for security check in action
            });

            onUpdate(updatedRole);
            setIsDirty(false);
            toast.success('Role permissions updated');
        } catch (error) {
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    // Calculate stats
    const totalPermissions = PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);
    const enabledCount = Object.values(permissions).filter(Boolean).length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex items-start justify-between bg-white w-full">
                <div className="space-y-1 w-full max-w-lg">
                    {role.is_system_role ? (
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                {role.name}
                                <Badge variant="secondary" className="ml-2">System Role</Badge>
                            </h1>
                            <p className="text-muted-foreground">{role.description}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <Input
                                value={name}
                                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                                className="text-xl font-bold h-auto px-2 py-1 -ml-2 border-transparent hover:border-input focus:border-input bg-transparent"
                            />
                            <Input
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                                placeholder="Add a description..."
                                className="text-sm text-muted-foreground h-auto px-2 py-1 -ml-2 border-transparent hover:border-input focus:border-input bg-transparent"
                            />
                        </div>
                    )}
                </div>

                <Button onClick={handleSave} disabled={!isDirty || isSaving}>
                    {isSaving ? (
                        <span className="flex items-center">Saving...</span>
                    ) : (
                        <span className="flex items-center">
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </span>
                    )}
                </Button>
            </div>

            {/* Permission Matrix */}
            <ScrollArea className="flex-1 bg-slate-50 p-6">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Stats Card */}
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">Access Control</h3>
                                <p className="text-xs text-muted-foreground">{enabledCount} of {totalPermissions} permissions enabled</p>
                            </div>
                        </div>
                        {role.permissions['all'] === true && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Full Admin Access
                            </Badge>
                        )}
                    </div>

                    {/* Permission Groups */}
                    <Accordion type="single" collapsible defaultValue="crm" className="w-full space-y-4">
                        {PERMISSION_GROUPS.map((group) => {
                            // Check count for badge
                            const groupEnabledCount = group.permissions.filter(p => permissions[p.id]).length;
                            const isFull = groupEnabledCount === group.permissions.length;

                            return (
                                <AccordionItem key={group.id} value={group.id} className="bg-white border rounded-lg px-4 border-b-0">
                                    <AccordionTrigger className="hover:no-underline py-4">
                                        <div className="flex items-center gap-4 w-full">
                                            <div className="text-left flex-1">
                                                <h4 className="font-medium text-sm">{group.label}</h4>
                                                <p className="text-xs text-muted-foreground">{group.description}</p>
                                            </div>
                                            <div className="mr-4">
                                                {isFull ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> All
                                                    </Badge>
                                                ) : groupEnabledCount > 0 && (
                                                    <Badge variant="secondary">{groupEnabledCount} enabled</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-0 pb-4">
                                        <Separator className="mb-4" />
                                        <div className="grid gap-4">
                                            {group.permissions.map((perm) => (
                                                <div key={perm.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                                    <Switch
                                                        id={perm.id}
                                                        checked={permissions[perm.id] === true || permissions['all'] === true}
                                                        disabled={permissions['all'] === true} // Owner supersedes
                                                        onCheckedChange={(checked) => handlePermissionToggle(perm.id, checked)}
                                                    />
                                                    <div className="grid gap-1.5 leading-none">
                                                        <label
                                                            htmlFor={perm.id}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                        >
                                                            {perm.label}
                                                        </label>
                                                        <p className="text-xs text-muted-foreground">
                                                            {perm.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
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
