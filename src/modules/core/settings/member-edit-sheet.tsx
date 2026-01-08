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
    updateMemberRole
} from "./actions/team-actions"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
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
    const [viewMode, setViewMode] = useState<'assign' | 'manage_roles'>('assign')
    const [isSaving, setIsSaving] = useState(false)
    const [role, setRole] = useState(member?.role || 'member')

    // Reset view when opening different member
    useEffect(() => {
        if (open) {
            setViewMode('assign')
            setRole(member?.role || 'member')
        }
    }, [open, member])

    // Update role state when member changes
    useEffect(() => {
        if (member) {
            setRole(member.role)
        }
    }, [member])

    const handleSaveAssignment = async () => {
        if (!member) return
        setIsSaving(true)
        try {
            if (role !== member.role) {
                const result = await updateMemberRole(member.user_id, role)
                if (!result.success) {
                    toast.error(result.error)
                    return
                }
                toast.success("Rol actualizado correctamente")
                onSave?.()
                onOpenChange(false)
            } else {
                onOpenChange(false)
            }
        } catch (error) {
            toast.error("Error al actualizar rol")
        } finally {
            setIsSaving(false)
        }
    }

    const isOwner = member?.role === 'owner'

    // Import RoleManager dynamically or just use the imported component
    // We need to pass props to RoleManager to let it function inside the sheet
    // For now we will render a simplified wrapper or the component itself if it fits. 
    // The current RoleManager is designed for a full page. We might need to adjust it or wrap it.
    // Let's render the RoleManager but maybe hide the sidebar if it's too cramped?
    // Actually, the user wants "Role Config" here.

    // We need to import RoleManager at top level. 
    // Assuming RoleManager is imported (I will ensure imports in next step or use replace_file efficiently)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className={cn(
                "w-full p-0 gap-0 border-none shadow-2xl mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6 bg-transparent",
                viewMode === 'manage_roles' ? "sm:max-w-4xl" : "sm:max-w-md"
            )}>
                <div className="bg-white/95 backdrop-blur-xl h-full flex flex-col overflow-hidden rounded-3xl border border-gray-100">

                    {/* View: ASSIGN MEMBER */}
                    {viewMode === 'assign' && (
                        <>
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

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {isOwner ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                                        <Crown className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                        <h3 className="font-medium text-amber-900">Permisos de Dueño</h3>
                                        <p className="text-sm text-amber-700 mt-1">
                                            El dueño tiene acceso completo a todos los recursos.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm font-medium text-gray-700">Rol Asignado</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    onClick={() => setViewMode('manage_roles')}
                                                >
                                                    Configurar Roles
                                                </Button>
                                            </div>
                                            <RolePicker
                                                value={role}
                                                onValueChange={(val) => setRole(val)}
                                            />
                                            <p className="text-xs text-gray-500">
                                                El usuario heredará todos los permisos definidos para este rol.
                                            </p>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                            <div className="flex gap-2">
                                                <Shield className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                                <div className="text-xs text-blue-700">
                                                    <span className="font-medium">Modelo de Seguridad Unificado:</span><br />
                                                    Ya no es necesario configurar permisos individuales. Simplemente asigna el rol correcto o crea uno nuevo en "Configurar Roles" si necesitas un set de permisos específico.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 px-6 py-4 bg-white border-t flex justify-end gap-3">
                                <Button variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSaveAssignment}
                                    disabled={isSaving || isOwner}
                                    className="bg-brand-pink hover:bg-brand-pink/90"
                                >
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Asignación
                                </Button>
                            </div>
                        </>
                    )}

                    {/* View: MANAGE ROLES */}
                    {viewMode === 'manage_roles' && (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center gap-2 p-4 border-b bg-gray-50/50">
                                <Button variant="ghost" size="sm" onClick={() => setViewMode('assign')}>
                                    <ChevronDown className="h-4 w-4 rotate-90 mr-1" />
                                    Volver
                                </Button>
                                <h3 className="font-medium text-gray-900">Gestor de Roles y Permisos</h3>
                            </div>
                            <div className="flex-1 overflow-hidden p-0">
                                {/* Embed RoleManager here. We'll verify the import in next steps */}
                                <RoleManagerWrapper />
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

function RoleManagerWrapper() {
    // Dynamically loading or rendering Role Manager
    // Since RoleManager needs initialRoles, and we are in a client component, 
    // ideally we fetch them or RoleManager handles its own fetching.
    // Our RoleManager currently expects `initialRoles`. 
    // We should probably update RoleManager to fetch its own roles if not provided, or fetch here.
    // For speed, let's just render a placeholder that says "Loading..." and fetch roles?
    // Actually, RoleManager refactor to fetch on mount is safer for this usage.

    // TEMPORARY: Importing RoleManager from inside (we will add import at top)
    const { RoleManager } = require("@/modules/core/iam/components/role-manager")
    const { getOrganizationRoles } = require("@/modules/core/iam/services/role-service")
    const [roles, setRoles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getOrganizationRoles().then((data: any) => {
            setRoles(data)
            setLoading(false)
        })
    }, [])

    if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gray-300" /></div>

    return <RoleManager initialRoles={roles} />
}
