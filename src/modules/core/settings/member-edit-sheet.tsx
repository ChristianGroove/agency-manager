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
    AlertTriangle,
    X
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useLocalizedIam } from "@/modules/core/iam/actions/use-localized-iam"
import {
    updateMemberRole,
    updateMemberPermissions,
    updateMemberProfile,
    sendMemberPasswordReset,
    resendMemberInvitation,
    setMemberPasswordManually
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
    const { t, locale, getGroupInfo, getPermissionInfo, getRoleInfo } = useLocalizedIam()
    const dateLocale = locale === 'en' ? enUS : es
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
    const [isInboxEnabled, setIsInboxEnabled] = useState<boolean>(true)
    const [authorizedChannels, setAuthorizedChannels] = useState<string[]>([])
    const [isSavingInbox, setIsSavingInbox] = useState(false)

    // 4. Security & Access state
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isSendingReset, setIsSendingReset] = useState(false)
    const [isResendingInvite, setIsResendingInvite] = useState(false)
    const [isSettingPassword, setIsSettingPassword] = useState(false)

    // Snapshot of loaded values to track unsaved changes per section
    const [initialSnapshot, setInitialSnapshot] = useState<{
        fullName: string
        jobTitle: string
        phone: string
        roleId: string
        overrides: Record<string, boolean | null>
        channels: string[]
        isInboxEnabled: boolean
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
            const overrideInbox = initialOverrides['inbox.view'] ?? (rawPerms['inbox.view'])
            const initInboxEnabled = overrideInbox !== undefined ? Boolean(overrideInbox) : true

            setAuthorizedChannels(initChannels)
            setIsInboxEnabled(initInboxEnabled)
            setNewPassword("")
            setConfirmPassword("")
            if (!initialSnapshot) {
                setActiveSection("profile")
            }

            setInitialSnapshot({
                fullName: initFullName,
                jobTitle: initJobTitle,
                phone: initPhone,
                roleId: initRoleId,
                overrides: initialOverrides,
                channels: initChannels,
                isInboxEnabled: initInboxEnabled
            })
        }
    }, [open, member, allKnownPermissionIds])

    useEffect(() => {
        if (!open) {
            setInitialSnapshot(null)
            setActiveSection("profile")
            setNewPassword("")
            setConfirmPassword("")
        }
    }, [open])

    const hasProfileChanges = useMemo(() => {
        if (!initialSnapshot) return false
        return fullName.trim() !== initialSnapshot.fullName.trim() ||
               jobTitle.trim() !== initialSnapshot.jobTitle.trim() ||
               phone.trim() !== initialSnapshot.phone.trim()
    }, [initialSnapshot, fullName, jobTitle, phone])

    const hasRoleChanges = useMemo(() => {
        if (!initialSnapshot) return false
        const initRoleId = initialSnapshot.roleId || ""
        const curRoleId = selectedRoleId || ""
        if (initRoleId && curRoleId && initRoleId !== curRoleId) {
            return true
        }
        const allKeys = new Set([
            ...Object.keys(permissionOverrides),
            ...Object.keys(initialSnapshot.overrides)
        ])
        for (const k of allKeys) {
            const cur = typeof permissionOverrides[k] === 'boolean' ? permissionOverrides[k] : null
            const init = typeof initialSnapshot.overrides[k] === 'boolean' ? initialSnapshot.overrides[k] : null
            if (cur !== init) return true
        }
        return false
    }, [initialSnapshot, selectedRoleId, permissionOverrides])

    const hasInboxChanges = useMemo(() => {
        if (!initialSnapshot) return false
        if (Boolean(isInboxEnabled) !== Boolean(initialSnapshot.isInboxEnabled)) return true
        const curChannels = [...authorizedChannels].sort().join(',')
        const initChannels = [...initialSnapshot.channels].sort().join(',')
        return curChannels !== initChannels
    }, [initialSnapshot, isInboxEnabled, authorizedChannels])

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

    const isCurrentTabSaving = useMemo(() => {
        if (activeSection === 'profile') return isSavingProfile
        if (activeSection === 'role') return isSavingRole
        if (activeSection === 'inbox') return isSavingInbox
        if (activeSection === 'security') return isSettingPassword
        return false
    }, [activeSection, isSavingProfile, isSavingRole, isSavingInbox, isSettingPassword])

    const handleSaveCurrentTab = async () => {
        if (activeSection === 'profile') {
            await handleSaveProfile()
        } else if (activeSection === 'role') {
            await handleSaveRole()
        } else if (activeSection === 'inbox') {
            await handleSaveInbox()
        } else if (activeSection === 'security') {
            await handleSetManualPassword()
        }
    }

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
            return [{
                id: 'all',
                label: t('settings.member_sheet.role.owner_total_access'),
                count: t('settings.member_sheet.role.all_permissions_count')
            }]
        }
        return visiblePermissionGroups.map(group => {
            const groupInfo = getGroupInfo(group)
            const enabled = group.permissions.filter(p => {
                const overrideVal = permissionOverrides[p.id]
                if (typeof overrideVal === 'boolean') return overrideVal
                return Boolean(selectedRoleObj.permissions?.[p.id] === true || selectedRoleObj.permissions?.all === true)
            })
            return {
                id: group.id,
                label: groupInfo.label,
                count: `${enabled.length}/${group.permissions.length}`,
                enabledCount: enabled.length,
                permissions: enabled.map(p => getPermissionInfo(p).label)
            }
        }).filter(g => g.enabledCount > 0)
    }, [selectedRoleObj, permissionOverrides, visiblePermissionGroups, getGroupInfo, getPermissionInfo, t])

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
        if (permId === 'inbox.view') {
            setIsInboxEnabled(nextChecked)
        }
    }

    const handleResetOverridesToRole = () => {
        setPermissionOverrides(prev => {
            const cleared: Record<string, boolean | null> = {}
            for (const key of Object.keys(prev)) {
                cleared[key] = null
            }
            return cleared
        })
        const roleInbox = Boolean(selectedRoleObj?.permissions?.['inbox.view'] === true || selectedRoleObj?.permissions?.all === true)
        setIsInboxEnabled(roleInbox)
    }

    const handleSaveProfile = async () => {
        if (!member) return
        if (!fullName.trim() || fullName.trim().length < 2) {
            toast.error(t('settings.team.manual_form.validation_name_len'))
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
                toast.success(t('settings.member_sheet.toasts.profile_saved'))
                setInitialSnapshot(prev => prev ? ({ ...prev, fullName: fullName.trim(), jobTitle: jobTitle.trim(), phone: phone.trim() }) : null)
                onSave?.()
            } else {
                toast.error(res.error || t('settings.member_sheet.toasts.save_error'))
            }
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
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
                toast.error(res.error || t('settings.member_sheet.toasts.save_error'))
                return
            }

            if (Object.keys(permissionOverrides).length > 0) {
                const permRes = await updateMemberPermissions(member.user_id, {
                    overrides: permissionOverrides
                })
                if (!permRes.success) {
                    toast.error(permRes.error || t('settings.member_sheet.toasts.save_error'))
                    return
                }
            }

            toast.success(t('settings.member_sheet.toasts.role_saved'))
            setInitialSnapshot(prev => prev ? ({ ...prev, roleId: selectedRoleId, overrides: { ...permissionOverrides } }) : null)
            onSave?.()
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
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
                    inbox_access: authorizedChannels,
                    overrides: {
                        'inbox.view': isInboxEnabled
                    }
                })
                if (!permRes.success) {
                    toast.error(permRes.error || t('settings.member_sheet.toasts.save_error'))
                    setIsSavingInbox(false)
                    return
                }
            }

            toast.success(t('settings.member_sheet.toasts.inbox_saved'))
            setInitialSnapshot(prev => prev ? ({
                ...prev,
                channels: [...authorizedChannels],
                isInboxEnabled
            }) : null)
            onSave?.()
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
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
                toast.success(t('settings.member_sheet.toasts.reset_link_sent'))
            } else {
                toast.error(res.error || t('settings.team.toasts.invite_resend_error'))
            }
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
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
                toast.success(t('settings.member_sheet.toasts.invite_resent', { email: displayEmail }))
            } else {
                toast.error(res.error || t('settings.team.toasts.invite_resend_error'))
            }
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
        } finally {
            setIsResendingInvite(false)
        }
    }

    const handleSetManualPassword = async () => {
        if (!member) return
        if (newPassword.length < 6) {
            toast.error(t('settings.member_sheet.alerts.password_too_short'))
            return
        }
        if (newPassword !== confirmPassword) {
            toast.error(t('settings.member_sheet.alerts.passwords_dont_match'))
            return
        }
        setIsSettingPassword(true)
        try {
            const res = await setMemberPasswordManually(member.user_id, newPassword)
            if (res.success) {
                toast.success(t('settings.member_sheet.toasts.password_saved'))
                setNewPassword("")
                setConfirmPassword("")
                onSave?.()
            } else {
                toast.error(res.error || t('settings.member_sheet.toasts.save_error'))
            }
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
        } finally {
            setIsSettingPassword(false)
        }
    }

    const handleRequestClose = (nextOpen: boolean) => {
        if (!nextOpen) {
            if (hasAnyUnsavedChanges) {
                const confirmed = window.confirm(
                    t('settings.member_sheet.alerts.unsaved_exit')
                )
                if (!confirmed) return
            }
            onOpenChange(false)
        } else {
            onOpenChange(true)
        }
    }

    const handleGoToRolesTab = () => {
        if (hasAnyUnsavedChanges) {
            const confirmed = window.confirm(
                t('settings.member_sheet.alerts.unsaved_exit')
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
        setActiveSection(nextTab)
        if (nextTab !== 'security') {
            setNewPassword("")
            setConfirmPassword("")
        }
    }

    return (
        <Sheet open={open} onOpenChange={handleRequestClose}>
            <SheetContent className="w-full sm:max-w-xl p-0 gap-0 border-none shadow-2xl mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden bg-transparent [&>button:last-child]:hidden">
                <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl h-full flex flex-col overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-white/10">
                    {/* Sheet Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-6 py-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-b border-zinc-200/80 dark:border-white/10">
                        <div className="flex items-center gap-3.5 min-w-0">
                            {member?.avatar_url ? (
                                <img
                                    src={member.avatar_url}
                                    alt={displayName}
                                    className="h-11 w-11 rounded-2xl object-cover border border-zinc-200/80 dark:border-white/10 shadow-xs shrink-0"
                                />
                            ) : (
                                <div className="h-11 w-11 rounded-2xl bg-brand-pink/10 text-brand-pink border border-brand-pink/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold shrink-0">
                                    {(displayName?.[0] || displayEmail?.[0] || "U").toUpperCase()}
                                </div>
                            )}

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <SheetTitle className="text-base font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                                        {displayName}
                                    </SheetTitle>
                                    {isSuspended ? (
                                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-semibold py-0.5 px-2">
                                            <Ban className="h-3 w-3 mr-1" /> {t('settings.member_sheet.status_suspended')}
                                        </Badge>
                                    ) : !emailConfirmedAt ? (
                                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold py-0.5 px-2">
                                            <Clock className="h-3 w-3 mr-1" /> {t('settings.member_sheet.status_pending')}
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold py-0.5 px-2">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> {t('settings.member_sheet.status_active')}
                                        </Badge>
                                    )}
                                </div>
                                <SheetDescription className="sr-only">{t('settings.member_sheet.title')}</SheetDescription>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-0.5">
                                    <span className="truncate">{displayEmail}</span>
                                    <span>•</span>
                                    <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                                        {isOwner ? (
                                            <><Crown className="h-3 w-3 text-amber-500" /> {t('settings.member_sheet.role_owner')}</>
                                        ) : (
                                            <><Shield className="h-3 w-3 text-brand-pink" /> {selectedRoleObj?.name || member?.role_name || t('settings.member_sheet.role_member')}</>
                                        )}
                                    </span>
                                    {jobTitle && (
                                        <>
                                            <span>•</span>
                                            <span className="truncate text-zinc-500">{jobTitle}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleRequestClose(false)}
                            className="rounded-xl p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-3"
                            aria-label={t('settings.member_sheet.close_tooltip')}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Navigation Tabs inside Sheet */}
                    <Tabs value={activeSection} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-3 pb-2 border-b border-zinc-200/60 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.02] shrink-0">
                            <TabsList className="grid w-full grid-cols-4 h-9 bg-zinc-200/50 dark:bg-white/5 p-1 rounded-xl">
                                <TabsTrigger value="profile" className="text-xs rounded-lg gap-1.5 relative">
                                    <User className="h-3.5 w-3.5" /> {t('settings.member_sheet.tabs.profile')}
                                    {hasProfileChanges && <span className="h-1.5 w-1.5 rounded-full bg-brand-pink absolute top-1.5 right-1.5" />}
                                </TabsTrigger>
                                <TabsTrigger value="role" className="text-xs rounded-lg gap-1.5 relative">
                                    <Shield className="h-3.5 w-3.5" /> {t('settings.member_sheet.tabs.role')}
                                    {hasRoleChanges && <span className="h-1.5 w-1.5 rounded-full bg-brand-pink absolute top-1.5 right-1.5" />}
                                </TabsTrigger>
                                <TabsTrigger value="inbox" className="text-xs rounded-lg gap-1.5 relative">
                                    <MessageSquare className="h-3.5 w-3.5" /> {t('settings.member_sheet.tabs.inbox')}
                                    {hasInboxChanges && <span className="h-1.5 w-1.5 rounded-full bg-brand-pink absolute top-1.5 right-1.5" />}
                                </TabsTrigger>
                                <TabsTrigger value="security" className="text-xs rounded-lg gap-1.5 relative">
                                    <KeyRound className="h-3.5 w-3.5" /> {t('settings.member_sheet.tabs.security')}
                                    {hasSecurityChanges && <span className="h-1.5 w-1.5 rounded-full bg-brand-pink absolute top-1.5 right-1.5" />}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* SECTION 1: PROFILE & FICHA */}
                            <TabsContent value="profile" className="mt-0 space-y-5">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="member-fullname" className="text-xs font-medium">{t('settings.member_sheet.profile.full_name')}</Label>
                                        <div className="relative">
                                            <User className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                            <Input
                                                id="member-fullname"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder={t('settings.member_sheet.profile.full_name_placeholder')}
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="member-job" className="text-xs font-medium">{t('settings.member_sheet.profile.job_title')}</Label>
                                            <div className="relative">
                                                <Briefcase className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                                <Input
                                                    id="member-job"
                                                    value={jobTitle}
                                                    onChange={(e) => setJobTitle(e.target.value)}
                                                    placeholder={t('settings.member_sheet.profile.job_title_placeholder')}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="member-phone" className="text-xs font-medium">{t('settings.member_sheet.profile.phone')}</Label>
                                            <div className="relative">
                                                <Phone className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                                                <Input
                                                    id="member-phone"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder={t('settings.member_sheet.profile.phone_placeholder')}
                                                    className="pl-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-medium text-zinc-500">{t('settings.member_sheet.profile.email_readonly')}</Label>
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
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('settings.member_sheet.profile.operational_status')}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">{t('settings.member_sheet.profile.email_verification')}</span>
                                            {emailConfirmedAt ? (
                                                <span className="font-medium text-emerald-600 flex items-center gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('settings.member_sheet.profile.status_confirmed')}
                                                </span>
                                            ) : (
                                                <span className="font-medium text-amber-600 flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" /> {t('settings.member_sheet.profile.status_pending_badge')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">{t('settings.member_sheet.profile.last_sign_in')}</span>
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                                {lastSignInAt
                                                    ? format(new Date(lastSignInAt), "d MMM yyyy, HH:mm", { locale: dateLocale })
                                                    : t('settings.member_sheet.profile.never_signed_in')}
                                            </span>
                                        </div>

                                        <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5">
                                            <span className="text-zinc-400 block mb-1">{t('settings.member_sheet.profile.member_since')}</span>
                                            <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                                {member?.created_at
                                                    ? format(new Date(member.created_at), "d MMM yyyy", { locale: dateLocale })
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* SECTION 2: ROLE & IAM PERMISSIONS */}
                            <TabsContent value="role" className="mt-0 space-y-5">
                                {member?.role === 'owner' ? (
                                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 text-center space-y-2">
                                        <Crown className="h-9 w-9 text-amber-500 mx-auto" />
                                        <h3 className="font-semibold text-amber-900 dark:text-amber-200">{t('settings.member_sheet.role.owner_title')}</h3>
                                        <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto">
                                            {t('settings.member_sheet.role.owner_desc')}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-medium">{t('settings.member_sheet.role.assigned_title')}</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleGoToRolesTab}
                                                    className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1"
                                                >
                                                    {t('settings.member_sheet.role.manage_roles')}
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <RolePicker
                                                value={selectedRoleId}
                                                legacyRole={member?.role}
                                                onValueChange={setSelectedRoleId}
                                                onRoleSelected={(r) => {
                                                    setSelectedRoleObj(r)
                                                    if (r?.id) {
                                                        setInitialSnapshot(prev => (prev && !prev.roleId ? { ...prev, roleId: r.id } : prev))
                                                    }
                                                }}
                                            />
                                            <p className="text-xs text-zinc-500">
                                                {t('settings.member_sheet.role.assigned_subtitle')}
                                            </p>
                                        </div>

                                        {/* Resumen de permisos del rol seleccionado */}
                                        {selectedRoleObj && (
                                            <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5 p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                            <Shield className="h-3.5 w-3.5 text-indigo-500" />
                                                            {t('settings.member_sheet.role.summary_title', { name: selectedRoleObj.name })}
                                                        </h4>
                                                        {selectedRoleObj.description && (
                                                            <p className="text-[11px] text-zinc-500 mt-0.5">{selectedRoleObj.description}</p>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {t('settings.member_sheet.role.hierarchy_badge', { level: String(selectedRoleObj.hierarchy_level) })}
                                                    </Badge>
                                                </div>

                                                {rolePermissionsSummary.length === 0 ? (
                                                    <p className="text-xs text-zinc-500 italic">
                                                        {t('settings.member_sheet.role.no_special_perms')}
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
                                                            {t('settings.member_sheet.role.exceptions_title')}
                                                        </h4>
                                                        <p className="text-[11px] text-zinc-500">
                                                            {t('settings.member_sheet.role.exceptions_subtitle')}
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
                                                            {t('settings.member_sheet.role.reset_overrides', { count: String(activeOverrideCount) })}
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
                                                    {visiblePermissionGroups.map(group => {
                                                        const groupInfo = getGroupInfo(group)
                                                        return (
                                                            <div key={group.id} className="space-y-1.5">
                                                                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                                                    {groupInfo.label}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {group.permissions.map(perm => {
                                                                        const permInfo = getPermissionInfo(perm)
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
                                                                                            {permInfo.label}
                                                                                        </span>
                                                                                    {isOverrideGrant ? (
                                                                                        <Badge className="h-4 px-1.5 text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                                                                            {t('settings.member_sheet.role.badge_override_plus')}
                                                                                        </Badge>
                                                                                    ) : isOverrideDeny ? (
                                                                                        <Badge className="h-4 px-1.5 text-[9px] bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                                                                            {t('settings.member_sheet.role.badge_override_minus')}
                                                                                        </Badge>
                                                                                    ) : effectiveChecked ? (
                                                                                        <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-indigo-600 border-indigo-200">
                                                                                            {t('settings.member_sheet.role.badge_inherited')}
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
                                                    )
                                                })}
                                            </div>
                                            </div>
                                        )}

                                    </>
                                )}
                            </TabsContent>

                            {/* SECTION 3: INBOX AGENT & CHANNELS */}
                            <TabsContent value="inbox" className="mt-0 space-y-5">
                                {/* Master Switch: Acceso al Módulo de Mensajería */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5 pr-4">
                                            <Label htmlFor="master-inbox-switch" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 cursor-pointer">
                                                <MessageSquare className="h-4 w-4 text-brand-pink" />
                                                {t('settings.member_sheet.inbox.master_title')}
                                            </Label>
                                            <p className="text-xs text-zinc-500">
                                                {isInboxEnabled
                                                    ? t('settings.member_sheet.inbox.master_desc_enabled')
                                                    : t('settings.member_sheet.inbox.master_desc_disabled')}
                                            </p>
                                        </div>
                                        <Switch
                                            id="master-inbox-switch"
                                            checked={isInboxEnabled}
                                            disabled={isOwner}
                                            onCheckedChange={(checked) => {
                                                setIsInboxEnabled(checked)
                                                setPermissionOverrides(prev => ({ ...prev, 'inbox.view': checked }))
                                            }}
                                        />
                                    </div>
                                    {!isInboxEnabled && (
                                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span>
                                                {t('settings.member_sheet.inbox.disabled_warning')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className={`space-y-5 transition-opacity ${!isInboxEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-brand-pink" />
                                                {t('settings.member_sheet.inbox.channels_label')}
                                            </Label>
                                            {hasGlobalInboxView && (
                                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
                                                    {t('settings.member_sheet.inbox.global_view_badge')}
                                                </Badge>
                                            )}
                                        </div>

                                        {hasGlobalInboxView && (
                                            <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-800 dark:text-indigo-200">
                                                {t('settings.member_sheet.inbox.global_view_alert')}
                                            </div>
                                        )}

                                        <ChannelAccessSelector
                                            selectedIds={authorizedChannels}
                                            onChange={setAuthorizedChannels}
                                            disabled={isOwner || !isInboxEnabled}
                                        />
                                        <p className="text-[11px] text-zinc-500">
                                            {t('settings.member_sheet.inbox.channels_sync_notice')}
                                        </p>
                                    </div>

                                </div>
                            </TabsContent>

                            {/* SECTION 4: SECURITY & CREDENTIALS */}
                            <TabsContent value="security" className="mt-0 space-y-5">
                                {/* 4.1 Password Recovery & Invite Links */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-zinc-900">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                                {t('settings.member_sheet.security.email_recovery_title')}
                                            </h4>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {t('settings.member_sheet.security.email_recovery_subtitle', { email: displayEmail || '' })}
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
                                            {t('settings.member_sheet.security.send_reset_link')}
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
                                            {t('settings.member_sheet.security.resend_invite')}
                                        </Button>
                                    </div>
                                </div>

                                {/* 4.2 Manual Password Assignment */}
                                <div className="rounded-2xl border border-zinc-200/80 dark:border-white/10 p-4 space-y-3 bg-white dark:bg-zinc-900">
                                    <div>
                                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                            {t('settings.member_sheet.security.manual_pass_title')}
                                        </h4>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            {t('settings.member_sheet.security.manual_pass_subtitle')}
                                        </p>
                                    </div>

                                    {/* Decoy fields to divert aggressive browser password autofill */}
                                    <div className="sr-only" aria-hidden="true" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
                                        <input type="text" name="fake_username_decoy" tabIndex={-1} autoComplete="off" />
                                        <input type="password" name="fake_password_decoy" tabIndex={-1} autoComplete="off" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-new-pass" className="text-xs">{t('settings.member_sheet.security.new_password')}</Label>
                                            <div className="relative">
                                                <Input
                                                    id="manual-new-pass"
                                                    name="admin_manual_override_new_pwd"
                                                    type={showPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder={t('settings.member_sheet.security.new_password_placeholder')}
                                                    autoComplete="new-password"
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    data-form-type="other"
                                                    readOnly
                                                    onFocus={(e) => e.target.removeAttribute('readonly')}
                                                    className="pr-9"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="manual-confirm-pass" className="text-xs">{t('settings.member_sheet.security.confirm_password')}</Label>
                                            <Input
                                                id="manual-confirm-pass"
                                                name="admin_manual_override_confirm_pwd"
                                                type={showPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder={t('settings.member_sheet.security.confirm_password_placeholder')}
                                                autoComplete="new-password"
                                                data-lpignore="true"
                                                data-1p-ignore="true"
                                                data-form-type="other"
                                                readOnly
                                                onFocus={(e) => e.target.removeAttribute('readonly')}
                                            />
                                        </div>
                                    </div>

                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Unified Sticky Footer */}
                    <div className="sticky bottom-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-6 py-3.5 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-mono text-zinc-400">
                                ID: {member?.user_id?.slice(0, 8)}...
                            </span>
                            {hasUnsavedChangesInCurrentSection && (
                                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {t('settings.member_sheet.footer.unsaved_badge')}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRequestClose(false)}
                                className="text-xs rounded-xl h-9 px-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/5"
                            >
                                {t('settings.member_sheet.footer.close')}
                            </Button>
                            {activeSection !== 'security' && !(isOwner && activeSection === 'role') ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSaveCurrentTab}
                                    disabled={!hasUnsavedChangesInCurrentSection || isCurrentTabSaving}
                                    className="bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-semibold rounded-xl h-9 px-4 gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isCurrentTabSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    <span>
                                        {activeSection === 'profile'
                                            ? t('settings.member_sheet.footer.save_profile')
                                            : activeSection === 'role'
                                            ? t('settings.member_sheet.footer.save_role')
                                            : t('settings.member_sheet.footer.save_inbox')}
                                    </span>
                                </Button>
                            ) : hasSecurityChanges ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSetManualPassword}
                                    disabled={isSettingPassword || !newPassword}
                                    className="bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-semibold rounded-xl h-9 px-4 gap-1.5 shadow-sm transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    {isSettingPassword ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <KeyRound className="h-3.5 w-3.5" />
                                    )}
                                    <span>{t('settings.member_sheet.footer.update_password')}</span>
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
