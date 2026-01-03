'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
    Plus,
    Calendar as CalendarIcon,
    CheckCircle2,
    Circle,
    Clock,
    Trash2,
    AlertCircle
} from 'lucide-react'
import type { LeadTask, TaskPriority, TaskType } from '@/types/crm-advanced'
import { createLeadTask, updateLeadTask, deleteLeadTask } from '../../crm-advanced-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface LeadTasksTabProps {
    leadId: string
    tasks: LeadTask[]
    onUpdate: () => void
}

export function LeadTasksTab({ leadId, tasks, onUpdate }: LeadTasksTabProps) {
    const [isCreating, setIsCreating] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        task_type: 'follow_up' as TaskType,
        priority: 'medium' as TaskPriority,
        due_date: undefined as Date | undefined
    })
    const [saving, setSaving] = useState(false)

    async function handleCreate() {
        if (!formData.title.trim()) {
            toast.error('El título es requerido')
            return
        }

        setSaving(true)
        try {
            const result = await createLeadTask({
                lead_id: leadId,
                title: formData.title,
                description: formData.description,
                task_type: formData.task_type,
                priority: formData.priority,
                due_date: formData.due_date?.toISOString()
            })

            if (result.success) {
                toast.success('Tarea creada')
                setIsCreating(false)
                setFormData({
                    title: '',
                    description: '',
                    task_type: 'follow_up',
                    priority: 'medium',
                    due_date: undefined
                })
                onUpdate()
            } else {
                toast.error(result.error || 'Error al crear tarea')
            }
        } catch (error) {
            console.error('Error creating task:', error)
            toast.error('Error al crear tarea')
        } finally {
            setSaving(false)
        }
    }

    async function handleToggleStatus(task: LeadTask) {
        try {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed'
            const result = await updateLeadTask(task.id, { status: newStatus })

            if (result.success) {
                toast.success(newStatus === 'completed' ? 'Tarea completada' : 'Tarea reabierta')
                onUpdate()
            } else {
                toast.error('Error al actualizar tarea')
            }
        } catch (error) {
            console.error('Error updating task:', error)
        }
    }

    async function handleDelete(taskId: string) {
        if (!confirm('¿Estás seguro de eliminar esta tarea?')) return

        try {
            const result = await deleteLeadTask(taskId)
            if (result.success) {
                toast.success('Tarea eliminada')
                onUpdate()
            } else {
                toast.error('Error al eliminar')
            }
        } catch (error) {
            console.error('Error deleting task:', error)
        }
    }

    const priorityColors = {
        low: 'bg-slate-100 text-slate-800',
        medium: 'bg-blue-100 text-blue-800',
        high: 'bg-orange-100 text-orange-800',
        urgent: 'bg-red-100 text-red-800'
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Tareas Pendientes</h3>
                <Button onClick={() => setIsCreating(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Tarea
                </Button>
            </div>

            {isCreating && (
                <Card className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Nueva Tarea</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Título de la tarea"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Descripción (opcional)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Select
                                    value={formData.task_type}
                                    onValueChange={(v: TaskType) => setFormData({ ...formData, task_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="call">Llamada</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="meeting">Reunión</SelectItem>
                                        <SelectItem value="follow_up">Seguimiento</SelectItem>
                                        <SelectItem value="custom">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1">
                                <Select
                                    value={formData.priority}
                                    onValueChange={(v: TaskPriority) => setFormData({ ...formData, priority: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Prioridad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baja</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !formData.due_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.due_date ? format(formData.due_date, "PPP", { locale: es }) : "Fecha"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.due_date}
                                            onSelect={(date) => setFormData({ ...formData, due_date: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancelar</Button>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving ? 'Guardando...' : 'Crear Tarea'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {tasks.length === 0 && !isCreating ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p>No hay tareas pendientes</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div
                            key={task.id}
                            className={cn(
                                "group flex items-start gap-3 p-4 rounded-lg border bg-card transition-all hover:shadow-sm",
                                task.status === 'completed' && "opacity-60 bg-slate-50 dark:bg-slate-900"
                            )}
                        >
                            <button
                                onClick={() => handleToggleStatus(task)}
                                className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            >
                                {task.status === 'completed' ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                    <Circle className="h-5 w-5" />
                                )}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className={cn(
                                            "font-medium truncate",
                                            task.status === 'completed' && "line-through text-muted-foreground"
                                        )}>
                                            {task.title}
                                        </h4>
                                        {task.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                                        onClick={() => handleDelete(task.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-3 mt-3 text-xs">
                                    <Badge variant="outline" className="capitalize">
                                        {task.task_type.replace('_', ' ')}
                                    </Badge>

                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full font-medium capitalize",
                                        priorityColors[task.priority] || priorityColors.medium
                                    )}>
                                        {task.priority === 'urgent' && <AlertCircle className="h-3 w-3 inline mr-1" />}
                                        {task.priority}
                                    </span>

                                    {task.due_date && (
                                        <span className={cn(
                                            "flex items-center gap-1",
                                            task.status !== 'completed' && new Date(task.due_date) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"
                                        )}>
                                            <CalendarIcon className="h-3 w-3" />
                                            {format(new Date(task.due_date), "d MMM", { locale: es })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
