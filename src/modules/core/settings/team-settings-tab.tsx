"use client"

import { PaginatedDataTable as Table } from "@/components/ui/paginated-data-table"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
    Loader2,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    User,
    Crown,
    CheckCircle,
    Ban,
    Clock,
    MessageSquare,
    Briefcase,
    Settings,
    Send
} from "lucide-react"
import { toast } from "sonner"
import { getOrganizationMembers, inviteMember, removeMember, toggleMemberStatus, resendMemberInvitation } from "./actions/team"
import { getChannels } from "@/modules/features/channels/actions"
import { Channel } from "@/modules/features/channels/types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { MemberEditSheet } from "./member-edit-sheet"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
import { ManualCreationForm } from "./manual-creation-form"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { cn } from "@/modules/infrastructure/utils/utils"
import { useTranslation } from "@/modules/core/i18n/use-translation"
import { useLocalizedIam } from "@/modules/core/iam/actions/use-localized-iam"

const AGENT_HEARTBEAT_TTL_MS = 5 * 60 * 1000

function getEffectiveAgentStatus(member: any): 'online' | 'away' | 'offline' {
    if (!member || member.account_state !== 'active') return 'offline'
    const availability = member.agent_availability
    if (!availability) return 'offline'

    // An agent must have an activity heartbeat (last_seen_at) within the last 5 minutes to be considered online
    const lastSeen = availability.last_seen_at
    if (!lastSeen) return 'offline'

    const lastSeenMs = new Date(lastSeen).getTime()
    if (isNaN(lastSeenMs) || lastSeenMs <= 0) return 'offline'

    const ageMs = Date.now() - lastSeenMs
    const hasFreshHeartbeat = ageMs >= 0 && ageMs <= AGENT_HEARTBEAT_TTL_MS

    if (!hasFreshHeartbeat) return 'offline'

    const rawStatus = availability.configured_status || availability.status || 'offline'
    if (rawStatus === 'away') return 'away'
    if (rawStatus === 'online') return 'online'

    return 'offline'
}

interface TeamSettingsTabProps {
    activeModules?: string[]
    onNavigateToRoles?: () => void
}

export function TeamSettingsTab({ activeModules, onNavigateToRoles }: TeamSettingsTabProps) {
    const { t, locale, getRoleInfo } = useLocalizedIam()
    const dateLocale = locale === 'en' ? enUS : es
    const router = useRouter()
    const [members, setMembers] = useState<any[]>([])
    const [channels, setChannels] = useState<Channel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeFilter, setActiveFilter] = useState<string>("all")

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("")
    const [inviteInboxAccess, setInviteInboxAccess] = useState(true)
    const [isInviting, setIsInviting] = useState(false)
    const [resendingUserId, setResendingUserId] = useState<string | null>(null)

    // Edit member state
    const [editingMember, setEditingMember] = useState<any>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const loadMembers = async () => {
        setIsLoading(true)
        try {
            const [membersData, channelsData] = await Promise.all([
                getOrganizationMembers(),
                getChannels().catch(() => [] as Channel[])
            ])
            setMembers(membersData || [])
            setChannels(channelsData || [])
            // Keep editingMember fresh if sheet is open
            if (editingMember) {
                const refreshed = (membersData || []).find((m: any) => m.user_id === editingMember.user_id)
                if (refreshed) setEditingMember(refreshed)
            }
        } catch (error) {
            console.error(error)
            toast.error(t('settings.team.toasts.load_error'))
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadMembers()
    }, [])

    const channelNameMap = useMemo(() => {
        const map = new Map<string, string>()
        channels.forEach(c => {
            if (c.id && c.connection_name) {
                map.set(c.id, c.connection_name)
            }
        })
        return map
    }, [channels])

    const stats = useMemo(() => {
        const total = members.length
        const active = members.filter(m => m.account_state === 'active').length
        const pending = members.filter(m => m.account_state === 'pending_invite').length
        const suspended = members.filter(m => m.account_state === 'suspended' || m.status === 'blocked').length
        const onlineAgents = members.filter(m => getEffectiveAgentStatus(m) === 'online').length
        return { total, active, pending, suspended, onlineAgents }
    }, [members])

    const filteredMembers = useMemo(() => {
        let result = members

        if (activeFilter === 'active') {
            result = result.filter(m => m.account_state === 'active')
        } else if (activeFilter === 'pending') {
            result = result.filter(m => m.account_state === 'pending_invite')
        } else if (activeFilter === 'online') {
            result = result.filter(m => getEffectiveAgentStatus(m) === 'online')
        } else if (activeFilter === 'suspended') {
            result = result.filter(m => m.account_state === 'suspended' || m.status === 'blocked')
        }

        const q = searchQuery.trim().toLowerCase()
        if (q) {
            result = result.filter(m => {
                const name = (m.full_name || m.user?.full_name || "").toLowerCase()
                const email = (m.email || m.user?.email || "").toLowerCase()
                const role = (m.role_name || m.role || "").toLowerCase()
                const job = (m.job_title || "").toLowerCase()
                return name.includes(q) || email.includes(q) || role.includes(q) || job.includes(q)
            })
        }

        return result
    }, [members, activeFilter, searchQuery])

    const handleInvite = async () => {
        if (!inviteEmail) return
        setIsInviting(true)
        try {
            const result = await inviteMember(inviteEmail, inviteRole, inviteInboxAccess)
            if (result.success) {
                toast.success(t('settings.team.toasts.invite_sent'))
                setIsInviteOpen(false)
                setInviteEmail("")
                setInviteInboxAccess(true)
                loadMembers()
            } else {
                toast.error(t('common.error') + ": " + result.error)
            }
        } catch (error) {
            toast.error(t('settings.team.toasts.unexpected_error'))
        } finally {
            setIsInviting(false)
        }
    }

    const handleResendInvite = async (userId: string, email: string) => {
        setResendingUserId(userId)
        try {
            const res = await resendMemberInvitation(userId)
            if (res.success) {
                toast.success(t('settings.team.toasts.invite_resent', { email }))
            } else {
                toast.error(res.error || t('settings.team.toasts.invite_resend_error'))
            }
        } catch {
            toast.error(t('settings.team.toasts.unexpected_error'))
        } finally {
            setResendingUserId(null)
        }
    }

    const handleRemove = async (userId: string, displayName: string) => {
        if (!confirm(t('settings.team.toasts.remove_confirm', { name: displayName }))) return
        try {
            const result = await removeMember(userId)
            if (result.success) {
                toast.success(t('settings.team.toasts.remove_success'))
                loadMembers()
            } else {
                toast.error(result.error || t('settings.team.toasts.remove_error'))
            }
        } catch (error) {
            toast.error(t('settings.team.toasts.unexpected_error'))
        }
    }

    const handleToggleStatus = async (userId: string, currentStatus: string) => {
        try {
            const result = await toggleMemberStatus(userId, currentStatus)
            if (result.success) {
                toast.success(result.status === 'blocked' ? t('settings.team.toasts.status_blocked') : t('settings.team.toasts.status_restored'))
                loadMembers()
            } else {
                toast.error(t('common.error') + ": " + result.error)
            }
        } catch (error) {
            toast.error(t('settings.team.toasts.unexpected_error'))
        }
    }

    const goToRoles = () => {
        if (onNavigateToRoles) {
            onNavigateToRoles()
        } else {
            router.push('/platform/settings?tab=roles')
        }
    }

    return (
        <div className="space-y-6">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card
                    onClick={() => setActiveFilter('all')}
                    className={cn(
                        "glass-card group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 p-3.5 flex items-center justify-between",
                        activeFilter === 'all' && "ring-2 ring-zinc-400 dark:ring-zinc-600 bg-white/20 dark:bg-white/10"
                    )}
                >
                    <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">{t('settings.team.kpis.total_members')}</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{stats.total}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <User className="h-4 w-4" />
                    </div>
                </Card>

                <Card
                    onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
                    className={cn(
                        "glass-card group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 p-3.5 flex items-center justify-between",
                        activeFilter === 'active' && "ring-2 ring-emerald-500/60 bg-white/20 dark:bg-white/10"
                    )}
                >
                    <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">{t('settings.team.kpis.active_accounts')}</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{stats.active}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-4 w-4" />
                    </div>
                </Card>

                <Card
                    onClick={() => setActiveFilter(activeFilter === 'pending' ? 'all' : 'pending')}
                    className={cn(
                        "glass-card group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 p-3.5 flex items-center justify-between",
                        activeFilter === 'pending' && "ring-2 ring-amber-500/60 bg-white/20 dark:bg-white/10"
                    )}
                >
                    <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">{t('settings.team.kpis.pending_invites')}</span>
                        <span className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{stats.pending}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                        <Clock className="h-4 w-4" />
                    </div>
                </Card>

                <Card
                    onClick={() => setActiveFilter(activeFilter === 'online' ? 'all' : 'online')}
                    className={cn(
                        "glass-card group hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 p-3.5 flex items-center justify-between",
                        activeFilter === 'online' && "ring-2 ring-brand-pink/60 bg-white/20 dark:bg-white/10"
                    )}
                >
                    <div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">{t('settings.team.kpis.online_agents')}</span>
                        <span className="text-xl font-bold text-brand-pink tracking-tight">{stats.onlineAgents}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-brand-pink group-hover:scale-110 transition-transform">
                        <MessageSquare className="h-4 w-4" />
                    </div>
                </Card>
            </div>

            {/* Top Header & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{t('settings.team.title')}</h3>
                    <p className="text-sm text-zinc-500">
                        {t('settings.team.description')}
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-1 lg:justify-end max-w-full lg:max-w-2xl">
                    <div className="flex-1 min-w-[240px] sm:min-w-[320px]">
                        <SearchFilterBar
                            searchTerm={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder={t('settings.team.search_placeholder')}
                        />
                    </div>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shrink-0 h-10 px-4 rounded-xl shadow-xs">
                                <UserPlus className="h-4 w-4 mr-2" />
                                {t('settings.team.add_member')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>{t('settings.team.dialog.title')}</DialogTitle>
                                <DialogDescription>
                                    {t('settings.team.dialog.description')}
                                </DialogDescription>
                            </DialogHeader>

                            <Tabs defaultValue="invite" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="invite">{t('settings.team.dialog.tab_invite')}</TabsTrigger>
                                    <TabsTrigger value="create">{t('settings.team.dialog.tab_create')}</TabsTrigger>
                                </TabsList>

                                {/* TAB: INVITE */}
                                <TabsContent value="invite" className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('settings.team.dialog.email_label')}</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder={t('settings.team.dialog.email_placeholder')}
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">{t('settings.team.dialog.role_label')}</Label>
                                        <RolePicker
                                            value={inviteRole}
                                            onValueChange={setInviteRole}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                        <div className="space-y-0.5 pr-2">
                                            <Label htmlFor="invite-inbox-access" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                                                <MessageSquare className="h-4 w-4 text-indigo-500" />
                                                {t('settings.team.dialog.inbox_label')}
                                            </Label>
                                            <p className="text-xs text-zinc-500">
                                                {inviteInboxAccess
                                                    ? t('settings.team.dialog.inbox_enabled_desc')
                                                    : t('settings.team.dialog.inbox_disabled_desc')}
                                            </p>
                                        </div>
                                        <Switch
                                            id="invite-inbox-access"
                                            checked={inviteInboxAccess}
                                            onCheckedChange={setInviteInboxAccess}
                                        />
                                    </div>
                                    <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-white/5 p-3 rounded-xl border border-zinc-200/60 dark:border-white/10">
                                        {t('settings.team.dialog.notice')}
                                    </div>
                                    <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="w-full">
                                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('settings.team.dialog.send_button')}
                                    </Button>
                                </TabsContent>

                                {/* TAB: CREATE MANUALLY */}
                                <TabsContent value="create" className="space-y-4 py-4">
                                    <ManualCreationForm
                                        onSuccess={() => {
                                            setIsInviteOpen(false)
                                            loadMembers()
                                        }}
                                    />
                                </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Members Table */}
            <div className="relative min-w-0 space-y-3">
                <Table
                    resetKey={`${searchQuery}_${activeFilter}`}
                    containerClassName="bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-zinc-200/80 dark:border-white/10 shadow-none"
                >
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('settings.team.table.member')}</TableHead>
                                <TableHead>{t('settings.team.table.role')}</TableHead>
                                <TableHead>{t('settings.team.table.account_status')}</TableHead>
                                <TableHead>{t('settings.team.table.inbox_channels')}</TableHead>
                                <TableHead className="text-right">{t('settings.team.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-zinc-400" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                        {t('settings.team.table.empty')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMembers.map((member) => {
                                    const fullName = member.full_name || member.user?.full_name
                                    const email = member.email || member.user?.email || t('settings.team.table.no_email')
                                    const displayName = fullName || email.split("@")[0]
                                    const avatarUrl = member.avatar_url || member.user?.avatar_url
                                    const isOwner = member.role === 'owner' || member.role_hierarchy >= 100
                                    const isAdmin = !isOwner && (member.role === 'admin' || member.role_hierarchy >= 50)
                                    const inboxAccessIds: string[] = (member.permissions as any)?.inbox_access || []
                                    const rolePerms = (member.organization_roles as any)?.permissions || {}
                                    const hasGlobalView = isOwner || rolePerms.all === true || rolePerms['inbox.conversations.global_view'] === true
                                    const agentStatus = getEffectiveAgentStatus(member)

                                    return (
                                        <TableRow
                                            key={member.id || member.user_id}
                                            className="cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-white/5 transition-colors"
                                            onClick={() => {
                                                setEditingMember(member)
                                                setIsEditOpen(true)
                                            }}
                                        >
                                            {/* Col 1: Member Profile */}
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {avatarUrl ? (
                                                        <img
                                                            src={avatarUrl}
                                                            alt={displayName}
                                                            className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                                                        />
                                                    ) : (
                                                        <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-semibold text-xs shrink-0">
                                                            {(displayName?.[0] || email?.[0] || 'U').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                                            <span className="truncate">{displayName}</span>
                                                            {!fullName && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1 text-zinc-400 border-zinc-200">
                                                                    {t('common.unknown')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 truncate">{email}</div>
                                                        {member.job_title && (
                                                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                                                                <Briefcase className="h-2.5 w-2.5" />
                                                                {member.job_title}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Col 2: IAM Role */}
                                            <TableCell>
                                                <Badge
                                                    variant={isOwner ? 'default' : isAdmin ? 'secondary' : 'outline'}
                                                    className="gap-1 font-medium"
                                                >
                                                    {isOwner ? (
                                                        <Crown className="h-3 w-3 text-amber-400" />
                                                    ) : isAdmin ? (
                                                        <Shield className="h-3 w-3 text-indigo-500" />
                                                    ) : (
                                                        <User className="h-3 w-3 text-zinc-400" />
                                                    )}
                                                    {getRoleInfo({
                                                        name: member.role_name || (isOwner ? 'Dueño' : isAdmin ? 'Administrador' : 'Miembro'),
                                                        is_system_role: isOwner || isAdmin || (member.role_name?.toLowerCase() === 'miembro' || member.role_name?.toLowerCase() === 'member'),
                                                        hierarchy_level: isOwner ? 100 : isAdmin ? 50 : 10
                                                    }).name}
                                                </Badge>
                                            </TableCell>

                                            {/* Col 3: Account State & Last Access */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {member.account_state === 'suspended' ? (
                                                        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                                                            <Ban className="h-2.5 w-2.5" /> {t('settings.team.table.status_suspended')}
                                                        </Badge>
                                                    ) : member.account_state === 'pending_invite' ? (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5 gap-1">
                                                                <Clock className="h-2.5 w-2.5" /> {t('settings.team.table.status_pending')}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-amber-700 hover:bg-amber-100"
                                                                title={t('settings.member_sheet.security.resend_invite')}
                                                                disabled={resendingUserId === member.user_id}
                                                                onClick={() => handleResendInvite(member.user_id, email)}
                                                            >
                                                                {resendingUserId === member.user_id ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Send className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5 gap-1">
                                                            <CheckCircle className="h-2.5 w-2.5" /> {t('settings.team.table.status_active')}
                                                        </Badge>
                                                    )}

                                                    <div className="text-[11px] text-zinc-400">
                                                        {member.last_sign_in_at
                                                            ? `${t('settings.team.table.last_seen')} ${format(new Date(member.last_sign_in_at), "d MMM yyyy", { locale: dateLocale })}`
                                                            : member.created_at
                                                                ? `${t('settings.team.table.joined')} ${format(new Date(member.created_at), "d MMM yyyy", { locale: dateLocale })}`
                                                                : t('settings.team.table.no_record')}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Col 4: Inbox Agent & Channels */}
                                            <TableCell>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                agentStatus === 'online'
                                                                    ? 'bg-emerald-500'
                                                                    : agentStatus === 'away'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-zinc-300 dark:bg-zinc-600'
                                                            }`}
                                                        />
                                                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                            {agentStatus === 'online' ? t('settings.team.table.status_online') : agentStatus === 'away' ? t('settings.team.table.status_away') : t('settings.team.table.status_offline')}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            ({member.agent_availability?.current_load ?? 0}/{member.agent_availability?.max_capacity ?? 100})
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1">
                                                        {hasGlobalView ? (
                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-100">
                                                                {t('settings.team.table.global_view')}
                                                            </Badge>
                                                        ) : inboxAccessIds.length > 0 ? (
                                                            <>
                                                                {inboxAccessIds.slice(0, 2).map(chId => (
                                                                    <Badge key={chId} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                                                        {channelNameMap.get(chId) || t('settings.team.table.channel_fallback')}
                                                                    </Badge>
                                                                ))}
                                                                {inboxAccessIds.length > 2 && (
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                        +{inboxAccessIds.length - 2}
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-400 italic">{t('settings.team.table.no_channels')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Col 5: Actions */}
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:bg-white/10 dark:text-zinc-300 dark:hover:text-white"
                                                        onClick={() => {
                                                            setEditingMember(member)
                                                            setIsEditOpen(true)
                                                        }}
                                                        title={t('settings.team.table.btn_settings')}
                                                    >
                                                        <Settings className="h-4 w-4" />
                                                    </Button>

                                                    {!isOwner && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={member.status === 'blocked'
                                                                ? "h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                : "h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                                                            onClick={() => handleToggleStatus(member.user_id, member.status)}
                                                            title={member.status === 'blocked' ? t('settings.team.table.btn_reactivate') : t('settings.team.table.btn_suspend')}
                                                        >
                                                            {member.status === 'blocked' ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                        </Button>
                                                    )}

                                                    {!isOwner && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleRemove(member.user_id, displayName)}
                                                            title={t('settings.team.table.btn_delete')}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
            </div>

            {/* Member Edit Sheet */}
            <MemberEditSheet
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                member={editingMember}
                onSave={loadMembers}
                activeModules={activeModules}
                onNavigateToRoles={goToRoles}
            />
        </div>
    )
}
