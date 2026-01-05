"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, Shield, ChevronDown, ChevronRight, User, Crown, Users } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    updateMemberRole,
    updateMemberPermissions,
    getMemberPermissions
} from "./actions/team-actions"
import {
    AVAILABLE_MODULES,
    PERMISSION_CATEGORIES,
    getEffectivePermissions,
    DEFAULT_PERMISSIONS_BY_ROLE
} from "@/lib/permissions/defaults"
import { MemberPermissions, FeaturePermissions, ModulePermissions } from "@/lib/permissions/types"

interface MemberEditSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    member: {
        user_id: string
        role: string
        user: {
            email: string
            full_name?: string | null
            avatar_url?: string | null
        }
    } | null
    onSave?: () => void
    activeModules?: string[] // Org-level active modules
}

export function MemberEditSheet({
    open,
    onOpenChange,
    member,
    onSave,
    activeModules = []
}: MemberEditSheetProps) {
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [role, setRole] = useState(member?.role || 'member')
    const [permissions, setPermissions] = useState<MemberPermissions>({})
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

    // Load member permissions on open
    useEffect(() => {
        if (open && member) {
            loadPermissions()
        }
    }, [open, member?.user_id])

    const loadPermissions = async () => {
        if (!member) return
        setIsLoading(true)
        try {
            const data = await getMemberPermissions(member.user_id)
            if (data) {
                setRole(data.role)
                setPermissions(data.permissions)
            } else {
                // Fallback to defaults
                setPermissions(getEffectivePermissions(member.role))
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar permisos")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRoleChange = async (newRole: string) => {
        if (newRole === 'owner') return // Can't assign owner
        setRole(newRole)
        // Update permissions to new role defaults (user can still customize)
        setPermissions(getEffectivePermissions(newRole))
    }

    const handleModuleToggle = (moduleId: string, enabled: boolean) => {
        setPermissions(prev => ({
            ...prev,
            modules: {
                ...prev.modules,
                [moduleId]: enabled
            }
        }))
    }

    const handleFeatureToggle = (feature: keyof FeaturePermissions, enabled: boolean) => {
        setPermissions(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [feature]: enabled
            }
        }))
    }

    const handleSave = async () => {
        if (!member) return
        setIsSaving(true)
        try {
            // Update role if changed
            if (role !== member.role && role !== 'owner') {
                const roleResult = await updateMemberRole(member.user_id, role as 'admin' | 'member')
                if (!roleResult.success) {
                    toast.error(roleResult.error)
                    setIsSaving(false)
                    return
                }
            }

            // Update permissions
            const permResult = await updateMemberPermissions(member.user_id, {
                modules: permissions.modules as Record<string, boolean> | undefined,
                features: permissions.features as Record<string, boolean> | undefined,
            })
            if (!permResult.success) {
                toast.error(permResult.error)
                setIsSaving(false)
                return
            }

            toast.success("Permisos actualizados")
            onSave?.()
            onOpenChange(false)
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsSaving(false)
        }
    }

    const toggleCategory = (id: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    const isOwner = member?.role === 'owner'

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg w-full p-0 gap-0 border-none shadow-2xl mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6 bg-transparent">
                <div className="bg-white/95 backdrop-blur-xl h-full flex flex-col overflow-hidden rounded-3xl border border-gray-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 shrink-0 px-6 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                {(member?.user.email?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <SheetTitle className="text-white text-lg">
                                    {member?.user.full_name || 'Sin Nombre'}
                                </SheetTitle>
                                <SheetDescription className="text-white/80 text-sm">
                                    {member?.user.email}
                                </SheetDescription>
                                <div className="mt-1">
                                    <Badge variant={isOwner ? "default" : "secondary"} className="bg-white/20 text-white border-none">
                                        {isOwner ? (
                                            <><Crown className="h-3 w-3 mr-1" /> Dueño</>
                                        ) : role === 'admin' ? (
                                            <><Shield className="h-3 w-3 mr-1" /> Admin</>
                                        ) : (
                                            <><User className="h-3 w-3 mr-1" /> Miembro</>
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : isOwner ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                <h3 className="font-medium text-amber-900">Permisos de Dueño</h3>
                                <p className="text-sm text-amber-700 mt-1">
                                    El dueño tiene acceso completo a todos los módulos y funcionalidades.
                                    Sus permisos no pueden ser modificados.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Role Selector */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Rol del Usuario</Label>
                                    <Select value={role} onValueChange={handleRoleChange}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">
                                                <div className="flex items-center gap-2">
                                                    <Shield className="h-4 w-4 text-indigo-500" />
                                                    <span>Administrador</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="member">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-500" />
                                                    <span>Miembro</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500">
                                        {role === 'admin'
                                            ? "Los administradores tienen acceso completo por defecto, pero puedes restringir permisos específicos."
                                            : "Los miembros tienen acceso limitado. Activa los módulos y permisos que necesitan."
                                        }
                                    </p>
                                </div>

                                {/* Module Access */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-500" />
                                        <Label className="text-sm font-medium text-gray-700">Acceso a Módulos</Label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_MODULES
                                            .filter(m => !m.vertical || m.vertical.length === 0) // Filter out vertical-specific for now
                                            .map(module => {
                                                const isEnabled = permissions.modules?.[module.id as keyof ModulePermissions] ?? false
                                                return (
                                                    <div
                                                        key={module.id}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                                            isEnabled
                                                                ? "bg-indigo-50 border-indigo-200"
                                                                : "bg-gray-50 border-gray-200"
                                                        )}
                                                    >
                                                        <span className={cn(
                                                            "text-sm font-medium",
                                                            isEnabled ? "text-indigo-700" : "text-gray-600"
                                                        )}>
                                                            {module.label}
                                                        </span>
                                                        <Switch
                                                            checked={isEnabled}
                                                            onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                                                        />
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                </div>

                                {/* Feature Permissions */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-gray-500" />
                                        <Label className="text-sm font-medium text-gray-700">Permisos Detallados</Label>
                                    </div>
                                    <div className="space-y-2">
                                        {PERMISSION_CATEGORIES.map(category => {
                                            const isExpanded = expandedCategories[category.id] ?? false
                                            return (
                                                <div key={category.id} className="border rounded-lg overflow-hidden">
                                                    <button
                                                        onClick={() => toggleCategory(category.id)}
                                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                                    >
                                                        <span className="text-sm font-medium text-gray-700">{category.label}</span>
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4 text-gray-500" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-gray-500" />
                                                        )}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="p-3 space-y-3 bg-white">
                                                            {category.permissions.map(perm => {
                                                                const isEnabled = permissions.features?.[perm.key] ?? false
                                                                return (
                                                                    <div key={perm.key} className="flex items-center justify-between">
                                                                        <div>
                                                                            <span className="text-sm text-gray-700">{perm.label}</span>
                                                                            {perm.description && (
                                                                                <p className="text-xs text-gray-500">{perm.description}</p>
                                                                            )}
                                                                        </div>
                                                                        <Switch
                                                                            checked={isEnabled}
                                                                            onCheckedChange={(checked) => handleFeatureToggle(perm.key, checked)}
                                                                        />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!isOwner && (
                        <div className="sticky bottom-0 px-6 py-4 bg-white border-t flex justify-end gap-3">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cambios
                            </Button>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
