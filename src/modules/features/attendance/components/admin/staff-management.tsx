"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, UserPlus, Copy, Check, MoreVertical, Edit, Trash2, Shield, MapPin, ExternalLink } from 'lucide-react'
import { Staff, createStaff, updateStaff, deleteStaff, uploadStaffPhoto } from '../../actions'
import { optimizeImage } from '@/modules/infrastructure/utils/image-optimization'
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
    registerNewAction?: (fn: () => void) => void
}

export function StaffManagement({ staff: initialStaff, locations, registerNewAction }: StaffManagementProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [staff, setStaff] = useState(initialStaff)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<Partial<Staff> | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Schedule Customization State
    const [useCustomSchedule, setUseCustomSchedule] = useState(false)
    
    const initialDaySchedule = {
        is_active: true,
        block_1_start: '08:00',
        block_1_end: '12:00',
        block_2_start: '14:00',
        block_2_end: '18:00'
    }

    const [weeklySchedule, setWeeklySchedule] = useState<any>({
        monday: { ...initialDaySchedule },
        tuesday: { ...initialDaySchedule },
        wednesday: { ...initialDaySchedule },
        thursday: { ...initialDaySchedule },
        friday: { ...initialDaySchedule },
        saturday: { ...initialDaySchedule, is_active: false },
        sunday: { ...initialDaySchedule, is_active: false }
    })

    const openDialogForStaff = (person?: Staff) => {
        if (person) {
            setEditingStaff(person)
            if (person.work_schedule && person.work_schedule.monday) {
                setUseCustomSchedule(true)
                setWeeklySchedule({
                    monday: person.work_schedule.monday || { ...initialDaySchedule },
                    tuesday: person.work_schedule.tuesday || { ...initialDaySchedule },
                    wednesday: person.work_schedule.wednesday || { ...initialDaySchedule },
                    thursday: person.work_schedule.thursday || { ...initialDaySchedule },
                    friday: person.work_schedule.friday || { ...initialDaySchedule },
                    saturday: person.work_schedule.saturday || { ...initialDaySchedule, is_active: false },
                    sunday: person.work_schedule.sunday || { ...initialDaySchedule, is_active: false },
                })
            } else {
                setUseCustomSchedule(false)
            }
        } else {
            setEditingStaff({ role: 'staff', shift_type: 'split' })
            setUseCustomSchedule(false)
            setWeeklySchedule({
                monday: { ...initialDaySchedule },
                tuesday: { ...initialDaySchedule },
                wednesday: { ...initialDaySchedule },
                thursday: { ...initialDaySchedule },
                friday: { ...initialDaySchedule },
                saturday: { ...initialDaySchedule, is_active: false },
                sunday: { ...initialDaySchedule, is_active: false }
            })
        }
        setIsDialogOpen(true)
    }

    React.useEffect(() => {
        if (registerNewAction) {
            registerNewAction(() => openDialogForStaff())
        }
    }, [registerNewAction])

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

    const handleReplicateSchedule = (sourceDay: string) => {
        const sourceData = weeklySchedule[sourceDay]
        const newSchedule = { ...weeklySchedule }
        
        Object.keys(newSchedule).forEach(day => {
            newSchedule[day] = { 
                ...sourceData,
                // Mantenemos el estado de activo del día destino si ya estaba seteado, 
                // o lo habilitamos si estamos copiando a todos.
                is_active: sourceData.is_active 
            }
        })
        
        setWeeklySchedule(newSchedule)
        toast.success(`Horario de ${sourceDay === 'monday' ? 'Lunes' : sourceDay} replicado a toda la semana`)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingStaff?.first_name || !editingStaff?.last_name) {
            toast.error("Nombre y apellido son requeridos")
            return
        }

        setIsSubmitting(true)
        try {
            const staffToSave = { ...editingStaff } as any

            // Serialize work_schedule matrix logic
            if (useCustomSchedule) {
                // Sanitizar para el backend (remover bloques vacíos si es continua)
                const processedSchedule = { ...weeklySchedule }
                Object.keys(processedSchedule).forEach(day => {
                    if (staffToSave.shift_type === 'continuous') {
                        delete processedSchedule[day].block_2_start
                        delete processedSchedule[day].block_2_end
                    }
                })
                staffToSave.work_schedule = processedSchedule
            } else {
                staffToSave.work_schedule = null
            }

            if (staffToSave.id) {
                const res = await updateStaff(staffToSave.id, staffToSave)
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Listado de Personal</h3>
                    <p className="text-sm text-slate-500">Administra los accesos y sedes de tu equipo.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Buscar colaborador..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 bg-white dark:bg-zinc-900/50"
                        />
                    </div>
                </div>
            </div>

            <Card className="glass-card rounded-2xl overflow-hidden relative border-none shadow-xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
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
                                    <TableRow key={person.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 dark:text-white">{person.first_name} {person.last_name}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{person.email || person.document_id || 'Sin documento'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
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
                                                <Badge className="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-transparent hover:bg-emerald-200 dark:hover:bg-emerald-500/20">Activo</Badge>
                                            ) : (
                                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700">Inactivo</Badge>
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
                                                    <DropdownMenuItem onClick={() => openDialogForStaff(person)}>
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
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50 dark:bg-zinc-900/50">
                        <DialogTitle>{editingStaff?.id ? 'Editar Colaborador' : 'Nuevo Colaborador'}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        <form id="staff-form" onSubmit={handleSave} className="space-y-6">
                            {/* Información Básica */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Información Básica</h4>
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

                                <div className="space-y-3">
                                    <Label>Fotografía del Colaborador</Label>
                                    <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-white/5">
                                        <div className="relative w-16 h-16 rounded-xl bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                            {editingStaff?.photo_url ? (
                                                <img src={editingStaff.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400">
                                                    <span className="text-[8px] font-bold">Sin foto</span>
                                                </div>
                                            )}
                                            {isUploading && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5 flex-1">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                disabled={isUploading}
                                                className="text-xs h-8"
                                            />
                                            <p className="text-[10px] text-slate-500">JPG, PNG o WebP. Max 2MB.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="document_id">Documento de Identidad</Label>
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
                            </div>

                            {/* Configuración Operativa */}
                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Configuración Operativa</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="location">Sede Asignada</Label>
                                        <Select
                                            value={editingStaff?.location_id || "none"}
                                            onValueChange={val => setEditingStaff(prev => ({ ...prev, location_id: val === "none" ? null : val }))}
                                        >
                                            <SelectTrigger className="h-9">
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
                                        <Label htmlFor="role">Rol</Label>
                                        <Select
                                            value={editingStaff?.role || "staff"}
                                            onValueChange={val => setEditingStaff(prev => ({ ...prev, role: val }))}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Seleccionar rol..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="staff">Vendedor / Staff</SelectItem>
                                                <SelectItem value="manager">Administrador de Sede</SelectItem>
                                                <SelectItem value="associate">Asociado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="shift_type">Tipo de Jornada</Label>
                                    <Select
                                        value={editingStaff?.shift_type || "split"}
                                        onValueChange={val => setEditingStaff(prev => ({ ...prev, shift_type: val as 'continuous' | 'split' }))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Tipo de marcaciones..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="continuous">Continua (Entrada/Salida)</SelectItem>
                                            <SelectItem value="split">Dividida (Incluye Break)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="use_custom_schedule"
                                            checked={useCustomSchedule}
                                            onChange={(e) => setUseCustomSchedule(e.target.checked)}
                                            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                                        />
                                        <Label htmlFor="use_custom_schedule" className="cursor-pointer font-semibold text-slate-900 dark:text-white">Habilitar Horario Personalizado por día</Label>
                                    </div>

                                    {useCustomSchedule && (
                                        <div className="space-y-3 p-1">
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                                <div key={day} className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-white/5 transition-all hover:border-slate-200 dark:hover:border-white/10">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Label className="capitalize font-bold text-slate-800 dark:text-slate-200">
                                                                {day === 'monday' ? 'Lunes' :
                                                                    day === 'tuesday' ? 'Martes' :
                                                                        day === 'wednesday' ? 'Miércoles' :
                                                                            day === 'thursday' ? 'Jueves' :
                                                                                day === 'friday' ? 'Viernes' :
                                                                                    day === 'saturday' ? 'Sábado' : 'Domingo'}
                                                            </Label>
                                                            {weeklySchedule[day].is_active && (
                                                                <Button 
                                                                    type="button"
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-6 px-2 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 gap-1 rounded-full"
                                                                    onClick={() => handleReplicateSchedule(day)}
                                                                >
                                                                    <Copy className="w-3 h-3" /> Aplicar a todos
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-500 uppercase font-bold">Activo</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={weeklySchedule[day].is_active}
                                                                onChange={(e) => setWeeklySchedule((prev: any) => ({
                                                                    ...prev,
                                                                    [day]: { ...prev[day], is_active: e.target.checked }
                                                                }))}
                                                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>

                                                    {weeklySchedule[day].is_active && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">Entrada</Label>
                                                                <Input
                                                                    type="time"
                                                                    className="h-8 text-xs bg-white dark:bg-zinc-900"
                                                                    value={weeklySchedule[day].block_1_start}
                                                                    onChange={e => setWeeklySchedule((prev: any) => ({
                                                                        ...prev,
                                                                        [day]: { ...prev[day], block_1_start: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">
                                                                    {editingStaff?.shift_type === 'continuous' ? 'Salida' : 'Inicio Break'}
                                                                </Label>
                                                                <Input
                                                                    type="time"
                                                                    className="h-8 text-xs bg-white dark:bg-zinc-900"
                                                                    value={weeklySchedule[day].block_1_end}
                                                                    onChange={e => setWeeklySchedule((prev: any) => ({
                                                                        ...prev,
                                                                        [day]: { ...prev[day], block_1_end: e.target.value }
                                                                    }))}
                                                                />
                                                            </div>

                                                            {editingStaff?.shift_type === 'split' && (
                                                                <>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">Fin Break</Label>
                                                                        <Input
                                                                            type="time"
                                                                            className="h-8 text-xs bg-white dark:bg-zinc-900"
                                                                            value={weeklySchedule[day].block_2_start}
                                                                            onChange={e => setWeeklySchedule((prev: any) => ({
                                                                                ...prev,
                                                                                [day]: { ...prev[day], block_2_start: e.target.value }
                                                                            }))}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[9px] uppercase text-slate-500 font-black tracking-tighter">Salida Final</Label>
                                                                        <Input
                                                                            type="time"
                                                                            className="h-8 text-xs bg-white dark:bg-zinc-900"
                                                                            value={weeklySchedule[day].block_2_end}
                                                                            onChange={e => setWeeklySchedule((prev: any) => ({
                                                                                ...prev,
                                                                                [day]: { ...prev[day], block_2_end: e.target.value }
                                                                            }))}
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-6 pt-2 border-t bg-slate-50/30 dark:bg-zinc-900/30">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                        <Button 
                            form="staff-form"
                            type="submit" 
                            disabled={isSubmitting} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none rounded-xl px-8"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Colaborador'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

