"use client"

import { useState, useEffect } from "react"
import { KnowledgeEntry, getKnowledgeBase, deleteKnowledgeEntry, upsertKnowledgeEntry } from "@/modules/core/knowledge/actions"
import { KnowledgeStats } from "@/modules/core/knowledge/components/knowledge-stats"
import { KnowledgeList } from "@/modules/core/knowledge/components/knowledge-list"
import { KnowledgeSheet } from "@/modules/core/knowledge/components/knowledge-sheet"
import { Button } from "@/components/ui/button"
import { Plus, BrainCircuit, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { SplitText } from "@/components/ui/split-text"

export default function KnowledgePage() {
    const [data, setData] = useState<KnowledgeEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<KnowledgeEntry | null>(null)

    const loadData = async () => {
        setIsLoading(true)
        try {
            const res = await getKnowledgeBase()
            if (res.data) {
                setData(res.data)
            } else {
                toast.error("Error cargando conocimiento")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteKnowledgeEntry(id)
            if (res.success) {
                toast.success("Entrada eliminada")
                loadData()
            } else {
                toast.error("No se pudo eliminar")
            }
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    const handleSave = async (entry: Partial<KnowledgeEntry>) => {
        try {
            const res = await upsertKnowledgeEntry(entry)
            if (res.success) {
                toast.success(entry.id ? "Actualizado correctamente" : "Creado correctamente")
                loadData()
            } else {
                toast.error(res.error || "Error al guardar")
                throw new Error(res.error)
            }
        } catch (error) {
            throw error
        }
    }

    const openCreate = () => {
        setEditingItem(null)
        setIsSheetOpen(true)
    }

    const openEdit = (item: KnowledgeEntry) => {
        setEditingItem(item)
        setIsSheetOpen(true)
    }

    return (
        <div className="flex flex-col h-full space-y-6 pt-6 px-10">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <BrainCircuit className="h-8 w-8 text-[var(--brand-pink)]" />
                        <SplitText>Base de Conocimiento</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Administra la información que tus agentes de IA utilizan para responder a los clientes.
                    </p>
                </div>
                <Button onClick={openCreate} className="bg-[var(--brand-pink)] hover:bg-[var(--brand-pink)]/90 text-white shadow-lg shadow-[var(--brand-pink)]/20">
                    <Plus className="mr-2 h-4 w-4" /> Agregar Entrada
                </Button>
            </div>

            {/* Stats Overview */}
            <KnowledgeStats data={data} />

            {/* Main Content */}
            <div className="flex-1 pb-10">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-pink)]" />
                    </div>
                ) : (
                    <KnowledgeList
                        data={data}
                        onDelete={handleDelete}
                        onEdit={openEdit}
                    />
                )}
            </div>

            <KnowledgeSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                initialData={editingItem}
                onSave={handleSave}
            />
        </div>
    )
}
