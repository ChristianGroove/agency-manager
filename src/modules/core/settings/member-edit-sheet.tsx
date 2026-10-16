"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Loader2,
    Save,
    Shield,
    User,
    Crown,
    MessageSquare,
    KeyRound,
    Mail,
    Phone,
    Briefcase,
    CheckCircle2,
    Clock,
    Ban,
    Send,
    Eye,
    EyeOff,
    ExternalLink,
    Trash2,
    Copy,
    Sparkles,
    Activity,
    AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    updateMemberRole,
    updateMemberPermissions,
    updateMemberProfile,
    updateMemberAgentConfig,
    sendMemberPasswordReset,
    resendMemberInvitation,
    setMemberPasswordManually,
    toggleMemberStatus,
    removeMember
} from "./actions/team"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
import { Role } from "@/modules/core/iam/services/role-service"
import { PERMISSION_GROUPS, getVisiblePermissionGroups, normalizeRoleRecord } from "@/modules/core/iam/actions/permissions"
import { useActiveModules } from "@/hooks/use-active-modules"
import { ChannelAccessSelector } from "@/modules/features/messaging/components/settings/channel-access-selector"
import { MemberPermissions } from "@/modules/core/iam/permissions/types"

interface MemberEditSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    member: {
        user_id: string
        role: string
        role_id?: string | null
        role_name?: string | null
        full_name?: string | null
        email?: string | null
        avatar_url?: string | null
        job_title?: string | null
        phone?: string | null
        status?: string | null
        account_state?: 'active' | 'pending_invite' | 'suspended'
        created_at?: string | null
        email_confirmed_at?: string | null
        last_sign_in_at?: string | null
        agent_availability?: {
            status?: string
            configured_status?: string
            is_online?: boolean
            current_load?: number
            max_capacity?: number
            auto_assign_enabled?: boolean
            last_seen_at?: string | null
        }
        user: {
            email: string
            full_name?: string | null
            avatar_url?: string | null
            job_title?: string | null
            phone?: string | null
            email_confirmed_at?: string | null
            last_sign_in_at?: string | null
        }
        permissions?: MemberPermissions
    } | null
    onSave?: () => void
    onNavigateToRoles?: () => void
    activeModules?: string[]
}

export function MemberEditSheet({
    open,
    onOpenChange,
    member,
    onSave,
    onNavigateToRoles,
    activeModules: propActiveModules
}: MemberEditSheetProps) {
    const router = useRouter()
    const [activeSection, setActiveSection] = useState<string>("profile")
    const { modules: hookActiveModules } = useActiveModules()

    const effectiveActiveModules = useMemo(() => {
        if (propActiveModules !== undefined) {
            return propActiveModules
        }
        return hookActiveModules || []
    }, [propActiveModules, hookActiveModules])

    const visiblePermissionGroups = useMemo(() => {
        return getVisiblePermissionGroups(effectiveActiveModules)
    }, [effectiveActiveModules])

    // 1. Profile state
    const [fullName, setFullName] = useState("")
    const [jobTitle, setJobTitle] = useState("")
    const [phone, setPhone] = useState("")
    const [isSavingProfile, setIsSavingProfile] = useState(false)

    // 2. Role & Overrides state
    const [selectedRoleId, setSelectedRoleId] = useState("")
    const [rawSelectedRoleObj, setSelectedRoleObj] = useState<Role | undefined>(undefined)
    const selectedRoleObj = useMemo(
        () => (rawSelectedRoleObj ? normalizeRoleRecord(rawSelectedRoleObj) : undefined),
        [rawSelectedRoleObj]
    )
    const [permissionOverrides, setPermissionOverrides] = useState<Record<string, boolean | null>>({})
    const [isSavingRole, setIsSavingRole] = useState(false)

    // 3. Inbox & Channels state
    const [authorizedChannels, setAuthorizedChannels] = useState<string[]>([])
    const [agentStatus, setAgentStatus] = useState<'online' | 'away' | 'offline'>('offline')
    const [maxCapacity, setMaxCapacity] = useState<number>(100)
    const [autoAssignEnabled, setAutoAssignEnabled] = useState<boolean>(true)
    const [isSavingInbox, setIsSavingInbox] = useState(false)

    // 4. Security & Access state
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSendingReset, setIsSendingReset] = useState(false)
    const [isResendingInvite, setIsResendingInvite] = useState(false)
    const [isSettingPassword, setIsSettingPassword] = useState(false)
    const [isTogglingStatus, setIsTogglingStatus] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)

    // Snapshot of loaded values to track unsaved changes per section
    const [initialSnapshot, setInitialSnapshot] = useState<{
        fullName: string
        jobTitle: string
        phone: string
        roleId: string
        overrides: Record<string, boolean | null>
        channels: string[]
        agentStatus: string
        maxCapacity: number
        autoAssignEnabled: boolean
    } | null>(null)

    const allKnownPermissionIds = useMemo(
        () => new Set(PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.id as string))),
        []
    )

    // Synchronize all states whenever `open` or `member` changes
    useEffect(() => {
        if (open && member) {
            const rawName = member.full_name || member.user?.full_name || ""
            const initFullName = rawName.toLowerCase() === "unknown" ? "" : rawName
            const initJobTitle = member.job_title || member.user?.job_title || (member.permissions as any)?.job_title || ""
            const initPhone = member.phone || member.user?.phone || (member.permissions as any)?.phone || ""
            const initRoleId = member.role_id || ""

            setFullName(initFullName)
            setJobTitle(initJobTitle)
            setPhone(initPhone)
            setSelectedRoleId(initRoleId)

            const rawPerms = (member.permissions as Record<string, any>) || {}
            const initialOverrides: Record<string, boolean | null> = {}
            for (const [k, v] of Object.entries(rawPerms)) {
                if (allKnownPermissionIds.has(k) && typeof v === "boolean") {
                    initialOverrides[k] = v
                }
            }
            if (rawPerms.features && typeof rawPerms.features === "object") {
                for (const [k, v] of Object.entries(rawPerms.features)) {
                    if (allKnownPermissionIds.has(k) && typeof v === "boolean" && initialOverrides[k] === undefined) {
                        initialOverrides[k] = v
                    }
                }
            }
            setPermissionOverrides(initialOverrides)

            const initChannels = rawPerms.inbox_access || []
            const initStatus = ((member.agent_availability?.configured_status || member.agent_availability?.status) as 'online' | 'away' | 'offline') || 'offline'
            const initCapacity = member.agent_availability?.max_capacity ?? 100
            const initAutoAssign = member.agent_availability?.auto_assign_enabled ?? true

            setAuthorizedChannels(initChannels)
            setAgentStatus(initStatus)
            setMaxCapacity(initCapacity)
            setAutoAssignEnabled(initAutoAssign)
            setNewPassword("")
            setConfirmPassword("")
            setActiveSection("profile")

            setInitialSnapshot({
                fullName: initFullName,
                jobTitle: initJobTitle,
                phone: initPhone,
                roleId: initRoleId,
                overrides: initialOverrides,
                channels: initChannels,
                agentStatus: initStatus,
                maxCapacity: initCapacity,
                autoAssignEnabled: initAutoAssign
            })
        }
    }, [open, member, allKnownPermissionIds])

    const hasProfileChanges = useMemo(() => {
        if (!initialSnapshot) return false
        return fullName.trim() !== initialSnapshot.fullName.trim() ||
               jobTitle.trim() !== initialSnapshot.jobTitle.trim() ||
               phone.trim() !== initialSnapshot.phone.trim()
    }, [initialSnapshot, fullName, jobTitle, phone])

    const hasRoleChanges = useMemo(() => {
        if (!initialSnapshot) return false
        if (selectedRoleId !== initialSnapshot.roleId) return true
        const curKeys = Object.keys(permissionOverrides)
        const initKeys = Object.keys(initialSnapshot.overrides)
        if (curKeys.length !== initKeys.length) return true
        for (const k of curKeys) {
            if (permissionOverrides[k] !== initialSnapshot.overrides[k]) return true
        }
        return false
    }, [initialSnapshot, selectedRoleId, permissionOverrides])

    const hasInboxChanges = useMemo(() => {
        if (!initialSnapshot) return false
        if (agentStatus !== initialSnapshot.agentStatus) return true
        if (maxCapacity !== initialSnapshot.maxCapacity) return true
        if (autoAssignEnabled !== initialSnapshot.autoAssignEnabled) return true
        if (authorizedChannels.length !== initialSnapshot.channels.length) return true
        const initSet = new Set(initialSnapshot.channels)
        return authorizedChannels.some(c => !initSet.has(c))
    }, [initialSnapshot, agentStatus, maxCapacity, autoAssignEnabled, authorizedChannels])

    const hasSecurityChanges = useMemo(() => {
        return newPassword.length > 0 || confirmPassword.length > 0
    }, [newPassword, confirmPassword])

    const hasUnsavedChangesInCurrentSection = useMemo(() => {
        if (activeSection === 'profile') return hasProfileChanges
        if (activeSection === 'role') return hasRoleChanges
        if (activeSection === 'inbox') return hasInboxChanges
        if (activeSection === 'security') return hasSecurityChanges
        return false
    }, [activeSection, hasProfileChanges, hasRoleChanges, hasInboxChanges, hasSecurityChanges])

    const hasAnyUnsavedChanges = useMemo(() => {
        return Boolean(hasProfileChanges || hasRoleChanges || hasInboxChanges || hasSecurityChanges)
    }, [hasProfileChanges, hasRoleChanges, hasInboxChanges, hasSecurityChanges])

    const isOwner = member?.role === 'owner' || (selectedRoleObj?.hierarchy_level ?? 0) >= 100
    const isSuspended = member?.status === 'blocked'
    const emailConfirmedAt = member?.email_confirmed_at || member?.user?.email_confirmed_at || null
    const lastSignInAt = member?.last_sign_in_at || member?.user?.last_sign_in_at || null
    const displayEmail = member?.email || member?.user?.email || "Sin correo"
    const displayName = fullName.trim() || member?.full_name || member?.user?.full_name || displayEmail.split("@")[0]

    const activeOverrideCount = useMemo(
        () => Object.values(permissionOverrides).filter(v => typeof v === "boolean").length,
        [permissionOverrides]
    )

    const rolePermissionsSummary = useMemo(() => {
        if (!selectedRoleObj) return []
        if (selectedRoleObj.permissions?.all === true || selectedRoleObj.hierarchy_level >= 100) {
            return [{ id: 'all', label: 'Acceso Total de Dueño', count: 'Todos los permisos' }]
        }
        return visiblePermissionGroups.map(group => {
            const enabled = group.permissions.filter(p => {
                const overrideVal = permissionOverrides[p.id]
                if (typeof overrideVal === 'boolean') return overrideVal
                return Boolean(selectedRoleObj.permissions?.[p.id] === true || selectedRoleObj.permissions?.all === true)
            })
            return {
                id: group.id,
                label: group.label,
                count: `${enabled.length}/${group.permissions.length}`,
                enabledCount: enabled.length,
                permissions: enabled.map(p => p.label)
            }
        }).filter(g => g.enabledCount > 0)
    }, [selectedRoleObj, permissionOverrides, visiblePermissionGroups])

    const hasGlobalInboxView = Boolean(
        isOwner ||
        permissionOverrides['inbox.conversations.global_view'] === true ||
        (permissionOverrides['inbox.conversations.global_view'] !== false && (
            selectedRoleObj?.permissions?.['inbox.conversations.global_view'] === true ||
            selectedRoleObj?.permissions?.all === true
        ))
    )

    const handleTogglePermissionOverride = (permId: string, nextChecked: boolean) => {
        const roleDefault = Boolean(selectedRoleObj?.permissions?.[permId] === true || selectedRoleObj?.permissions?.all === true)
        setPermissionOverrides(prev => ({
            ...prev,
            [permId]: nextChecked === roleDefault ? null : nextChecked
        }))
    }

    const handleResetOverridesToRole = () => {
        setPermissionOverrides(prev => {
            const cleared: Record<string, boolean | null> = {}
            for (const key of Object.keys(prev)) {
                cleared[key] = null
            }
            return cleared
        })
    }

    const handleSaveProfile = async () => {
        if (!member) return
        if (!fullName.trim() || fullName.trim().length < 2) {
            toast.error("Ingresa un nombre válido (mínimo 2 caracteres)")
            return
        }
        setIsSavingProfile(true)
        try {
            const res = await updateMemberProfile(member.user_id, {
                full_name: fullName.trim(),
                job_title: jobTitle.trim() || null,
                phone: phone.trim() || null
            })
            if (res.success) {
                toast.success("Ficha del miembro actualizada")
                setInitialSnapshot(prev => prev ? ({ ...prev, fullName: fullName.trim(), jobTitle: jobTitle.trim(), phone: phone.trim() }) : null)
                onSave?.()
            } else {
                toast.error(res.error || "No se pudo actualizar el perfil")
            }
        } catch {
            toast.error("Error inesperado al actualizar el perfil")
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleSaveRole = async () => {
        if (!member || !selectedRoleId) return
        setIsSavingRole(true)
        try {
            const res = await updateMemberRole(member.user_id, selectedRoleId)
            if (!res.success) {
                toast.error(res.error || "Error al actualizar rol")
                return
            }

            if (Object.keys(permissionOverrides).length > 0) {
                const permRes = await updateMemberPermissions(member.user_id, {
                    overrides: permissionOverrides
                })
                if (!permRes.success) {
                    toast.error(permRes.error || "Rol guardado, pero falló la actualización de excepciones")
                    return
                }
            }

            toast.success("Rol IAM y permisos actualizados correctamente")
            setInitialSnapshot(prev => prev ? ({ ...prev, roleId: selectedRoleId, overrides: { ...permissionOverrides } }) : null)
            onSave?.()
        } catch {
            toast.error("Error inesperado al actualizar el rol")
        } finally {
            setIsSavingRole(false)
        }
    }

    const handleSaveInbox = async () => {
        if (!member) return
        setIsSavingInbox(true)
        try {
            if (!isOwner) {
                const permRes = await updateMemberPermissions(member.user_id, {
                    inbox_access: authorizedChannels
                })
                if (!permRes.success) {
                    toast.error(permRes.error || "Error al guardar canales autorizados")
                    setIsSavingInbox(false)
                    return
                }
            }

            const agentRes = await updateMemberAgentConfig(member.user_id, {
                status: agentStatus,
                max_capacity: Number(maxCapacity) || 100,
                auto_assign_enabled: autoAssignEnabled
            })

            if (!agentRes.success) {
                toast.error(agentRes.error || "Error al guardar disponibilidad del agente")
                setIsSavingInbox(false)
                return
            }

            toast.success("Configuración de Agente e Inbox actualizada")
            setInitialSnapshot(prev => prev ? ({ ...prev, channels: [...authorizedChannels], agentStatus, maxCapacity: Number(maxCapacity) || 100, autoAssignEnabled }) : null)
            onSave?.()
        } catch {
            toast.error("Error inesperado al guardar configuración de Inbox")
        } finally {
            setIsSavingInbox(false)
        }
    }

    const handleSendPasswordReset = async () => {
        if (!member) return
        setIsSendingReset(true)
        try {
            const res = await sendMemberPasswordReset(member.user_id)
            if (res.success) {
                toast.success("Correo de recuperación enviado a " + displayEmail)
            } else {
                toast.error(res.error || "No se pudo enviar el enlace")
            }
        } catch {
            toast.error("Error inesperado al enviar correo de recuperación")
        } finally {
            setIsSendingReset(false)
        }
    }

    const handleResendInvite = async () => {
        if (!member) return
        setIsResendingInvite(true)
        try {
            const res = await resendMemberInvitation(member.user_id)
            if (res.success) {
                toast.success("Invitación reenviada a " + displayEmail)
            } else {
                toast.error(res.error || "No se pudo reenviar la invitación")
            }
        } catch {
            toast.error("Error inesperado al reenviar invitación")
        } finally {
            setIsResendingInvite(false)
        }
    }

    const handleSetManualPassword = async () => {
        if (!member) return
        if (newPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }
        setIsSettingPassword(true)
        try {
            const res = await setMemberPasswordManually(member.user_id, newPassword)
            if (res.success) {
                toast.success("Contraseña actualizada manualmente")
                setNewPassword("")
                setConfirmPassword("")
                onSave?.()
            } else {
                toast.error(res.error || "No se pudo cambiar la contraseña")
            }
        } catch {
            toast.error("Error inesperado al cambiar contraseña")
        } finally {
            setIsSettingPassword(false)
        }
    }

    const handleToggleSuspend = async () => {
        if (!member) return
        setIsTogglingStatus(true)
        try {
            const res = await toggleMemberStatus(member.user_id, member.status || 'active')
            if (res.success) {
                toast.success(res.status === 'blocked' ? "Miembro suspendido y desconectado del Inbox" : "Acceso del miembro reactivado")
                onSave?.()
                onOpenChange(false)
            } else {
                toast.error(res.error || "Error al cambiar estado del miembro")
            }
        } catch {
            toast.error("Error inesperado")
        } finally {
            setIsTogglingStatus(false)
        }
    }

    const handleRemoveMember = async () => {
        if (!member) return
        if (!confirm(`¿Seguro que deseas eliminar a ${displayName} de la organización? Se desasignarán sus conversaciones abiertas y canales.`)) {
            return
        }
        setIsRemoving(true)
        try {
            const res = await removeMember(member.user_id)
            if (res.success) {
                toast.success("Miembro eliminado de la organización")
                onSave?.()
                onOpenChange(false)
            } else {
                toast.error(res.error || "No se pudo eliminar el miembro")
            }
        } catch {
            toast.error("Error inesperado al eliminar miembro")
        } finally {
            setIsRemoving(false)
        }
    }

    const handleRequestClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            if (hasUnsavedChangesInCurrentSection || hasAnyUnsavedChanges) {
                const confirmed = window.confirm(
                    "Tienes cambios sin guardar en esta sección. ¿Estás seguro de que deseas cerrar la ficha?"
                )
                if (!confirmed) return
            }
            onOpenChange(false)
        } else {
            onOpenChange(true)
        }
    }

    const handleGoToRolesTab = () => {
        if (hasUnsavedChangesInCurrentSection || hasAnyUnsavedChanges) {
            const confirmed = window.confirm(
                "Tienes cambios sin guardar en esta sección. ¿Estás seguro de que deseas salir?"
            )
            if (!confirmed) return
        }
        onOpenChange(false)
        if (onNavigateToRoles) {
            onNavigateToRoles()
        } else {
            router.push("/platform/settings?tab=roles")
        }
    }

    const handleTabChange = (nextTab: string) => {
        if (nextTab === activeSection) return
        if (hasUnsavedChangesInCurrentSection) {
            const confirmed = window.confirm(
                "Tienes cambios sin guardar en esta pestaña. Si continúas, podrías perderlos. ¿Deseas cambiar de sección?"
            )
            if (!confirmed) return
        }
        setActiveSection(nextTab)
    }

    return (
        <Sheet open={open} onOpenChange={handleRequestClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 gap-0 border-none shadow-2xl mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden bg-transparent">
                <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl h-full flex flex-col overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-white/10">
                    {/* Header Integral */}
                    <div className="shrink-0 px-6 py-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white">
                        <div className="flex items-start gap-4">
                            {member?.avatar_url ? (
                                <img
                                    src={member.avatar_url}
                                    alt={displayName}
                                    className="h-14 w-14 rounded-2xl object-cover border-2 border-white/30 shadow-sm"
                                />
                            ) : (
                                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold border border-white/20 shrink-0">
                                    {(displayName?.[0] || displayEmail?.[0] || "U").toUpperCase()}
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <SheetTitle className="text-white text-lg font-semibold truncate">
                                        {displayName}
                                    </SheetTitle>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {isSuspended ? (
                                            <Badge className="bg-red-500/90 text-white border-none text-[10px] gap-1">
                                                <Ban className="h-3 w-3" /> Suspendido
                                            </Badge>
                                        ) : !emailConfirmedAt ? (
                                            <Badge className="bg-amber-500/90 text-white border-none text-[10px] gap-1">
                                                <Clock className="h-3 w-3" /> Invitación Pendiente
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500/90 text-white border-none text-[10px] gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Activo
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <SheetDescription className="text-white/85 text-xs truncate mt-0.5">
                                    {displayEmail}
                                </SheetDescription>

                                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                    <Badge variant="outline" className="bg-white/15 text-white border-white/20 py-0.5 h-5 text-[10px] gap-1">
                                        {isOwner ? (
                                            <><Crown className="h-3 w-3 text-amber-300" /> Dueño</>
                                        ) : (
                                            <><Shield className="h-3 w-3" /> {selectedRoleObj?.name || member?.role_name || "Miembro"}</>
                                        )}
                                    </Badge>
                                    {jobTitle && (
                                        <Badge variant="outline" className="bg-white/10 text-white/90 border-white/15 py-0.5 h-5 text-[10px] gap-1">
                                            <Briefcase className="h-2.5 w-2.5" /> {jobTitle}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs inside Sheet */}
                    <Tabs value={activeSection} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-3 pb-2.5 border-b bg-zinc-50/70 dark:bg-white/5 shrink-0 space-y-2">
                            <TabsList className="grid w-full grid-cols-4 h-9 bg-zinc-200/60 dark:bg-white/10 p-1 rounded-xl">
                                <TabsTrigger value="profile" className="text-xs rounded-lg gap-1.5 relative">
                                    <User className="h-3.5 w-3.5" /> Perfil
                                    {hasProfileChanges && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 absolute top-1 right-1" title="Cambios sin guardar" />}
                                </TabsTrigger>
                                <TabsTrigger value="role" className="text-xs rounded-lg gap-1.5 relative">
                                    <Shield className="h-3.5 w-3.5" /> Rol IAM
                                    {hasRoleChanges && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 absolute top-1 right-1" title="Cambios sin guardar" />}
                                </TabsTrigger>
                                <TabsTrigger value="inbox" className="text-xs rounded-lg gap-1.5 relative">
                                    <MessageSquare className="h-3.5 w-3.5" /> Inbox
                                    {hasInboxChanges && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 absolute top-1 right-1" title="Cambios sin guardar" />}
                                </TabsTrigger>
                                <TabsTrigger value="security" className="text-xs rounded-lg gap-1.5 relative">
                                    <KeyRound className="h-3.5 w-3.5" /> Seguridad
                                    {hasSecurityChanges && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 absolute top-1 right-1" title="Cambios sin guardar" />}
                                </TabsTrigger>
                            </TabsList>

                            {hasUnsavedChangesInCurrentSection && (
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>Tienes cambios sin guardar en esta pestaña. Asegúrate de pulsar &quot;Guardar&quot; para conservarlos.</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* SECTION 1: PROFILE & FICHA */}
                            <TabsContent value="profile" className="mt-0 space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="member-fullname" className="text-xs font-medium">Nombre Completo</Label>
                                        <div className="relative">
                                            <User className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                            <Input
                                                id="member-fullname"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Ej: Carlos Mendoza"
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="member-job" className="text-xs font-medium">Cargo / Posición</Label>
                                            <div className="relative">
                                                <Briefcase className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                                <Input
                                                    id="member-job"
                                                    value={jobTitle}
                                                    onChange={(e) => setJobTitle(e.target.value)}
                                                    placeholder="Ej: Ejecutivo Comercial"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="member-phone" className="text-xs font-medium">Teléfono / WhatsApp</Label>
                                            <div className="relative">
                                                <Phone className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                                <Input
                                                    id="member-phone"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="+57 300 000 0000"
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-zinc-500">Correo Electrónico (Identificador de cuenta)</Label>
                                        <div className="relative">
                                            <Mail className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                            <Input
                                                value={displayEmail}
                                                disabled
                                                className="pl-9 bg-zinc-50 dark:bg-white/5 text-zinc-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Ficha Técnica de Estado */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 p-4 space-y-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Estado Operativo de Cuenta</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">Verificación Email</span>
                                            {emailConfirmedAt ? (
                                                <span className="font-medium text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmado
                                                </span>
                                            ) : (
                                                <span className="font-medium text-amber-600 flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" /> Pendiente
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">Último Acceso</span>
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                                {lastSignInAt
                                                    ? format(new Date(lastSignInAt), "d MMM yyyy, HH:mm", { locale: es })
                                                    : "Sin ingresos"}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">Miembro Desde</span>
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                                {member?.created_at
                                                    ? format(new Date(member.created_at), "d MMM yyyy", { locale: es })
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                                    >
                                        {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Guardar Datos del Perfil
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* SECTION 2: ROLE & IAM PERMISSIONS */}
                            <TabsContent value="role" className="mt-0 space-y-5">
                                {member?.role === 'owner' ? (
                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 text-center space-y-2">
                                        <Crown className="h-9 w-9 text-amber-500 mx-auto" />
                                        <h3 className="font-semibold text-amber-900 dark:text-amber-200">Dueño de la Organización</h3>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                                            El Dueño posee jerarquía máxima (Nivel 100) y acceso irrestricto a todos los módulos, canales y configuraciones del Space.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">Rol IAM Asignado</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleGoToRolesTab}
                                                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                                                >
                                                    Gestionar Roles y Permisos
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <RolePicker
                                                value={selectedRoleId}
                                                legacyRole={member?.role}
                                                onValueChange={setSelectedRoleId}
                                                onRoleSelected={(r) => setSelectedRoleObj(r)}
                                            />
                                            <p className="text-xs text-zinc-500">
                                                El miembro heredará automáticamente la matriz de permisos configurada en este rol.
                                            </p>
                                        </div>

                                        {/* Resumen de permisos del rol seleccionado */}
                                        {selectedRoleObj && (
                                            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                            <Shield className="h-3.5 w-3.5 text-indigo-500" />
                                                            Resumen de Permisos: {selectedRoleObj.name}
                                                        </h4>
                                                        {selectedRoleObj.description && (
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">{selectedRoleObj.description}</p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        Jerarquía {selectedRoleObj.hierarchy_level}
                                                    </Badge>
                                                </div>

                                                {rolePermissionsSummary.length === 0 ? (
                                                    <p className="text-xs text-zinc-500 italic">
                                                        Este rol no tiene permisos administrativos especiales activados (acceso básico operativo).
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                        {rolePermissionsSummary.map(item => (
                                                            <div
                                                                key={item.id}
                                                                className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 flex items-center justify-between"
                                                            >
                                                                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate pr-2">
                                                                    {item.label}
                                                                </span>
                                                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                                                    {item.count}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Excepciones Individuales (Overrides por Miembro) */}
                                        {selectedRoleObj && selectedRoleObj.permissions?.all !== true && selectedRoleObj.hierarchy_level < 100 && (
                                            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                                            Excepciones Individuales (Overrides)
                                                        </h4>
                                                        <p className="text-[11px] text-zinc-500">
                                                            Habilita o restringe permisos puntuales para este miembro sin modificar el rol general.
                                                        </p>
                                                    </div>
                                                    {activeOverrideCount > 0 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleResetOverridesToRole}
                                                            className="h-7 text-[11px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                                                        >
                                                            Restaurar al rol ({activeOverrideCount})
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
                                                    {visiblePermissionGroups.map(group => (
                                                        <div key={group.id} className="space-y-1.5">
                                                            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                                                {group.label}
                                                            </div>
                                                            <div className="space-y-1">
                                                                {group.permissions.map(perm => {
                                                                    const roleDefault = Boolean(selectedRoleObj.permissions?.[perm.id] === true || selectedRoleObj.permissions?.all === true)
                                                                    const overrideVal = permissionOverrides[perm.id]
                                                                    const effectiveChecked = typeof overrideVal === 'boolean' ? overrideVal : roleDefault
                                                                    const isOverrideGrant = overrideVal === true && !roleDefault
                                                                    const isOverrideDeny = overrideVal === false && roleDefault

                                                                    return (
                                                                        <div
                                                                            key={perm.id}
                                                                            className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-zinc-50/70 dark:bg-white/5 border border-zinc-100 dark:border-white/5"
                                                                        >
                                                                            <div className="min-w-0 pr-2">
                                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                                                                        {perm.label}
                                                                                    </span>
                                                                                    {isOverrideGrant ? (
                                                                                        <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                                                                            Override +
                                                                                        </Badge>
                                                                                    ) : isOverrideDeny ? (
                                                                                        <Badge className="h-4 px-1.5 text-[9px] bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                                                                            Bloqueado −
                                                                                        </Badge>
                                                                                    ) : effectiveChecked ? (
                                                                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-indigo-600 border-indigo-200">
                                                                                            Heredado del rol
                                                                                        </Badge>
                                                                                    ) : null}
                                                                                </div>
                                                                            </div>
                                                                            <Switch
                                                                                checked={effectiveChecked}
                                                                                onCheckedChange={(checked) => handleTogglePermissionOverride(perm.id, checked)}
                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGoToRolesTab}
                                                className="gap-1.5 text-xs"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                                                Personalizar matriz de roles
                                            </Button>

                                            <Button
                                                onClick={handleSaveRole}
                                                disabled={isSavingRole || !selectedRoleId}
                                                className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                                            >
                                                {isSavingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Guardar Rol y Permisos
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </TabsContent>

                            {/* SECTION 3: INBOX AGENT & CHANNELS */}
                            <TabsContent value="inbox" className="mt-0 space-y-5">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-brand-pink" />
                                            Canales Autorizados en el Inbox
                                        </Label>
                                        {hasGlobalInboxView && (
                                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
                                                Vista Global Activa
                                            </Badge>
                                        )}
                                    </div>

                                    {hasGlobalInboxView && (
                                        <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-800 dark:text-indigo-200">
                                            Este miembro posee <strong>Vista Global de Canales</strong> por su rol. Puede supervisar todas las conversaciones del Inbox sin restricción de canal.
                                        </div>
                                    )}

                                    <ChannelAccessSelector
                                        selectedIds={authorizedChannels}
                                        onChange={setAuthorizedChannels}
                                        disabled={isOwner}
                                    />
                                    <p className="text-[11px] text-zinc-500">
                                        Los canales seleccionados se sincronizan automáticamente con el enrutador de conversaciones (<code>agent_channels</code>) para la asignación de chats.
                                    </p>
                                </div>

                                {/* Agent Availability Config */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5 text-emerald-500" />
                                            Disponibilidad y Capacidad del Agente
                                        </h4>
                                        <Badge variant="outline" className="text-[10px]">
                                            Carga actual: {member?.agent_availability?.current_load ?? 0} chats activos
                                        </Badge>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Estado en Bandeja</Label>
                                            <Select
                                                value={agentStatus}
                                                onValueChange={(v) => setAgentStatus(v as 'online' | 'away' | 'offline')}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-zinc-900">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="online">🟢 En línea (Recibe chats)</SelectItem>
                                                    <SelectItem value="away">🟡 Ausente</SelectItem>
                                                    <SelectItem value="offline">⚪ Desconectado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[11px] text-zinc-500 mt-1">
                                                Configura el modo de servicio del agente al iniciar sesión. La presencia efectiva depende del latido activo.
                                            </p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="agent-capacity" className="text-xs">Capacidad Máxima Simultánea</Label>
                                            <Input
                                                id="agent-capacity"
                                                type="number"
                                                min={1}
                                                max={500}
                                                value={maxCapacity}
                                                onChange={(e) => setMaxCapacity(Number(e.target.value) || 1)}
                                                className="bg-white dark:bg-zinc-900"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                        <div className="space-y-0.5 pr-4">
                                            <Label className="text-xs font-medium">Auto-Asignación de Conversaciones</Label>
                                            <p className="text-[11px] text-zinc-500">
                                                Permite que el motor Round-Robin / Load-Balance le asigne nuevos chats entrantes.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={autoAssignEnabled}
                                            onCheckedChange={setAutoAssignEnabled}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleSaveInbox}
                                        disabled={isSavingInbox}
                                        className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                                    >
                                        {isSavingInbox ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Guardar Configuración de Inbox
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* SECTION 4: SECURITY & CREDENTIALS */}
                            <TabsContent value="security" className="mt-0 space-y-5">
                                {/* 4.1 Password Recovery & Invite Links */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-zinc-900">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                                Recuperación y Acceso por Correo
                                            </h4>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                Envía un enlace seguro a <strong>{displayEmail}</strong> para restablecer su contraseña o activar su invitación.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={isSendingReset}
                                            onClick={handleSendPasswordReset}
                                            className="gap-1.5 text-xs"
                                        >
                                            {isSendingReset ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-indigo-600" />}
                                            Enviar link de recuperación
                                        </Button>

                                        <Button
                                            type="button"
                                            variant={!emailConfirmedAt ? "default" : "outline"}
                                            size="sm"
                                            disabled={isResendingInvite}
                                            onClick={handleResendInvite}
                                            className="gap-1.5 text-xs"
                                        >
                                            {isResendingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                                            Reenviar invitación
                                        </Button>
                                    </div>
                                </div>

                                {/* 4.2 Manual Password Assignment */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-zinc-900">
                                    <div>
                                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                            Asignar Contraseña Manualmente
                                        </h4>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            Establece una nueva contraseña directa si el miembro pertenece exclusivamente a esta organización.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-new-pass" className="text-xs">Nueva Contraseña</Label>
                                            <div className="relative">
                                                <Input
                                                    id="manual-new-pass"
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="Mínimo 6 caracteres"
                                                    className="pr-9"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-confirm-pass" className="text-xs">Confirmar Contraseña</Label>
                                            <Input
                                                id="manual-confirm-pass"
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Repite la contraseña"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            size="sm"
                                            disabled={isSettingPassword || !newPassword}
                                            onClick={handleSetManualPassword}
                                            className="gap-1.5 text-xs"
                                        >
                                            {isSettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                                            Actualizar Contraseña
                                        </Button>
                                    </div>
                                </div>

                                {/* 4.3 Account Suspension & Removal */}
                                {member?.role !== 'owner' && (
                                    <div className="rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 p-4 space-y-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">
                                                Control de Acceso y Baja
                                            </h4>
                                            <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-0.5">
                                                Al suspender el acceso, el miembro no podrá entrar a la plataforma y pasará automáticamente a desconectado en el Inbox.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isTogglingStatus}
                                                onClick={handleToggleSuspend}
                                                className={isSuspended
                                                    ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs gap-1.5"
                                                    : "border-amber-300 text-amber-800 hover:bg-amber-50 text-xs gap-1.5"
                                                }
                                            >
                                                {isTogglingStatus ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : isSuspended ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Ban className="h-3.5 w-3.5" />
                                                )}
                                                {isSuspended ? "Reactivar Acceso del Miembro" : "Suspender / Bloquear Acceso"}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                disabled={isRemoving}
                                                onClick={handleRemoveMember}
                                                className="text-xs gap-1.5"
                                            >
                                                {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                Eliminar del Equipo
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer */}
                    <div className="shrink-0 px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">
                            ID: {member?.user_id?.slice(0, 8)}...
                        </span>
                        <Button variant="outline" size="sm" onClick={() => handleRequestClose(false)}>
                            Cerrar Ficha
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
