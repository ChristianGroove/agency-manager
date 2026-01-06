"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Edit, GripVertical, Save, X, Settings } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PipelineStage, getPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage, reorderPipelineStages } from "../pipeline-actions"
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const COLOR_OPTIONS = [
    { value: 'bg-blue-500', label: 'Azul' },
    { value: 'bg-purple-500', label: 'Púrpura' },
    { value: 'bg-indigo-500', label: 'Índigo' },
    { value: 'bg-yellow-500', label: 'Amarillo' },
    { value: 'bg-orange-500', label: 'Naranja' },
    { value: 'bg-green-500', label: 'Verde' },
    { value: 'bg-red-500', label: 'Rojo' },
    { value: 'bg-pink-500', label: 'Rosa' },
    { value: 'bg-gray-500', label: 'Gris' },
]

const ICON_OPTIONS = [
    { value: 'plus', label: 'Plus' },
    { value: 'mail', label: 'Mail' },
    { value: 'check-circle', label: 'Check' },
    { value: 'file-text', label: 'Documento' },
    { value: 'users', label: 'Usuarios' },
    { value: 'trophy', label: 'Trofeo' },
    { value: 'x-circle', label: 'X' },
    { value: 'circle', label: 'Círculo' },
]

interface PipelineSettingsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onStagesChange?: () => void
}

// Sortable Stage Card Component
function SortableStageCard({
    stage,
    editingId,
    onEdit,
    onUpdate,
    onDelete
}: {
    stage: PipelineStage
    editingId: string | null
    onEdit: (id: string | null) => void
    onUpdate: (id: string, updates: Partial<PipelineStage>) => void
    onDelete: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: stage.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-white dark:bg-zinc-800 p-3 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-center gap-3",
                isDragging && "shadow-lg ring-2 ring-indigo-500/20"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className={cn("w-3 h-3 rounded-full shrink-0", stage.color)} />

            <div className="flex-1 min-w-0">
                {editingId === stage.id ? (
                    <Input
                        defaultValue={stage.name}
                        onBlur={(e) => onUpdate(stage.id, { name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onUpdate(stage.id, { name: (e.target as HTMLInputElement).value })}
                        className="h-7 text-sm"
                        autoFocus
                    />
                ) : (
                    <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{stage.name}</p>
                        <p className="text-xs text-gray-400">{stage.status_key}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-0.5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => onEdit(editingId === stage.id ? null : stage.id)}
                >
                    {editingId === stage.id ? <X className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => onDelete(stage.id)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

export function PipelineSettingsSheet({ open, onOpenChange, onStagesChange }: PipelineSettingsSheetProps) {
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [showNewForm, setShowNewForm] = useState(false)

    const [newStage, setNewStage] = useState({
        name: '',
        status_key: '',
        color: 'bg-gray-500',
        icon: 'circle',
    })

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    useEffect(() => {
        if (open) loadStages()
    }, [open])

    async function loadStages() {
        setIsLoading(true)
        try {
            const data = await getPipelineStages()
            setStages(data)
        } catch (error) {
            console.error(error)
            toast.error("Error cargando etapas")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over || active.id === over.id) return

        const oldIndex = stages.findIndex(s => s.id === active.id)
        const newIndex = stages.findIndex(s => s.id === over.id)

        // Optimistically update UI
        const newStages = arrayMove(stages, oldIndex, newIndex)
        setStages(newStages)

        // Persist to server
        const res = await reorderPipelineStages(newStages.map(s => s.id))
        if (res.success) {
            toast.success("Orden actualizado")
            onStagesChange?.()
        } else {
            toast.error("Error al reordenar")
            loadStages() // Rollback
        }
    }

    async function handleCreateStage() {
        if (!newStage.name || !newStage.status_key) {
            toast.error("Nombre y clave son requeridos")
            return
        }

        const res = await createPipelineStage({
            name: newStage.name,
            status_key: newStage.status_key.toLowerCase().replace(/\s+/g, '_'),
            color: newStage.color,
            icon: newStage.icon,
            display_order: stages.length + 1,
        })

        if (res.success) {
            toast.success("Etapa creada")
            setNewStage({ name: '', status_key: '', color: 'bg-gray-500', icon: 'circle' })
            setShowNewForm(false)
            loadStages()
            onStagesChange?.()
        } else {
            toast.error(res.error || "Error al crear etapa")
        }
    }

    async function handleUpdateStage(stageId: string, updates: Partial<PipelineStage>) {
        const res = await updatePipelineStage(stageId, updates)
        if (res.success) {
            toast.success("Etapa actualizada")
            setEditingId(null)
            loadStages()
            onStagesChange?.()
        } else {
            toast.error(res.error || "Error al actualizar")
        }
    }

    async function handleDeleteStage(stageId: string) {
        const confirmed = confirm("¿Eliminar esta etapa? Los leads no se eliminarán.")
        if (!confirmed) return

        const res = await deletePipelineStage(stageId)
        if (res.success) {
            toast.success("Etapa eliminada")
            loadStages()
            onStagesChange?.()
        } else {
            toast.error(res.error || "Error al eliminar")
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[500px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-slate-900 dark:bg-white">
                                <Settings className="h-4 w-4 text-white dark:text-slate-900" />
                            </div>
                            Configurar Pipeline
                        </SheetTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Arrastra para reordenar las etapas</p>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Add New Button or Form */}
                        {!showNewForm ? (
                            <Button
                                onClick={() => setShowNewForm(true)}
                                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Etapa
                            </Button>
                        ) : (
                            <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-sm">Nueva Etapa</h4>
                                    <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Nombre</Label>
                                        <Input
                                            placeholder="Ej: Propuesta Enviada"
                                            value={newStage.name}
                                            onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">Clave única</Label>
                                        <Input
                                            placeholder="Ej: proposal_sent"
                                            value={newStage.status_key}
                                            onChange={(e) => setNewStage({ ...newStage, status_key: e.target.value })}
                                            className="h-9"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Color</Label>
                                            <Select value={newStage.color} onValueChange={(val) => setNewStage({ ...newStage, color: val })}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COLOR_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("w-3 h-3 rounded-full", opt.value)} />
                                                                {opt.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Ícono</Label>
                                            <Select value={newStage.icon} onValueChange={(val) => setNewStage({ ...newStage, icon: val })}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ICON_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <Button onClick={handleCreateStage} className="w-full" size="sm">
                                        <Save className="mr-2 h-4 w-4" />
                                        Crear Etapa
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Stages List with Drag and Drop */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                Etapas Actuales
                            </h4>

                            {isLoading ? (
                                <div className="text-center py-8 text-gray-500">Cargando...</div>
                            ) : stages.length === 0 ? (
                                <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl border border-gray-200 dark:border-zinc-700 text-center">
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No hay etapas configuradas</p>
                                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Crea tu primera etapa arriba</p>
                                </div>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={stages.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {stages.map((stage) => (
                                                <SortableStageCard
                                                    key={stage.id}
                                                    stage={stage}
                                                    editingId={editingId}
                                                    onEdit={setEditingId}
                                                    onUpdate={handleUpdateStage}
                                                    onDelete={handleDeleteStage}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
