"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, UserPlus, Copy, Check, MoreVertical, Edit, Trash2, Shield, MapPin, ExternalLink } from 'lucide-react'
import { Staff, createStaff, updateStaff, deleteStaff, uploadStaffPhoto } from '../../actions'
import { optimizeImage } from '@/lib/utils/image-optimization'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface StaffManagementProps {
    staff: (Staff & { location: { name: string } | null })[]
    locations: any[]
}

export function StaffManagement({ staff: initialStaff, locations }: StaffManagementProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [staff, setStaff] = useState(initialStaff)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const filteredStaff = staff.filter(s => {
        const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
        const term = searchTerm.toLowerCase()
        return fullName.includes(term) || (s.email || '').toLowerCase().includes(term)
    })

    const handleCopyToken = (staffId: string, token: string) => {
        const portalUrl = `${window.location.origin}/portal/${token}`
        navigator.clipboard.writeText(portalUrl)
        setCopiedId(staffId)
        toast.success("Enlace de acceso copiado")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Optimize image before upload
            const optimizedBlob = await optimizeImage(file, {
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.7,
                format: 'image/webp'
            })

            const formData = new FormData()
            formData.append('file', new File([optimizedBlob], 'avatar.webp', { type: 'image/webp' }))

            const res = await uploadStaffPhoto(formData)
            if (res.success && res.url) {
                setEditingStaff(prev => ({ ...prev, photo_url: res.url }))
                toast.success("Fotografía cargada y optimizada")
            } else {
                toast.error(res.error || "Error al subir imagen")
            }
        } catch (error) {
            toast.error("Error al procesar la imagen")
            console.error(error)
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStaff?.first_name || !editingStaff?.last_name) {
            toast.error("Nombre y apellido son requeridos")
            return
        }

        setIsSubmitting(true)
        try {
            if (editingStaff.id) {
                const res = await updateStaff(editingStaff.id, editingStaff)
                if (res.success) {
                    setStaff(prev => prev.map(s => s.id === editingStaff.id ? { ...s, ...res.data } : s))
                    toast.success("Colaborador actualizado")
                } else {
                    toast.error(res.error)
                }
            } else {
                const res = await createStaff(editingStaff)
                if (res.success) {
                    // Refresh localized data or just push
                    setStaff(prev => [res.data, ...prev])
                    toast.success("Colaborador creado exitosamente")
                } else {
                    toast.error(res.error)
                }
            }
            setIsDialogOpen(false)
            setEditingStaff(null)
        } catch (error) {
            toast.error("Error al guardar")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar a este colaborador? Esta acción no se puede deshacer.")) return

        try {
            const res = await deleteStaff(id)
            if (res.success) {
                setStaff(prev => prev.filter(s => s.id !== id))
                toast.success("Colaborador eliminado")
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">Gestión de Personal</h3>
                <Button
                    onClick={() => { setEditingStaff({}); setIsDialogOpen(true) }}
                    className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-xl"
                >
                    <UserPlus className="w-4 h-4 mr-2" /> Nuevo Colaborador
                </Button>
            </div>

            <Card className="border-gray-100 dark:border-white/5 overflow-hidden">
                <CardHeader className="border-b bg-slate-50/30 dark:bg-zinc-900/30 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Listado de Personal</CardTitle>
                            <CardDescription>Administra los accesos y sedes de tu equipo.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar colaborador..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 bg-white dark:bg-zinc-900/50"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Sede Asignada</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Enlace Portal</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStaff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No se encontraron colaboradores.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStaff.map((person) => (
                                    <TableRow key={person.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{person.first_name} {person.last_name}</span>
                                                <span className="text-xs text-slate-500">{person.email || person.document_id || 'Sin documento'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                {person.location?.name || 'No asignada'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {person.role === 'manager' ? <Shield className="w-3 h-3 mr-1" /> : null}
                                                {person.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {person.is_active ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Activo</Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 border-none">Inactivo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-2"
                                                onClick={() => handleCopyToken(person.id, person.access_token)}
                                            >
                                                {copiedId === person.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                Copiar Link
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => { setEditingStaff(person); setIsDialogOpen(true) }}>
                                                        <Edit className="w-4 h-4 mr-2" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleCopyToken(person.id, person.access_token)}>
                                                        <ExternalLink className="w-4 h-4 mr-2" /> Abrir Portal
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(person.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal de Edición/Creación */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingStaff?.id ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">Nombre</Label>
                                <Input
                                    id="first_name"
                                    value={editingStaff?.first_name || ''}
                                    onChange={e => setEditingStaff(prev => ({ ...prev, first_name: e.target.value }))}
                                    placeholder="Juan"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Apellido</Label>
                                <Input
                                    id="last_name"
                                    value={editingStaff?.last_name || ''}
                                    onChange={e => setEditingStaff(prev => ({ ...prev, last_name: e.target.value }))}
                                    placeholder="Pérez"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 py-2">
                            <Label>Fotografía del Colaborador</Label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-24 h-24 rounded-2xl bg-slate-100 dark:bg-zinc-900 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                    {editingStaff?.photo_url ? (
                                        <img src={editingStaff.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Badge className="bg-transparent text-[10px] p-0 shadow-none">Formatos</Badge>
                                            <span className="text-[10px]">JPG, PNG</span>
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="text-xs"
                                    />
                                    <p className="text-[10px] text-slate-500">
                                        Las imágenes se comprimen automáticamente para máxima eficiencia.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="document_id">Documento de Identidad (DNI/Cédula)</Label>
                            <Input
                                id="document_id"
                                value={editingStaff?.document_id || ''}
                                onChange={e => setEditingStaff(prev => ({ ...prev, document_id: e.target.value }))}
                                placeholder="10203040"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={editingStaff?.email || ''}
                                    onChange={e => setEditingStaff(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="juan@empresa.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                    id="phone"
                                    value={editingStaff?.phone || ''}
                                    onChange={e => setEditingStaff(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+57 300..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Sede Asignada</Label>
                            <Select
                                value={editingStaff?.location_id || "none"}
                                onValueChange={val => setEditingStaff(prev => ({ ...prev, location_id: val === "none" ? null : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar sede..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin sede fija</SelectItem>
                                    {locations.map(loc => (
                                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="shift_type">Tipo de Turno</Label>
                            <Select
                                value={editingStaff?.shift_type || "split"}
                                onValueChange={val => setEditingStaff(prev => ({ ...prev, shift_type: val as 'continuous' | 'split' }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo de turno..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="continuous">Jornada Continua (2 marcaciones)</SelectItem>
                                    <SelectItem value="split">Jornada Dividida / Break (4 marcaciones)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select
                                value={editingStaff?.role || "staff"}
                                onValueChange={val => setEditingStaff(prev => ({ ...prev, role: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar rol..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staff">Vendedor / Staff</SelectItem>
                                    <SelectItem value="manager">Administrador de Sede</SelectItem>
                                    <SelectItem value="associate">Asociado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting ? 'Guardando...' : 'Guardar Colaborador'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
