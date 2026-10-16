"use client"

import { PaginatedDataTable as Table } from "@/components/ui/paginated-data-table"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    ShieldCheck,
    User,
    Crown,
    CheckCircle,
    Ban,
    Clock,
    Search,
    MessageSquare,
    Briefcase,
    UserCog,
    Send
} from "lucide-react"
import { toast } from "sonner"
import { getOrganizationMembers, inviteMember, removeMember, toggleMemberStatus, resendMemberInvitation } from "./actions/team"
import { getChannels } from "@/modules/features/channels/actions"
import { Channel } from "@/modules/features/channels/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MemberEditSheet } from "./member-edit-sheet"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
import { ManualCreationForm } from "./manual-creation-form"

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
    const router = useRouter()
    const [members, setMembers] = useState<any[]>([])
    const [channels, setChannels] = useState<Channel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("")
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
            toast.error("Error al cargar miembros del equipo")
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

    const filteredMembers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return members
        return members.filter(m => {
            const name = (m.full_name || m.user?.full_name || "").toLowerCase()
            const email = (m.email || m.user?.email || "").toLowerCase()
            const role = (m.role_name || m.role || "").toLowerCase()
            const job = (m.job_title || "").toLowerCase()
            return name.includes(q) || email.includes(q) || role.includes(q) || job.includes(q)
        })
    }, [members, searchQuery])

    const stats = useMemo(() => {
        const total = members.length
        const active = members.filter(m => m.account_state === 'active').length
        const pending = members.filter(m => m.account_state === 'pending_invite').length
        const onlineAgents = members.filter(m => getEffectiveAgentStatus(m) === 'online').length
        return { total, active, pending, onlineAgents }
    }, [members])

    const handleInvite = async () => {
        if (!inviteEmail) return
        setIsInviting(true)
        try {
            const result = await inviteMember(inviteEmail, inviteRole)
            if (result.success) {
                toast.success("Invitación enviada", {
                    description: "Correo enviado al destinatario"
                })
                setIsInviteOpen(false)
                setInviteEmail("")
                loadMembers()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (error) {
            toast.error("Error inesperado al enviar invitación")
        } finally {
            setIsInviting(false)
        }
    }

    const handleResendInvite = async (userId: string, email: string) => {
        setResendingUserId(userId)
        try {
            const res = await resendMemberInvitation(userId)
            if (res.success) {
                toast.success(`Invitación reenviada a ${email}`)
            } else {
                toast.error(res.error || "No se pudo reenviar la invitación")
            }
        } catch {
            toast.error("Error inesperado al reenviar invitación")
        } finally {
            setResendingUserId(null)
        }
    }

    const handleRemove = async (userId: string, displayName: string) => {
        if (!confirm(`¿Seguro de remover a ${displayName} de la organización? Se liberarán sus canales y conversaciones asignadas.`)) return
        try {
            const result = await removeMember(userId)
            if (result.success) {
                toast.success("Miembro removido correctamente")
                loadMembers()
            } else {
                toast.error(result.error || "Error al remover miembro")
            }
        } catch (error) {
            toast.error("Error inesperado")
        }
    }

    const handleToggleStatus = async (userId: string, currentStatus: string) => {
        try {
            const result = await toggleMemberStatus(userId, currentStatus)
            if (result.success) {
                toast.success(result.status === 'blocked' ? "Acceso suspendido" : "Acceso restaurado")
                loadMembers()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
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
            {/* Top Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Equipo y Agentes</h3>
                    <p className="text-sm text-zinc-500">
                        Gestiona perfiles, accesos, credenciales, canales de Inbox y roles de tu organización.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={goToRoles} className="gap-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        Roles y Permisos
                    </Button>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Añadir Miembro
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Añadir Nuevo Miembro</DialogTitle>
                                <DialogDescription>
                                    Invita por correo electrónico o crea una cuenta con contraseña inmediata.
                                </DialogDescription>
                            </DialogHeader>

                            <Tabs defaultValue="invite" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="invite">Invitar por Correo</TabsTrigger>
                                    <TabsTrigger value="create">Crear Manualmente</TabsTrigger>
                                </TabsList>

                                {/* TAB: INVITE */}
                                <TabsContent value="invite" className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Correo Electrónico</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="usuario@ejemplo.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Rol IAM</Label>
                                        <RolePicker
                                            value={inviteRole}
                                            onValueChange={setInviteRole}
                                        />
                                    </div>
                                    <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-white/5 p-3 rounded-xl border border-zinc-200/60 dark:border-white/10">
                                        El usuario recibirá un correo con un enlace único para activar su acceso y configurar su nombre y contraseña.
                                    </div>
                                    <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} className="w-full">
                                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enviar Invitación
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

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3.5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-zinc-500 block">Total Equipo</span>
                        <span className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}</span>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <User className="h-4 w-4" />
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3.5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-zinc-500 block">Cuentas Activas</span>
                        <span className="text-xl font-bold text-emerald-600">{stats.active}</span>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3.5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-zinc-500 block">Invitaciones Pendientes</span>
                        <span className="text-xl font-bold text-amber-600">{stats.pending}</span>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Clock className="h-4 w-4" />
                    </div>
                </div>

                <div className="rounded-2xl border border-zinc-200/70 dark:border-white/10 bg-white/80 dark:bg-white/5 p-3.5 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-zinc-500 block">Agentes Online (Inbox)</span>
                        <span className="text-xl font-bold text-indigo-600">{stats.onlineAgents}</span>
                    </div>
                    <div className="h-9 w-9 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-brand-pink">
                        <MessageSquare className="h-4 w-4" />
                    </div>
                </div>
            </div>

            {/* Search Filter */}
            <div className="flex items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                    <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-3" />
                    <Input
                        placeholder="Buscar por nombre, correo, cargo o rol..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-white/5"
                    />
                </div>
            </div>

            {/* Members Table */}
            <Card className="relative border border-zinc-200/70 dark:border-white/10 shadow-sm rounded-2xl overflow-hidden bg-white/90 dark:bg-zinc-900/60">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Miembro</TableHead>
                                <TableHead>Rol IAM</TableHead>
                                <TableHead>Estado de Cuenta</TableHead>
                                <TableHead>Agente Inbox y Canales</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
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
                                        No se encontraron miembros con ese criterio.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMembers.map((member) => {
                                    const fullName = member.full_name || member.user?.full_name
                                    const email = member.email || member.user?.email || "Sin Email"
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
                                                                    Sin nombre
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
                                                    {member.role_name}
                                                </Badge>
                                            </TableCell>

                                            {/* Col 3: Account State & Last Access */}
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {member.account_state === 'suspended' ? (
                                                        <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                                                            <Ban className="h-2.5 w-2.5" /> Suspendido
                                                        </Badge>
                                                    ) : member.account_state === 'pending_invite' ? (
                                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5 gap-1">
                                                                <Clock className="h-2.5 w-2.5" /> Invitación Pendiente
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-amber-700 hover:bg-amber-100"
                                                                title="Reenviar invitación por correo"
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
                                                            <CheckCircle className="h-2.5 w-2.5" /> Activo
                                                        </Badge>
                                                    )}

                                                    <div className="text-[11px] text-zinc-400">
                                                        {member.last_sign_in_at
                                                            ? `Últ. acceso: ${format(new Date(member.last_sign_in_at), "d MMM yyyy", { locale: es })}`
                                                            : member.created_at
                                                                ? `Ingreso: ${format(new Date(member.created_at), "d MMM yyyy", { locale: es })}`
                                                                : "Sin registro"}
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
                                                            {agentStatus === 'online' ? 'En línea' : agentStatus === 'away' ? 'Ausente' : 'Desconectado'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400">
                                                            ({member.agent_availability?.current_load ?? 0}/{member.agent_availability?.max_capacity ?? 100})
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1">
                                                        {hasGlobalView ? (
                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-100">
                                                                Vista Global (Todos)
                                                            </Badge>
                                                        ) : inboxAccessIds.length > 0 ? (
                                                            <>
                                                                {inboxAccessIds.slice(0, 2).map(chId => (
                                                                    <Badge key={chId} variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                                                        {channelNameMap.get(chId) || "Canal WhatsApp"}
                                                                    </Badge>
                                                                ))}
                                                                {inboxAccessIds.length > 2 && (
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                        +{inboxAccessIds.length - 2}
                                                                    </Badge>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="text-[11px] text-zinc-400 italic">Sin canales asignados</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {/* Col 5: Actions */}
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 text-xs gap-1.5"
                                                        onClick={() => {
                                                            setEditingMember(member)
                                                            setIsEditOpen(true)
                                                        }}
                                                    >
                                                        <UserCog className="h-3.5 w-3.5 text-indigo-600" />
                                                        Ficha
                                                    </Button>

                                                    {!isOwner && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={member.status === 'blocked'
                                                                ? "h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                                : "h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                                                            onClick={() => handleToggleStatus(member.user_id, member.status)}
                                                            title={member.status === 'blocked' ? "Reactivar acceso" : "Suspender acceso"}
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
                                                            title="Eliminar miembro"
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
                </CardContent>
            </Card>

            {/* Direct Callout to Roles & Permissions Tab */}
            <div className="glass-card bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/60 dark:border-indigo-800/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                    <div>
                        <h4 className="font-medium text-indigo-950 dark:text-indigo-200 text-sm">Matriz Avanzada de Roles y Permisos (IAM)</h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                            Configura roles personalizados, niveles de jerarquía y permisos granulares por módulo desde la nueva pestaña dedicada.
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={goToRoles} className="shrink-0 bg-white dark:bg-zinc-900">
                    Abrir Roles y Permisos
                </Button>
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
