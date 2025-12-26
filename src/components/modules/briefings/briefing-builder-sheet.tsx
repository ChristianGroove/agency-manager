"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Loader2, Sparkles, X } from "lucide-react"
import { BriefingTemplate, BriefingField, BriefingFieldType } from "@/types/briefings"
import { createBriefingTemplate, updateBriefingTemplate } from "@/lib/actions/briefings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface BriefingBuilderSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    templateToEdit?: BriefingTemplate | null
    onSuccess?: () => void
}

export function BriefingBuilderSheet({
    open,
    onOpenChange,
    templateToEdit,
    onSuccess
}: BriefingBuilderSheetProps) {
    const [loading, setLoading] = useState(false)
    const [template, setTemplate] = useState<{
        name: string
        description: string
        structure: BriefingField[]
    }>({
        name: "",
        description: "",
        structure: []
    })

    // Sync with templateToEdit
    useEffect(() => {
        if (templateToEdit) {
            setTemplate({
                name: templateToEdit.name,
                description: templateToEdit.description || "",
                structure: templateToEdit.structure || []
            })
        } else {
            setTemplate({ name: "", description: "", structure: [] })
        }
    }, [templateToEdit, open])

    const addField = () => {
        const newField: BriefingField = {
            id: `field_${Date.now()}`,
            label: "Nueva pregunta",
            type: "text",
            required: false,
            options: null,
            step_title: "General"
        }
        setTemplate(prev => ({
            ...prev,
            structure: [...prev.structure, newField]
        }))
    }

    const updateField = (index: number, updates: Partial<BriefingField>) => {
        setTemplate(prev => ({
            ...prev,
            structure: prev.structure.map((field, i) =>
                i === index ? { ...field, ...updates } : field
            )
        }))
    }

    const deleteField = (index: number) => {
        setTemplate(prev => ({
            ...prev,
            structure: prev.structure.filter((_, i) => i !== index)
        }))
    }

    const moveField = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= template.structure.length) return

        setTemplate(prev => {
            const newStructure = [...prev.structure]
            const temp = newStructure[index]
            newStructure[index] = newStructure[newIndex]
            newStructure[newIndex] = temp
            return { ...prev, structure: newStructure }
        })
    }

    const handleSave = async () => {
        if (!template.name.trim()) {
            toast.error("El nombre es obligatorio")
            return
        }

        if (template.structure.length === 0) {
            toast.error("Agrega al menos una pregunta")
            return
        }

        setLoading(true)
        try {
            const slug = template.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

            if (templateToEdit) {
                await updateBriefingTemplate(templateToEdit.id, {
                    name: template.name,
                    description: template.description,
                    structure: template.structure
                })
                toast.success("Plantilla actualizada")
            } else {
                await createBriefingTemplate({
                    name: template.name,
                    description: template.description,
                    slug,
                    structure: template.structure
                })
                toast.success("Plantilla creada")
            }

            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || "Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="min-w-[90vw] sm:max-w-[90vw] p-0 gap-0 border-none shadow-2xl m-4 rounded-3xl overflow-hidden bg-white"
                side="right"
            >
                {/* Grid Container */}
                <div className="grid grid-cols-12 h-[calc(100vh-2rem)]">
                    {/* LEFT PANEL: Configuration (40%) */}
                    <div className="col-span-12 md:col-span-5 flex flex-col h-full bg-white border-r border-slate-100 overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-8 py-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-pink-50 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-pink-600" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-semibold text-gray-900">
                                        {templateToEdit ? "Editar Plantilla" : "Nueva Plantilla"}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Configura las preguntas del briefing
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="p-8 pb-20 space-y-6">
                            {/* Name & Description */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Nombre de la Plantilla</Label>
                                    <Input
                                        value={template.name}
                                        onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej. Briefing SEO"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Descripción</Label>
                                    <Textarea
                                        value={template.description}
                                        onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Explica para qué sirve esta plantilla..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Fields List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-semibold">Preguntas ({template.structure.length})</Label>
                                    <Button onClick={addField} size="sm" variant="outline" className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Agregar
                                    </Button>
                                </div>

                                {template.structure.length === 0 ? (
                                    <Card className="p-8 text-center border-dashed">
                                        <p className="text-sm text-muted-foreground">
                                            No hay preguntas. Haz clic en "Agregar" para empezar.
                                        </p>
                                    </Card>
                                ) : (
                                    <div className="space-y-3">
                                        {template.structure.map((field, index) => (
                                            <FieldEditor
                                                key={field.id}
                                                field={field}
                                                index={index}
                                                onUpdate={(updates) => updateField(index, updates)}
                                                onDelete={() => deleteField(index)}
                                                onMoveUp={() => moveField(index, 'up')}
                                                onMoveDown={() => moveField(index, 'down')}
                                                canMoveUp={index > 0}
                                                canMoveDown={index < template.structure.length - 1}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-8 py-4 flex items-center justify-between mt-auto">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-8"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {templateToEdit ? "Guardar Cambios" : "Crear Plantilla"}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Live Preview (60%) */}
                    <div className="hidden md:flex col-span-7 flex-col h-full bg-slate-50/50 p-10 overflow-y-auto items-center justify-start">
                        <div className="sticky top-0 mb-6 w-full max-w-2xl">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Vista Previa (Cliente)
                            </p>
                        </div>

                        {/* Paper Effect Container */}
                        <div className="w-full max-w-2xl bg-white shadow-sm border border-slate-200 rounded-xl p-8 min-h-[500px]">
                            <LivePreview template={template} />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

// Field Editor Component
function FieldEditor({
    field,
    index,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown
}: {
    field: BriefingField
    index: number
    onUpdate: (updates: Partial<BriefingField>) => void
    onDelete: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    canMoveUp: boolean
    canMoveDown: boolean
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [newOption, setNewOption] = useState("")

    const handleAddOption = () => {
        if (!newOption.trim()) return
        const currentOptions = field.options || []
        onUpdate({ options: [...currentOptions, newOption.trim()] })
        setNewOption("")
    }

    const handleRemoveOption = (optionIndex: number) => {
        const currentOptions = field.options || []
        onUpdate({ options: currentOptions.filter((_, i) => i !== optionIndex) })
    }

    return (
        <Card className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
                {/* Move buttons */}
                <div className="flex flex-col gap-1 shrink-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onMoveUp}
                        disabled={!canMoveUp}
                        className="h-6 w-6"
                    >
                        <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onMoveDown}
                        disabled={!canMoveDown}
                        className="h-6 w-6"
                    >
                        <ArrowDown className="h-3 w-3" />
                    </Button>
                </div>

                <div className="flex-1 space-y-3">
                    {/* Question Label */}
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs shrink-0">
                            {index + 1}
                        </Badge>
                        <Input
                            value={field.label}
                            onChange={(e) => onUpdate({ label: e.target.value })}
                            placeholder="Escribe la pregunta aquí..."
                            className="flex-1 h-9 font-medium"
                        />
                    </div>

                    {/* Expanded Options */}
                    {isExpanded && (
                        <div className="space-y-4 pl-1 pt-2 border-l-2 border-pink-100">
                            {/* Type Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-600">Tipo de Campo</Label>
                                <Select
                                    value={field.type}
                                    onValueChange={(value) => onUpdate({ type: value as BriefingFieldType })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">📝 Texto Corto</SelectItem>
                                        <SelectItem value="textarea">📄 Texto Largo (Párrafo)</SelectItem>
                                        <SelectItem value="select">🎯 Selección (Opciones)</SelectItem>
                                        <SelectItem value="multiselect">☑️ Selección Múltiple</SelectItem>
                                        <SelectItem value="upload">📎 Subir Archivo</SelectItem>
                                        <SelectItem value="color">🎨 Selector de Color</SelectItem>
                                        <SelectItem value="typography">✍️ Selector de Tipografía</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Options Management (for select/multiselect) */}
                            {(field.type === 'select' || field.type === 'multiselect') && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-600">Opciones de Selección</Label>

                                    {/* Existing Options */}
                                    <div className="space-y-2">
                                        {field.options && field.options.length > 0 ? (
                                            field.options.map((option, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e) => {
                                                            const newOptions = [...(field.options || [])]
                                                            newOptions[optIndex] = e.target.value
                                                            onUpdate({ options: newOptions })
                                                        }}
                                                        className="h-8 text-sm"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveOption(optIndex)}
                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                                No hay opciones. Agrega al menos una.
                                            </p>
                                        )}
                                    </div>

                                    {/* Add New Option */}
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                                            placeholder="Nueva opción..."
                                            className="h-8 text-sm"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleAddOption}
                                            disabled={!newOption.trim()}
                                            className="h-8 shrink-0"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Agregar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Placeholder */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-600">Texto de Ayuda (Placeholder)</Label>
                                <Input
                                    value={field.placeholder || ''}
                                    onChange={(e) => onUpdate({ placeholder: e.target.value })}
                                    placeholder="Ej: Escribe tu respuesta aquí..."
                                    className="h-9 text-sm"
                                />
                            </div>

                            {/* Help Text */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-gray-600">Texto de Ayuda (Descripción)</Label>
                                <Textarea
                                    value={field.help_text || ''}
                                    onChange={(e) => onUpdate({ help_text: e.target.value })}
                                    placeholder="Instrucciones adicionales para el cliente..."
                                    className="text-sm"
                                    rows={2}
                                />
                            </div>

                            {/* Required Toggle */}
                            <div className="flex items-center gap-2 pt-2">
                                <Switch
                                    checked={field.required}
                                    onCheckedChange={(checked) => onUpdate({ required: checked })}
                                />
                                <Label className="text-sm font-medium">Campo obligatorio</Label>
                            </div>
                        </div>
                    )}

                    {/* Toggle Button */}
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs h-7"
                        >
                            {isExpanded ? '▲ Menos opciones' : '▼ Más opciones'}
                        </Button>
                        {!isExpanded && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                    {field.type === 'text' ? '📝' :
                                        field.type === 'textarea' ? '📄' :
                                            field.type === 'select' ? '🎯' :
                                                field.type === 'upload' ? '📎' : '❓'}
                                    {field.type}
                                </Badge>
                                {field.required && <Badge variant="destructive" className="text-xs">Obligatorio</Badge>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Button */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onDelete}
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </Card>
    )
}

// Live Preview Component
function LivePreview({ template }: { template: { name: string; description: string; structure: BriefingField[] } }) {
    if (!template.name) {
        return (
            <Card className="p-12 text-center border-dashed">
                <p className="text-muted-foreground">La vista previa aparecerá aquí...</p>
            </Card>
        )
    }

    return (
        <Card className="p-8 shadow-lg">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{template.name}</h2>
                {template.description && (
                    <p className="text-gray-600">{template.description}</p>
                )}
            </div>

            <div className="space-y-6">
                {template.structure.map((field) => (
                    <div key={field.id} className="space-y-2">
                        <Label className="text-base">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {field.type === 'text' && (
                            <Input placeholder="Escribe aquí..." />
                        )}

                        {field.type === 'textarea' && (
                            <Textarea placeholder="Escribe tu respuesta..." rows={4} />
                        )}

                        {field.type === 'select' && field.options && (
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una opción..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options.map((option, i) => (
                                        <SelectItem key={i} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {field.type === 'upload' && (
                            <Input type="file" />
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-6 border-t">
                <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white" disabled>
                    Enviar Respuestas
                </Button>
            </div>
        </Card>
    )
}
