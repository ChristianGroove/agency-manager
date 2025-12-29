"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { forceLogoutUser } from "@/modules/core/admin/actions"
import { toast } from "sonner"
import { LogOut, ShieldAlert, Loader2 } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface User {
    user_id: string
    role: string
    user: {
        email: string
        platform_role: string
    }
}

interface OrgSecurityManagerProps {
    users: User[]
}

export function OrgSecurityManager({ users }: OrgSecurityManagerProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})

    const handleForceLogout = async (userId: string) => {
        if (!confirm("¿Estás seguro? Esto cerrará la sesión activa del usuario inmediatamente.")) return

        setLoadingMap(prev => ({ ...prev, [userId]: true }))
        try {
            await forceLogoutUser(userId)
            toast.success("Sesión cerrada exitosamente")
        } catch (error: any) {
            toast.error("Error: " + error.message)
        } finally {
            setLoadingMap(prev => ({ ...prev, [userId]: false }))
        }
    }

    return (
        <Card className="border-red-100 dark:border-red-900/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    Zona de Seguridad
                </CardTitle>
                <CardDescription>
                    Acciones críticas sobre los usuarios de esta organización.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Rol Org</TableHead>
                            <TableHead>Rol Plataforma</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((member) => (
                            <TableRow key={member.user_id}>
                                <TableCell className="font-medium">
                                    {member.user.email}
                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                        {member.user_id}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{member.role}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{member.user.platform_role}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleForceLogout(member.user_id)}
                                        disabled={loadingMap[member.user_id]}
                                    >
                                        {loadingMap[member.user_id] ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Forzar Logout
                                            </>
                                        )}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
