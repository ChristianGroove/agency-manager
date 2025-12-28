"use client"

import { StaffProfile } from "@/types/workforce"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateStaffDialog } from "./create-staff-dialog"
import { useState } from "react"

interface StaffListProps {
    profiles: StaffProfile[]
    orgId: string
}

export function StaffList({ profiles, orgId }: StaffListProps) {
    const [editingId, setEditingId] = useState<string | null>(null)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Personal Activo</h2>
                    <p className="text-sm text-muted-foreground">
                        Gestiona tarifas y habilidades de tu equipo de campo.
                    </p>
                </div>
                <CreateStaffDialog orgId={orgId} />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Miembro</TableHead>
                            <TableHead>Tarifa / Hora</TableHead>
                            <TableHead>Habilidades / Etiquetas</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No hay personal asignado. Añade miembros desde el botón superior.
                                </TableCell>
                            </TableRow>
                        ) : (
                            profiles.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={profile.member?.avatar_url || undefined} />
                                                <AvatarFallback>{profile.member?.full_name?.slice(0, 2).toUpperCase() || "ST"}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{profile.member?.full_name || "Desconocido"}</span>
                                                <span className="text-xs text-muted-foreground">{profile.member?.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-mono">
                                            $ {profile.hourly_rate.toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.skills && profile.skills.length > 0 ? (
                                                profile.skills.map((skill, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                        {skill}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Sin etiquetas</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setEditingId(profile.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar Perfil
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Remover del Staff
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
