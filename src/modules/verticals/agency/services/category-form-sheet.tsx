"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ServiceCategory, createCategory, updateCategory } from "@/modules/verticals/agency/categories/actions"
import * as LucideIcons from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CategoryFormSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: ServiceCategory | null
    onSuccess: () => void
}

const AVAILABLE_ICONS = [
    'Server', 'Palette', 'Monitor', 'Globe', 'TrendingUp',
    'MessageCircle', 'Briefcase', 'Lightbulb', 'Puzzle', 'Folder',
    'Package', 'Scissors', 'Coffee', 'Camera', 'Music',
    'Heart', 'Star', 'Shield', 'Award', 'Target'
]

const AVAILABLE_COLORS = [
    { name: 'blue', label: 'Azul' },
    { name: 'purple', label: 'Morado' },
    { name: 'pink', label: 'Rosa' },
    { name: 'indigo', label: 'Índigo' },
    { name: 'green', label: 'Verde' },
    { name: 'orange', label: 'Naranja' },
    { name: 'cyan', label: 'Cian' },
    { name: 'amber', label: 'Ámbar' },
    { name: 'red', label: 'Rojo' },
    { name: 'gray', label: 'Gris' },
]

export function CategoryFormSheet({ open, onOpenChange, category, onSuccess }: CategoryFormSheetProps) {
    const [name, setName] = useState('')
    const [icon, setIcon] = useState('Folder')
    const [color, setColor] = useState('blue')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (category) {
            setName(category.name)
            setIcon(category.icon)
            setColor(category.color)
        } else {
            setName('')
            setIcon('Folder')
            setColor('blue')
        }
    }, [category, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        setLoading(true)
        try {
            if (category) {
                await updateCategory(category.id, { name, icon, color })
                toast.success('Categoría actualizada')
            } else {
                await createCategory({ name, icon, color })
                toast.success('Categoría creada')
            }
            onSuccess()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar')
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder
        return IconComponent
    }

    const getColorClass = (colorName: string) => {
        const colorMap: Record<string, string> = {
            blue: 'bg-blue-500',
            purple: 'bg-purple-500',
            pink: 'bg-pink-500',
            indigo: 'bg-indigo-500',
            green: 'bg-green-500',
            orange: 'bg-orange-500',
            cyan: 'bg-cyan-500',
            amber: 'bg-amber-500',
            red: 'bg-red-500',
            gray: 'bg-gray-500',
        }
        return colorMap[colorName] || colorMap.blue
    }

    const SelectedIcon = getIcon(icon)

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>
                        {category ? 'Editar Categoría' : 'Nueva Categoría'}
                    </SheetTitle>
                    <SheetDescription>
                        Define el nombre, icono y color de tu categoría
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    {/* Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ej: Cortes de Cabello"
                            required
                        />
                    </div>

                    {/* Icon Selector */}
                    <div className="space-y-2">
                        <Label>Icono</Label>
                        <Select value={icon} onValueChange={setIcon}>
                            <SelectTrigger>
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        <SelectedIcon className="h-4 w-4" />
                                        <span>{icon}</span>
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <ScrollArea className="h-[200px]">
                                    {AVAILABLE_ICONS.map((iconName) => {
                                        const IconComp = getIcon(iconName)
                                        return (
                                            <SelectItem key={iconName} value={iconName}>
                                                <div className="flex items-center gap-2">
                                                    <IconComp className="h-4 w-4" />
                                                    <span>{iconName}</span>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </ScrollArea>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="grid grid-cols-5 gap-2">
                            {AVAILABLE_COLORS.map((col) => (
                                <button
                                    key={col.name}
                                    type="button"
                                    onClick={() => setColor(col.name)}
                                    className={`
                                        h-10 rounded-md transition-all
                                        ${getColorClass(col.name)}
                                        ${color === col.name ? 'ring-2 ring-offset-2 ring-ring scale-110' : 'opacity-70 hover:opacity-100'}
                                    `}
                                    title={col.label}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Color seleccionado: {AVAILABLE_COLORS.find(c => c.name === color)?.label}
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="p-4 border rounded-lg bg-muted/30">
                        <Label className="text-xs text-muted-foreground mb-2 block">Vista Previa</Label>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-md ${getColorClass(color).replace('bg-', 'bg-').replace('-500', '-100')}`}>
                                <SelectedIcon className={`h-6 w-6 ${getColorClass(color).replace('bg-', 'text-')}`} />
                            </div>
                            <div>
                                <div className="font-medium">{name || 'Nombre de la categoría'}</div>
                                <div className="text-xs text-muted-foreground">{icon} • {AVAILABLE_COLORS.find(c => c.name === color)?.label}</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : category ? 'Actualizar' : 'Crear'}
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    )
}
