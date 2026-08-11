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
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                            <Settings2 className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {itemToEdit ? "Editar Modificador" : "Nuevo Modificador"}
                            </SheetTitle>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                Ej: Término de carne, Tamaños, Extras
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin">
                        <div className="space-y-4 bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-400 dark:text-gray-400">Nombre del Grupo *</Label>
                                <Input
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Elige el tamaño"
                                    className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white font-medium"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    <Label className="text-sm font-bold text-gray-900 dark:text-white">¿Es Obligatorio?</Label>
                                    <p className="text-xs text-slate-500 dark:text-gray-400">El cliente debe elegir para continuar</p>
                                </div>
                                <Switch 
                                    checked={formData.required}
                                    onCheckedChange={(c) => setFormData({...formData, required: c})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-white/5">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-400 dark:text-gray-400">Mínimo</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.min_selections}
                                        onChange={(e) => setFormData({ ...formData, min_selections: Number(e.target.value) })}
                                        className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-400 dark:text-gray-400">Máximo</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.max_selections}
                                        onChange={(e) => setFormData({ ...formData, max_selections: Number(e.target.value) })}
                                        className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Opciones */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-gray-400">Opciones de Selección</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="h-8 text-xs text-brand-pink bg-brand-pink/10 hover:bg-brand-pink/20 rounded-xl px-3 font-semibold">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Opción
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {formData.options?.map((opt, i) => (
                                    <div key={opt.id} className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
                                        <div className="flex-1">
                                            <Input 
                                                placeholder="Ej. Pequeño, Salsa Extra" 
                                                className="h-9 text-sm border-none shadow-none focus-visible:ring-0 px-2 bg-transparent dark:text-white"
                                                value={opt.name}
                                                onChange={(e) => handleUpdateOption(i, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24 relative">
                                            <span className="absolute left-2 top-2 text-xs text-slate-400">+$</span>
                                            <Input 
                                                type="number"
                                                className="h-9 text-sm pl-6 bg-gray-50 dark:bg-black/20 border-slate-200 dark:border-white/10 rounded-lg dark:text-white"
                                                value={opt.price_modifier}
                                                onChange={(e) => handleUpdateOption(i, 'price_modifier', Number(e.target.value))}
                                            />
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" onClick={() => handleRemoveOption(i)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {(!formData.options || formData.options.length === 0) && (
                                    <div className="text-center py-6 border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40">
                                        <p className="text-xs text-slate-400 dark:text-gray-400">No hay opciones. Añade al menos una.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                        <Button variant="ghost" className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 font-semibold text-xs rounded-xl h-10 px-6 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
