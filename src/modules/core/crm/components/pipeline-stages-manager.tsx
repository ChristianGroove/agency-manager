"use client"

import { useEffect, useState } from "react"
import { PipelineStage, Pipeline, getPipelineStages, createPipelineStage, updatePipelineStage, deletePipelineStage, getDefaultPipeline, togglePipelineStrictMode } from "../pipeline-actions"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Edit, GripVertical, Save, X, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

export function PipelineStagesManager() {
    const [stages, setStages] = useState<PipelineStage[]>([])
    const [pipeline, setPipeline] = useState<Pipeline | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [sheetOpen, setSheetOpen] = useState(false)

    // New stage form
    const [newStage, setNewStage] = useState({
        name: '',
        status_key: '',
        color: 'bg-gray-500',
        icon: 'circle',
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setIsLoading(true)
        try {
            const [stagesData, pipelineData] = await Promise.all([
                getPipelineStages(),
                getDefaultPipeline()
            ])
            setStages(stagesData)
            setPipeline(pipelineData)
        } catch (error) {
            console.error(error)
            toast.error("Error cargando configuración")
        } finally {
            setIsLoading(false)
        }
    }

    async function handleToggleStrictMode(enabled: boolean) {
        if (!pipeline) return

        // Optimistic update
        const previousState = pipeline.process_enabled
        setPipeline({ ...pipeline, process_enabled: enabled })

        const res = await togglePipelineStrictMode(pipeline.id, enabled)

        if (res.success) {
            toast.success(enabled ? "Modo Guiado Activado" : "Modo Guiado Desactivado")
        } else {
            setPipeline({ ...pipeline, process_enabled: previousState })
            toast.error("Error al actualizar configuración")
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
            toast.success("Etapa creada exitosamente")
            setNewStage({ name: '', status_key: '', color: 'bg-gray-500', icon: 'circle' })
            setSheetOpen(false)
            loadData() // Reload to catch any side effects
        } else {
            toast.error(res.error || "Error al crear etapa")
        }
    }

    async function handleUpdateStage(stageId: string, updates: Partial<PipelineStage>) {
        const res = await updatePipelineStage(stageId, updates)
        if (res.success) {
            toast.success("Etapa actualizada")
            setEditingId(null)
            loadData()
        } else {
            toast.error(res.error || "Error al actualizar")
        }
    }

    async function handleDeleteStage(stageId: string) {
        const confirmed = confirm("¿Estás seguro? Los leads en esta etapa no se eliminarán, pero la etapa ya no estará disponible.")
        if (!confirmed) return

        const res = await deletePipelineStage(stageId)
        if (res.success) {
            toast.success("Etapa eliminada")
            loadData()
        } else {
            toast.error(res.error || "Error al eliminar")
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando configuración...</div>
    }

    return (
        <div className="flex-1 space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight dark:text-white">Configuración del Pipeline</h2>
                    <p className="text-muted-foreground">
                        Gestiona las reglas y etapas de tu proceso de ventas
                    </p>
                </div>
            </div>

            {/* Strict Mode Toggle Card */}
            <Card className="p-6 border-l-4 border-l-primary bg-background shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">Modo Guiado del Pipeline</h3>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-2xl">
                            Cuando está activo, el sistema evita errores humanos validando que los cambios de estado sigan el proceso definido.
                            Los leads no podrán saltear etapas obligatorias sin completar los requisitos.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", !pipeline?.process_enabled && "text-muted-foreground")}>
                            {pipeline?.process_enabled ? "ACTIVADO" : "DESACTIVADO"}
                        </span>
                        <Switch
                            checked={pipeline?.process_enabled || false}
                            onCheckedChange={handleToggleStrictMode}
                            disabled={!pipeline}
                        />
                    </div>
                </div>
            </Card>

            <div className="h-px bg-border my-6" />

            {/* Section Header with New Button */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold dark:text-white">Etapas del Pipeline</h3>
                    <p className="text-sm text-muted-foreground">
                        Define los pasos que seguirán tus leads
                    </p>
                </div>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Etapa
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Crear Nueva Etapa</SheetTitle>
                            <SheetDescription>
                                Define una nueva etapa para tu pipeline de CRM
                            </SheetDescription>
                        </SheetHeader>

                        <div className="space-y-4 mt-6">
                            <div className="space-y-2">
                                <Label>Nombre de la Etapa</Label>
                                <Input
                                    placeholder="Ej: Propuesta Enviada"
                                    value={newStage.name}
                                    onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Clave (ID único)</Label>
                                <Input
                                    placeholder="Ej: proposal_sent"
                                    value={newStage.status_key}
                                    onChange={(e) => setNewStage({ ...newStage, status_key: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Solo letras, números y guiones bajos
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Color</Label>
                                <Select value={newStage.color} onValueChange={(val) => setNewStage({ ...newStage, color: val })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLOR_OPTIONS.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-4 h-4 rounded-full", opt.value)} />
                                                    {opt.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Ícono</Label>
                                <Select value={newStage.icon} onValueChange={(val) => setNewStage({ ...newStage, icon: val })}>
                                    <SelectTrigger>
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

                            <Button onClick={handleCreateStage} className="w-full">
                                <Save className="mr-2 h-4 w-4" />
                                Crear Etapa
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Stages List */}
            <div className="space-y-2">
                {stages.map((stage, index) => (
                    <Card key={stage.id} className="p-4 bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                            <div className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className={cn("w-3 h-3 rounded-full shrink-0", stage.color)} />

                            <div className="flex-1">
                                {editingId === stage.id ? (
                                    <Input
                                        defaultValue={stage.name}
                                        onBlur={(e) => handleUpdateStage(stage.id, { name: e.target.value })}
                                        className="h-8"
                                    />
                                ) : (
                                    <div>
                                        <p className="font-medium">{stage.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Clave: {stage.status_key} | Orden: {stage.display_order}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingId(editingId === stage.id ? null : stage.id)}
                                >
                                    {editingId === stage.id ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteStage(stage.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {stages.length === 0 && (
                <Card className="p-8 text-center bg-white dark:bg-white/5 border-gray-100 dark:border-white/10">
                    <p className="text-muted-foreground mb-4">No hay etapas configuradas</p>
                    <p className="text-sm text-muted-foreground">
                        Crea tu primera etapa para comenzar a gestionar tu pipeline
                    </p>
                </Card>
            )}
        </div>
    )
}
