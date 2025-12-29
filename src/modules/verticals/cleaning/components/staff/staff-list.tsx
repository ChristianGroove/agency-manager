import { useEffect, useState } from "react"
import { getCleaningStaff, removeCleaningStaff, getStaffPortalLink } from "../../actions/staff-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { MapPin, Star, DollarSign, Plus, Pencil, Trash2, Link2, MoreVertical } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StaffForm } from "./staff-form"

interface StaffListProps {
    viewMode?: 'list' | 'grid'
}

export function StaffList({ viewMode = 'grid' }: StaffListProps) {
    const [staff, setStaff] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [staffToEdit, setStaffToEdit] = useState<any>(null)

    useEffect(() => {
        loadStaff()
    }, [])

    const loadStaff = async () => {
        setIsLoading(true)
        try {
            const data = await getCleaningStaff()
            setStaff(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar personal")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = () => {
        setStaffToEdit(null)
        setIsFormOpen(true)
    }

    const handleEdit = (profile: any) => {
        setStaffToEdit(profile)
        setIsFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este perfil de limpieza? El usuario seguirá en la organización.")) return
        try {
            const res = await removeCleaningStaff(id)
            if (res.success) {
                toast.success("Perfil eliminado")
                loadStaff()
            } else {
                toast.error("Error al eliminar")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleCopyPortalLink = async (id: string) => {
        try {
            const result = await getStaffPortalLink(id)
            if (result.success && result.link) {
                await navigator.clipboard.writeText(result.link)
                toast.success(`Link copiado para ${result.name}`, {
                    description: "El trabajador puede acceder a su portal con este link"
                })
            } else {
                toast.error(result.error || "Error al obtener link")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al copiar link")
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Equipo de Limpieza</h3>
                        <p className="text-sm text-gray-500">Gestiona tu personal de limpieza</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    if (staff.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-medium">Equipo de Limpieza</h3>
                        <p className="text-sm text-gray-500">Gestiona tu personal de limpieza</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Personal
                    </Button>
                </div>
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-gray-500">No hay personal de limpieza asignado.</p>
                    <Button variant="link" onClick={handleCreate}>Asignar el primero</Button>
                </div>
                <StaffForm
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    staffToEdit={staffToEdit}
                    onSuccess={loadStaff}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium">Equipo de Limpieza</h3>
                    <p className="text-sm text-gray-500">{staff.length} miembro{staff.length !== 1 ? 's' : ''}</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Personal
                </Button>
            </div>

            {viewMode === 'grid' ? (
                /* Compact Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staff.map((profile) => (
                        <Card key={profile.id} className="hover:shadow-md transition-shadow group overflow-hidden">
                            <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarImage src={profile.avatar_url} />
                                        <AvatarFallback className="text-xs bg-blue-600 text-white">
                                            {profile.name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-semibold text-sm truncate">{profile.name}</h4>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleCopyPortalLink(profile.id)}>
                                                        <Link2 className="h-3.5 w-3.5 mr-2" />
                                                        Copiar Link Portal
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleEdit(profile)}>
                                                        <Pencil className="h-3.5 w-3.5 mr-2" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(profile.id)} className="text-red-600">
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant={profile.is_available ? "default" : "secondary"} className="h-4 text-[10px] px-1">
                                                {profile.is_available ? 'Disponible' : 'No Disp.'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground capitalize">{profile.role}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-1 text-xs font-medium text-green-600">
                                            <DollarSign className="h-3 w-3" />
                                            {profile.hourly_rate?.toLocaleString()}/hr
                                        </div>
                                        {profile.skills && profile.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {profile.skills.slice(0, 2).map((skill: string) => (
                                                    <span key={skill} className="text-[10px] bg-blue-50 text-blue-700 px-1 py-0.5 rounded capitalize">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {profile.skills.length > 2 && (
                                                    <span className="text-[10px] text-gray-500">+{profile.skills.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* List View - Table */
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Personal</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Tarifa/hr</TableHead>
                                <TableHead>Habilidades</TableHead>
                                <TableHead className="w-[100px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((profile) => (
                                <TableRow key={profile.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={profile.avatar_url} />
                                                <AvatarFallback className="text-xs">{profile.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{profile.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={profile.is_available ? "default" : "secondary"} className="text-xs">
                                            {profile.is_available ? 'Disponible' : 'No Disponible'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="capitalize">{profile.role}</TableCell>
                                    <TableCell className="font-medium text-green-600">${profile.hourly_rate?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        {profile.skills && profile.skills.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {profile.skills.slice(0, 3).map((skill: string) => (
                                                    <span key={skill} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded capitalize">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {profile.skills.length > 3 && <span className="text-xs text-muted-foreground">+{profile.skills.length - 3}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleCopyPortalLink(profile.id)}>
                                                    <Link2 className="h-4 w-4 mr-2" />
                                                    Copiar Link Portal
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(profile)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(profile.id)} className="text-red-600">
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <StaffForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                staffToEdit={staffToEdit}
                onSuccess={loadStaff}
            />
        </div>
    )
}
