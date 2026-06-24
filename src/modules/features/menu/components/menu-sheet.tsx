"use client"

import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Server, Flame, Leaf, WheatOff, Upload, BadgePercent, Image as ImageIcon, Calendar } from "lucide-react"
import { toast } from "sonner"
import { RestoMenuItem, RestoMenuCategory, RestoMenuModifierGroup } from "@/types"
import { createMenuItem, updateMenuItem, getMenuCategories } from "../actions"
import { getModifierGroups, getItemModifiers, updateItemModifiers } from "../modifiers-actions"
import { ItemModifierLinker } from "./item-modifier-linker"
import { optimizeImage, blobToFile } from "@/modules/infrastructure/utils/image-optimization"
import { uploadCatalogImage } from "@/modules/features/catalog/image-actions"

const WEEKDAYS = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' }
]

interface MenuSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemToEdit?: RestoMenuItem | null
    onSuccess?: () => void
}

export function MenuSheet({ open, onOpenChange, itemToEdit, onSuccess }: MenuSheetProps) {
    const [loading, setLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [categories, setCategories] = useState<RestoMenuCategory[]>([])
    const [modifierGroups, setModifierGroups] = useState<RestoMenuModifierGroup[]>([])
    const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([])
    
    const [formData, setFormData] = useState<Partial<RestoMenuItem>>({
        name: "",
        description: "",
        category_id: "",
        type: "food",
        base_price: 0,
        is_available: true,
        is_visible: true,
        image_url: "",
        metadata: {
            is_vegan: false,
            is_vegetarian: false,
            is_gluten_free: false,
            is_spicy: false,
            spicy_level: 0,
            ingredients: [],
            allergens: []
        }
    })

    useEffect(() => {
        if (open) {
            getMenuCategories().then(setCategories).catch(console.error)
            getModifierGroups().then(setModifierGroups).catch(console.error)
        }
    }, [open])

    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                ...itemToEdit,
                metadata: {
                    is_vegan: false,
                    is_vegetarian: false,
                    is_gluten_free: false,
                    is_spicy: false,
                    spicy_level: 0,
                    ingredients: [],
                    allergens: [],
                    ...itemToEdit.metadata
                }
            })
            getItemModifiers(itemToEdit.id).then(setSelectedModifierIds).catch(console.error)
        } else {
            setFormData({
                name: "",
                description: "",
                category_id: "",
                type: "food",
                base_price: 0,
                is_available: true,
                is_visible: true,
                image_url: "",
                metadata: {
                    is_vegan: false,
                    is_vegetarian: false,
                    is_gluten_free: false,
                    is_spicy: false,
                    spicy_level: 0,
                    ingredients: [],
                    allergens: []
                }
            })
            setSelectedModifierIds([])
        }
    }, [itemToEdit, open])

    const handleSubmit = async () => {
        if (!formData.name || !formData.category_id) {
            toast.error("El nombre y la categoría son obligatorios")
            return
        }

        setLoading(true)
        try {
            if (itemToEdit) {
                await updateMenuItem(itemToEdit.id, formData)
                await updateItemModifiers(itemToEdit.id, selectedModifierIds)
                toast.success("Plato actualizado")
            } else {
                const res = await createMenuItem(formData)
                if (res?.id) {
                    await updateItemModifiers(res.id, selectedModifierIds)
                }
                toast.success("Plato creado exitosamente")
            }
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error al guardar el plato")
        } finally {
            setLoading(false)
        }
    }

    const updateMetadata = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [key]: value
            }
        }))
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // Client-side Optimization
            const optimizedBlob = await optimizeImage(file, {
                maxWidth: 1200,
                quality: 0.8,
                format: 'image/webp'
            })

            const optimizedFile = blobToFile(optimizedBlob, file.name)
            const uploadFormData = new FormData()
            uploadFormData.append("file", optimizedFile)

            const result = await uploadCatalogImage(uploadFormData)

            if (result.success && result.url) {
                setFormData(prev => ({ ...prev, image_url: result.url }))
                toast.success("Imagen optimizada y subida exitosamente")
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || "Error al subir la imagen")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent flex flex-col
                "
                side="right"
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-5 sticky top-0 z-20 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-xl">
                                <Server className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900">
                                    {itemToEdit ? "Editar Item" : "Nuevo Item de Menú"}
                                </SheetTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Agrega platos o bebidas a tu menú digital
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {/* Disponibilidad Rapida (Top level) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <Label className="text-sm font-bold text-gray-900">Disponible (Stock)</Label>
                            <p className="text-xs text-gray-500">Apágalo si se agota en cocina</p>
                        </div>
                        <Switch 
                            checked={formData.is_available}
                            onCheckedChange={(c) => setFormData({...formData, is_available: c})}
                        />
                    </div>

                    <ItemModifierLinker 
                        availableGroups={modifierGroups}
                        selectedGroupIds={selectedModifierIds}
                        onChange={setSelectedModifierIds}
                    />

                    <div className="space-y-4 bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Nombre del Plato/Bebida *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Hamburguesa Doble"
                                className="font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Categoría *</Label>
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Tipo *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="food">Comida</SelectItem>
                                        <SelectItem value="beverage">Bebida</SelectItem>
                                        <SelectItem value="combo">Combo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-gray-400">Precio Base *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.base_price}
                                        onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                        className="pl-7 font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                                    <BadgePercent className="w-3 h-3 text-brand-pink" /> Promo (Opcional)
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.metadata?.promotional_price || ""}
                                        onChange={(e) => updateMetadata('promotional_price', e.target.value ? Number(e.target.value) : undefined)}
                                        className="pl-7"
                                        placeholder="Ej. 15000"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400">Descripción</Label>
                            <Textarea
                                value={formData.description || ""}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe los ingredientes principales..."
                                rows={2}
                                className="resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-gray-400 flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-gray-400" /> Imagen del Plato
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    value={formData.image_url || ""}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="https://... o sube un archivo"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="shrink-0"
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Insignias Gastronómicas */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Insignias del Menú</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${formData.metadata?.is_spicy ? 'bg-red-50 border-red-200 text-red-700' : 'hover:bg-slate-50 border-slate-100 text-slate-600'}`} onClick={() => updateMetadata('is_spicy', !formData.metadata?.is_spicy)}>
                                <Flame className="w-4 h-4" />
                                <span className="text-xs font-bold">Picante</span>
                            </div>
                            <div className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${formData.metadata?.is_vegan ? 'bg-green-50 border-green-200 text-green-700' : 'hover:bg-slate-50 border-slate-100 text-slate-600'}`} onClick={() => updateMetadata('is_vegan', !formData.metadata?.is_vegan)}>
                                <Leaf className="w-4 h-4" />
                                <span className="text-xs font-bold">Vegano</span>
                            </div>
                            <div className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${formData.metadata?.is_gluten_free ? 'bg-amber-50 border-amber-200 text-amber-700' : 'hover:bg-slate-50 border-slate-100 text-slate-600'}`} onClick={() => updateMetadata('is_gluten_free', !formData.metadata?.is_gluten_free)}>
                                <WheatOff className="w-4 h-4" />
                                <span className="text-xs font-bold">Sin Gluten</span>
                            </div>
                        </div>

                        {formData.type === 'beverage' && (
                            <div className="pt-2">
                                <Label className="text-xs font-bold text-gray-500">% Alcohol (ABV)</Label>
                                <Input 
                                    type="number" 
                                    className="h-8 w-24 mt-1" 
                                    placeholder="Ej: 5.5"
                                    value={formData.metadata?.alcohol_abv || ""}
                                    onChange={(e) => updateMetadata('alcohol_abv', Number(e.target.value))}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Disponibilidad por Días */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> Días Disponibles
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">Desmarca días para hacer el producto exclusivo (ej. Solo Fines de Semana).</p>
                        
                        <div className="flex justify-between gap-1">
                            {WEEKDAYS.map(day => {
                                const isSelected = formData.metadata?.available_days ? formData.metadata.available_days.includes(day.value) : true;
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => {
                                            const currentDays = formData.metadata?.available_days || [0,1,2,3,4,5,6];
                                            let newDays;
                                            if (isSelected) {
                                                newDays = currentDays.filter(d => d !== day.value);
                                            } else {
                                                newDays = [...currentDays, day.value].sort();
                                            }
                                            // Limpiar a undefined si seleccionó los 7 días
                                            if (newDays.length === 7) newDays = undefined;
                                            updateMetadata('available_days', newDays);
                                        }}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                            isSelected 
                                            ? 'bg-orange-100 text-orange-700 border-2 border-orange-200' 
                                            : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                )
                            })}
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
                        className="bg-orange-600 hover:bg-orange-700 text-white px-8 uppercase font-bold text-xs"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {itemToEdit ? "Guardar Cambios" : "Crear Plato"}
                    </Button>
                </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
