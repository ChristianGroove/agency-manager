"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserPlus, Trash2, Mail, Shield, User } from "lucide-react"
import { toast } from "sonner"
import { getOrganizationMembers, inviteMember, removeMember } from "./actions/team-actions"

export function TeamSettingsTab() {
    const [members, setMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviteOpen, setIsInviteOpen] = useState(false)

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState("member")
    const [isInviting, setIsInviting] = useState(false)

    const loadMembers = async () => {
        setIsLoading(true)
        try {
            const data = await getOrganizationMembers()
            setMembers(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar miembros")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadMembers()
    }, [])

    const handleInvite = async () => {
        if (!inviteEmail) return
        setIsInviting(true)
        try {
            const result = await inviteMember(inviteEmail, inviteRole)
            if (result.success) {
                toast.success("Invitación enviada", {
                    description: result.inviteLink ? "Enlace generado (copia manual)" : "Correo enviado"
                })
                if (result.inviteLink) {
                    navigator.clipboard.writeText(result.inviteLink)
                    toast.info("Enlace copiado al portapapeles")
                }
                setIsInviteOpen(false)
                setInviteEmail("")
                loadMembers()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setIsInviting(false)
        }
    }

    const handleRemove = async (userId: string) => {
        if (!confirm("¿Seguro de remover este miembro?")) return
        try {
            const result = await removeMember(userId)
            if (result.success) {
                toast.success("Miembro removido")
                loadMembers()
            } else {
                toast.error("Error al remover")
            }
        } catch (error) {
            toast.error("Error inesperado")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Equipo y Permisos</h3>
                    <p className="text-sm text-gray-500">Administra quién tiene acceso a esta organización.</p>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invitar Miembro
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
                            <DialogDescription>
                                El usuario recibirá acceso inmediato a la organización.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <Input
                                    id="email"
                                    placeholder="usuario@ejemplo.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Rol</Label>
                                <Select value={inviteRole} onValueChange={setInviteRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Miembro (Operativo)</SelectItem>
                                        <SelectItem value="admin">Administrador (Total)</SelectItem>
                                        {/* Owner cannot be assigned here typically */}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
                            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail}>
                                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Invitar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                    </TableCell>
                                </TableRow>
                            ) : members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No se encontraron miembros.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                    {(member.user?.email?.[0] || 'U').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{member.user?.full_name || 'Sin Nombre'}</div>
                                                    <div className="text-xs text-gray-500">{member.user?.email || 'Sin Email'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                                                {member.role === 'owner' ? 'Dueño' : member.role === 'admin' ? 'Admin' : 'Miembro'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                <span className="text-sm text-gray-600">Activo</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {member.role !== 'owner' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemove(member.user_id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                    <h4 className="font-medium text-blue-900 text-sm">Control de Acceso</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Los usuarios agregados aquí podrán acceder a este espacio de trabajo.
                        Los roles definen qué módulos pueden administrar.
                    </p>
                </div>
            </div>
        </div>
    )
}
