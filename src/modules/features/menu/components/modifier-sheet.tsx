"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Settings2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { RestoMenuModifierGroup, RestoMenuModifierOption } from "@/types"
import { createModifierGroup, updateModifierGroup } from "../modifiers-actions"

interface ModifierSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemToEdit?: RestoMenuModifierGroup | null
    onSuccess?: () => void
}

export function ModifierSheet({ open, onOpenChange, itemToEdit, onSuccess }: ModifierSheetProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<RestoMenuModifierGroup>>({
        name: "",
        required: false,
        min_selections: 0,
        max_selections: 1,
        options: []
    })

    useEffect(() => {
        if (open) {
            if (itemToEdit) {
                setFormData(itemToEdit)
            } else {
                setFormData({
                    name: "",
                    required: false,
                    min_selections: 0,
                    max_selections: 1,
                    options: []
                })
            }
        }
    }, [open, itemToEdit])

    const handleAddOption = () => {
        const newOption: RestoMenuModifierOption = {
            id: crypto.randomUUID(),
            name: "",
            price_modifier: 0,
            is_active: true
        }
        setFormData(prev => ({
            ...prev,
            options: [...(prev.options || []), newOption]
        }))
    }

    const handleUpdateOption = (index: number, field: keyof RestoMenuModifierOption, value: any) => {
        setFormData(prev => {
            const newOpts = [...(prev.options || [])]
            newOpts[index] = { ...newOpts[index], [field]: value }
            return { ...prev, options: newOpts }
        })
    }

    const handleRemoveOption = (index: number) => {
        setFormData(prev => {
            const newOpts = [...(prev.options || [])]
            newOpts.splice(index, 1)
            return { ...prev, options: newOpts }
        })
    }

    const handleSubmit = async () => {
        if (!formData.name?.trim()) return toast.error("El nombre del grupo es requerido")
        if (!formData.options || formData.options.length === 0) return toast.error("Agrega al menos una opción")
        
        // Validate options
        for (const opt of formData.options) {
            if (!opt.name?.trim()) return toast.error("Todas las opciones deben tener un nombre")
        }

        setLoading(true)
        try {
            if (itemToEdit?.id) {
                await updateModifierGroup(itemToEdit.id, formData)
                toast.success("Modificador actualizado")
            } else {
                await createModifierGroup(formData)
                toast.success("Modificador creado")
            }
            onSuccess?.()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message || "Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[500px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent flex flex-col
                "
                side="right"
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-5 sticky top-0 z-20 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Settings2 className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900">
                                    {itemToEdit ? "Editar Modificador" : "Nuevo Modificador"}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Ej: Término de carne, Tamaños, Extras
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                        <div className="space-y-4 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Nombre del Grupo *</Label>
                                <Input
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Elige el tamaño"
                                    className="font-medium"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <Label className="text-sm font-bold text-gray-900">¿Es Obligatorio?</Label>
                                    <p className="text-xs text-gray-500">El cliente debe elegir para continuar</p>
                                </div>
                                <Switch 
                                    checked={formData.required}
                                    onCheckedChange={(c) => setFormData({...formData, required: c})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Mínimo</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.min_selections}
                                        onChange={(e) => setFormData({ ...formData, min_selections: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">Máximo</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.max_selections}
                                        onChange={(e) => setFormData({ ...formData, max_selections: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Opciones */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Opciones de Selección</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="h-7 text-xs text-primary bg-primary/10 hover:bg-primary/20">
                                    <Plus className="w-3 h-3 mr-1" /> Añadir Opción
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {formData.options?.map((opt, i) => (
                                    <div key={opt.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="flex-1">
                                            <Input 
                                                placeholder="Ej. Pequeño, Salsa Extra" 
                                                className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-2"
                                                value={opt.name}
                                                onChange={(e) => handleUpdateOption(i, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24 relative">
                                            <span className="absolute left-2 top-2 text-xs text-gray-400">+$</span>
                                            <Input 
                                                type="number"
                                                className="h-8 text-sm pl-6"
                                                value={opt.price_modifier}
                                                onChange={(e) => handleUpdateOption(i, 'price_modifier', Number(e.target.value))}
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => handleRemoveOption(i)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!formData.options || formData.options.length === 0) && (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                                        <p className="text-xs text-gray-400">No hay opciones. Añade al menos una.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border-t border-gray-100 p-5 flex items-center justify-between sticky bottom-0 shrink-0">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="text-xs uppercase font-bold text-gray-400">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-white px-8 uppercase font-bold text-xs"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {itemToEdit ? "Guardar" : "Crear Grupo"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
