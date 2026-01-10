"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TagsList } from "./tags-list"
import { TagForm } from "./tag-form"
import { getTags, createTag, updateTag, deleteTag, type Tag } from "../../tags-actions"
import { toast } from "sonner"

interface TagsManagerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TagsManagerSheet({ open, onOpenChange }: TagsManagerSheetProps) {
    const [tags, setTags] = useState<Tag[]>([])
    const [view, setView] = useState<'list' | 'form'>('list')
    const [editingTag, setEditingTag] = useState<Tag | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (open) {
            loadTags()
            setView('list')
            setEditingTag(null)
        }
    }, [open])

    const loadTags = async () => {
        setIsLoading(true)
        const data = await getTags()
        setTags(data)
        setIsLoading(false)
    }

    const handleSave = async (name: string, color: string) => {
        setIsLoading(true)
        try {
            if (editingTag) {
                const res = await updateTag(editingTag.id, { name, color })
                if (!res.success) throw new Error(res.error)
                toast.success("Etiqueta actualizada")
            } else {
                const res = await createTag(name, color)
                if (!res.success) throw new Error(res.error)
                toast.success("Etiqueta creada")
            }
            await loadTags()
            setView('list')
            setEditingTag(null)
        } catch (error: any) {
            toast.error(error.message || "Error al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta etiqueta?")) return

        setIsLoading(true)
        try {
            const res = await deleteTag(id)
            if (!res.success) throw new Error(res.error)
            toast.success("Etiqueta eliminada")
            await loadTags()
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[450px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-800/80 border-b border-gray-100 dark:border-white/5 flex-shrink-0 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">
                                    {view === 'list' ? 'Gestión de Etiquetas' : (editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta')}
                                </SheetTitle>
                                <SheetDescription>
                                    {view === 'list' ? 'Organiza tus leads y procesos.' : 'Define el nombre y color.'}
                                </SheetDescription>
                            </div>
                            {view === 'list' && (
                                <Button size="sm" onClick={() => { setEditingTag(null); setView('form') }}>
                                    <Plus className="mr-2 h-4 w-4" /> Crear
                                </Button>
                            )}
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        {view === 'list' ? (
                            <TagsList
                                tags={tags}
                                onEdit={(tag) => { setEditingTag(tag); setView('form') }}
                                onDelete={handleDelete}
                                isLoading={isLoading}
                            />
                        ) : (
                            <TagForm
                                initialData={editingTag}
                                onSave={handleSave}
                                onCancel={() => setView('list')}
                                isLoading={isLoading}
                            />
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
