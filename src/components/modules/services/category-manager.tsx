"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ServiceCategory, getCategories, deleteCategory } from "@/app/actions/category-actions"
import { CategoryFormSheet } from "./category-form-sheet"
import * as LucideIcons from "lucide-react"

export function CategoryManager() {
    const [open, setOpen] = useState(false)
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
    const [formOpen, setFormOpen] = useState(false)

    const loadCategories = async () => {
        setLoading(true)
        try {
            const cats = await getCategories()
            setCategories(cats)
        } catch (error) {
            console.error('Error loading categories:', error)
            toast.error('Error al cargar categorías')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            loadCategories()
        }
    }, [open])

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la categoría "${name}"?\n\nEsto solo es posible si no tiene servicios asignados.`)) {
            return
        }

        try {
            await deleteCategory(id)
            toast.success('Categoría eliminada')
            loadCategories()
        } catch (error: any) {
            toast.error(error.message || 'Error al eliminar categoría')
        }
    }

    const handleEdit = (category: ServiceCategory) => {
        setEditingCategory(category)
        setFormOpen(true)
    }

    const handleCreateNew = () => {
        setEditingCategory(null)
        setFormOpen(true)
    }

    const handleFormSuccess = () => {
        setFormOpen(false)
        setEditingCategory(null)
        loadCategories()
    }

    const getIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder
        return IconComponent
    }

    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { text: string, bg: string }> = {
            blue: { text: 'text-blue-500', bg: 'bg-blue-50' },
            purple: { text: 'text-purple-500', bg: 'bg-purple-50' },
            pink: { text: 'text-pink-500', bg: 'bg-pink-50' },
            indigo: { text: 'text-indigo-500', bg: 'bg-indigo-50' },
            green: { text: 'text-green-500', bg: 'bg-green-50' },
            orange: { text: 'text-orange-500', bg: 'bg-orange-50' },
            cyan: { text: 'text-cyan-500', bg: 'bg-cyan-50' },
            amber: { text: 'text-amber-500', bg: 'bg-amber-50' },
            gray: { text: 'text-gray-500', bg: 'bg-gray-50' },
            red: { text: 'text-red-500', bg: 'bg-red-50' },
        }
        return colorMap[color] || colorMap.gray
    }

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Gestionar Categorías
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Categorías de Servicios</SheetTitle>
                        <SheetDescription>
                            Organiza tu catálogo con categorías personalizadas
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-4">
                        <Button
                            onClick={handleCreateNew}
                            className="w-full"
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva Categoría
                        </Button>

                        <ScrollArea className="h-[calc(100vh-240px)]">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-sm text-muted-foreground">Cargando...</div>
                                </div>
                            ) : categories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                    <LucideIcons.FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        No tienes categorías todavía
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Crea tu primera categoría para organizar tus servicios
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {categories.map((category) => {
                                        const IconComponent = getIcon(category.icon)
                                        const colors = getColorClasses(category.color)

                                        return (
                                            <div
                                                key={category.id}
                                                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                                            >
                                                <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                </div>

                                                <div className={`p-2 rounded-md ${colors.bg}`}>
                                                    <IconComponent className={`h-4 w-4 ${colors.text}`} />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm truncate">
                                                        {category.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {category.icon}
                                                    </div>
                                                </div>

                                                <Badge variant="outline" className="text-xs">
                                                    {category.color}
                                                </Badge>

                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(category)}
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(category.id, category.name)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>

            <CategoryFormSheet
                open={formOpen}
                onOpenChange={setFormOpen}
                category={editingCategory}
                onSuccess={handleFormSuccess}
            />
        </>
    )
}
