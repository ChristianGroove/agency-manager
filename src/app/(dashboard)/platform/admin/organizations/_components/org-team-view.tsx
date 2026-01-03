"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { inviteOrgOwner, removeOrgUser, forceLogoutUser } from '@/modules/core/admin/actions'
import { toast } from "sonner"
import { Loader2, Mail, Trash2, Copy, Check, MoreHorizontal, UserCog, LogOut, ShieldAlert } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface OrgTeamViewProps {
    organizationId: string
    ownerId?: string
    users: any[]
}

export function OrgTeamView({ organizationId, ownerId, users }: OrgTeamViewProps) {
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [loadingAction, setLoadingAction] = useState<string | null>(null) // Stores userId of loading action

    // Invite Link Success State
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [hasCopied, setHasCopied] = useState(false)

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail) return

        setIsLoading(true)
        setGeneratedLink(null)

        try {
            const result = await inviteOrgOwner(inviteEmail, organizationId)

            if (result.inviteLink) {
                setGeneratedLink(result.inviteLink)
                toast.success("Enlace generado exitosamente")
            } else {
                toast.success("Usuario invitado (Revisa logs si no apareció el link).")
            }
        } catch (error: any) {
            toast.error(error.message || "Error al invitar usuario")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveUser = async (userId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar a este usuario de la organización?")) return

        setLoadingAction(userId)
        try {
            await removeOrgUser(userId, organizationId)
            toast.success("Usuario eliminado exitosamente")
            window.location.reload()
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar usuario")
        } finally {
            setLoadingAction(null)
        }
    }

    const handleForceLogout = async (userId: string) => {
        if (!confirm("¿Cerrar sesión remota de este usuario? Perderá acceso inmediato.")) return

        setLoadingAction(userId)
        try {
            await forceLogoutUser(userId)
            toast.success("Sesión cerrada exitosamente")
        } catch (error: any) {
            toast.error("Error: " + error.message)
        } finally {
            setLoadingAction(null)
        }
    }

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink)
            setHasCopied(true)
            toast.success("Enlace copiado")
            setTimeout(() => setHasCopied(false), 2000)
        }
    }

    const handleOpenChange = (open: boolean) => {
        setIsInviteOpen(open)
        if (!open) {
            setGeneratedLink(null)
            setInviteEmail("")
            setHasCopied(false)
        }
    }

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle>Equipo y Accesos</CardTitle>
                    <CardDescription>
                        Gestiona miembros, roles y seguridad de la cuenta.
                    </CardDescription>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Mail className="mr-2 h-4 w-4" />
                            Invitar Miembro
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invitar a Organización</DialogTitle>
                            <DialogDescription>
                                {generatedLink
                                    ? "Usuario creado. Comparte este enlace manualmente:"
                                    : "Ingresa el email. Se generará un enlace de invitación único."}
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedLink ? (
                            <form onSubmit={handleInvite}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email del Usuario</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="nuevo.miembro@empresa.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading} className="w-full">
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Generar Invitación
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="space-y-6 py-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <div className="flex justify-center mb-2">
                                        <Check className="h-8 w-8 text-green-600" />
                                    </div>
                                    <h3 className="font-semibold text-green-900">¡Usuario Creado!</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                        El usuario ha sido añadido.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-muted-foreground font-bold">Enlace de Invitación</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                readOnly
                                                value={generatedLink}
                                                className="pr-10 font-mono text-xs bg-muted"
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                        </div>
                                        <Button onClick={copyToClipboard} size="icon" variant="secondary">
                                            {hasCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Copia y envía este enlace al usuario para que configure su contraseña.
                                    </p>
                                </div>

                                <DialogFooter className="sm:justify-center">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {
                                            setIsInviteOpen(false)
                                            window.location.reload()
                                        }}
                                    >
                                        Listo, Actualizar Lista
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="px-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="w-[300px]">Usuario</TableHead>
                            <TableHead>Rol Org</TableHead>
                            <TableHead>Plataforma</TableHead>
                            <TableHead className="text-right">Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((member) => (
                            <TableRow key={member.user_id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarFallback className="bg-indigo-50 text-indigo-700 font-medium">
                                                {member.user?.email?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm text-gray-900">{member.user?.email}</span>
                                            <span className="text-xs text-muted-foreground font-mono">{member.user_id.slice(0, 8)}...</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`capitalize ${member.role === 'owner' ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}`}>
                                        {member.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {member.user?.platform_role === 'super_admin' ? (
                                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">Super Admin</Badge>
                                    ) : (
                                        <span className="text-sm text-muted-foreground capitalize">{member.user?.platform_role || 'User'}</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {member.user?.platform_role !== 'super_admin' && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" disabled={loadingAction === member.user_id}>
                                                    {loadingAction === member.user_id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                    ) : (
                                                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => handleForceLogout(member.user_id)}
                                                    className="text-amber-600 focus:text-amber-700 cursor-pointer"
                                                >
                                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                                    Forzar Logout
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleRemoveUser(member.user_id)}
                                                    className="text-red-600 focus:text-red-700 cursor-pointer"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Eliminar de Org
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {users.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground border-dashed border rounded-xl mt-4">
                        No hay usuarios asignados a esta organización.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
