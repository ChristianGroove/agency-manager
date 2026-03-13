"use client"

import { useState, useEffect } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus, Trash2, Tag, Check, X, FileText } from "lucide-react"
import { 
    getClientCategories, 
    createClientCategory, 
    updateClientCategory,
    deleteClientCategory,
    ClientCategory 
} from "@/modules/core/clients/categories-actions"
import { toast } from "sonner"

interface CategoryManagementModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function CategoryManagementModal({ isOpen, onClose, onUpdate }: CategoryManagementModalProps) {
    const [categories, setCategories] = useState<ClientCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    
    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            loadCategories()
        }
    }, [isOpen])

    const loadCategories = async () => {
        setLoading(true)
        const res = await getClientCategories()
        if (res.success && res.data) {
            setCategories(res.data)
        }
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return
        setIsCreating(true)
        const res = await createClientCategory(newCategoryName.trim())
        if (res.success && res.data) {
            setCategories([...categories, res.data])
            setNewCategoryName("")
            toast.success("Categoría creada")
            if (onUpdate) onUpdate()
        } else {
            toast.error(res.error || "Error creando categoría")
        }
        setIsCreating(false)
    }

    const handleStartEdit = (cat: ClientCategory) => {
        setEditingId(cat.id)
        setEditingName(cat.name)
    }

    const handleSaveEdit = async (cat: ClientCategory) => {
        if (!editingName.trim() || editingName === cat.name) {
            setEditingId(null)
            return
        }
        setIsSaving(true)
        const res = await updateClientCategory(cat.id, editingName.trim(), cat.color)
        if (res.success && res.data) {
            setCategories(categories.map(c => c.id === cat.id ? res.data! : c))
            toast.success("Categoría actualizada")
            if (onUpdate) onUpdate()
        } else {
            toast.error(res.error || "Error actualizando categoría")
        }
        setEditingId(null)
        setIsSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta categoría? Los contactos asociados quedarán sin categoría.")) return
        setDeletingId(id)
        const res = await deleteClientCategory(id)
        if (res.success) {
            setCategories(categories.filter(c => c.id !== id))
            toast.success("Categoría eliminada")
            if (onUpdate) onUpdate()
        } else {
            toast.error("Error eliminando categoría")
        }
        setDeletingId(null)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                <div className="bg-white p-6 space-y-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-900">
                            <Tag className="h-5 v-5 text-indigo-600" />
                            Gestionar Categorías
                        </DialogTitle>
                        <DialogDescription className="text-sm text-gray-500">
                            Organiza tus contactos creando categorías personalizadas.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Create New row */}
                    <div className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-dashed border-slate-200">
                        <Input 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Nombre de la categoría..."
                            className="bg-white border-slate-200 focus-visible:ring-indigo-500 h-10 rounded-xl"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <Button 
                            onClick={handleCreate} 
                            disabled={isCreating || !newCategoryName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 h-10 px-4 rounded-xl shadow-sm text-xs"
                        >
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            Añadir
                        </Button>
                    </div>

                    {/* Categories List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-8">No hay categorías personalizadas todavía.</p>
                        ) : (
                            categories.map((cat) => (
                                <div 
                                    key={cat.id} 
                                    className="flex items-center justify-between p-2 pl-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors group"
                                >
                                    {editingId === cat.id ? (
                                        <div className="flex-1 flex items-center gap-2 mr-2">
                                            <Input 
                                                autoFocus
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="h-8 text-sm py-1 rounded-lg border-indigo-200 focus-visible:ring-indigo-500"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveEdit(cat)
                                                    if (e.key === 'Escape') setEditingId(null)
                                                }}
                                            />
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => handleSaveEdit(cat)}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className="h-7 w-7 text-gray-400 hover:bg-gray-100"
                                                onClick={() => setEditingId(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-3 h-3 rounded-full bg-${cat.color}-500 shadow-sm`} />
                                                <span className="font-medium text-slate-700 text-sm">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                    onClick={() => handleStartEdit(cat)}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={deletingId === cat.id}
                                                >
                                                    {deletingId === cat.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-slate-50 p-4 flex justify-end gap-2 border-t border-slate-100">
                    <Button variant="ghost" className="rounded-xl text-slate-500 hover:bg-slate-200" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
