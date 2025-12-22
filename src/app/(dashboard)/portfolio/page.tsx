"use client"

/**
 * NOMENCLATURA: Este módulo muestra "Catálogo" en la UI.
 * Backend usa tabla 'service_catalog' (NO cambiar nombres técnicos).
 * "Catálogo" = Plantillas/oferta de servicios que la agencia ofrece.
 * Ver: /NOMENCLATURE.md para más info.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { PortfolioList } from "@/components/modules/portfolio/portfolio-list"
import { PortfolioFormModal } from "@/components/modules/portfolio/portfolio-form-modal"
import { getPortfolioItems, deletePortfolioItem, syncAllBriefingTemplates } from "@/lib/actions/portfolio"
import { ServiceCatalogItem } from "@/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"

export default function PortfolioPage() {
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<ServiceCatalogItem | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const result = await syncAllBriefingTemplates()
            if (result && result.count > 0) {
                toast.success(`${result.count} plantillas creadas correctamente`)
            } else {
                toast.info("Todas las plantillas ya están sincronizadas")
            }
        } catch (error) {
            toast.error("Error al sincronizar plantillas")
        } finally {
            setIsSyncing(false)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const data = await getPortfolioItems()
            setItems(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar el portafolio")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = () => {
        setItemToEdit(null)
        setIsFormOpen(true)
    }

    const handleEdit = (item: ServiceCatalogItem) => {
        setItemToEdit(item)
        setIsFormOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.")) return

        try {
            await deletePortfolioItem(id)
            toast.success("Servicio eliminado")
            fetchData()
        } catch (error) {
            toast.error("Error al eliminar el servicio")
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Catálogo</SplitText>
                    </h1>
                    <p className="text-muted-foreground mt-1">Servicios y plantillas de briefing que ofrece tu agencia.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSync} variant="outline" className="border-brand-pink/20 text-brand-pink hover:bg-brand-pink/5">
                        <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing ? "animate-spin" : "")} />
                        Sincronizar Plantillas
                    </Button>
                    <Button onClick={handleCreate} className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-brand-pink/20">
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <PortfolioList
                    items={items}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            <PortfolioFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                itemToEdit={itemToEdit}
                onSuccess={fetchData}
            />
        </div>
    )
}
