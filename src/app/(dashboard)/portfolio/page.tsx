"use client"

/**
 * NOMENCLATURA: Este módulo muestra "Catálogo" en la UI.
 * Backend usa tabla 'service_catalog' (NO cambiar nombres técnicos).
 * "Catálogo" = Plantillas/oferta de servicios que la agencia ofrece.
 * Ver: /NOMENCLATURE.md para más info.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, RefreshCw, Sparkles } from "lucide-react"
import { PortfolioList } from "@/components/modules/portfolio/portfolio-list"
import { PortfolioServiceSheet } from "@/components/modules/portfolio/portfolio-service-sheet"
import { BriefingTemplatesList } from "@/components/modules/briefings/briefing-templates-list"
import { BriefingBuilderSheet } from "@/components/modules/briefings/briefing-builder-sheet"
import { getPortfolioItems, deletePortfolioItem, syncAllBriefingTemplates } from "@/lib/actions/portfolio"
import { getBriefingTemplates, deleteBriefingTemplate } from "@/lib/actions/briefings"
import { ServiceCatalogItem } from "@/types"
import { BriefingTemplate } from "@/types/briefings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"

export default function PortfolioPage() {
    const [activeTab, setActiveTab] = useState("services")

    // Services state
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<ServiceCatalogItem | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    // Briefing templates state
    const [templates, setTemplates] = useState<BriefingTemplate[]>([])
    const [templatesLoading, setTemplatesLoading] = useState(true)
    const [isBuilderOpen, setIsBuilderOpen] = useState(false)
    const [templateToEdit, setTemplateToEdit] = useState<BriefingTemplate | null>(null)

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

    const fetchServices = async () => {
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

    const fetchTemplates = async () => {
        setTemplatesLoading(true)
        try {
            const data = await getBriefingTemplates()
            setTemplates(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar plantillas")
        } finally {
            setTemplatesLoading(false)
        }
    }

    useEffect(() => {
        fetchServices()
        fetchTemplates()
    }, [])

    const handleCreateService = () => {
        setItemToEdit(null)
        setIsFormOpen(true)
    }

    const handleEditService = (item: ServiceCatalogItem) => {
        setItemToEdit(item)
        setIsFormOpen(true)
    }

    const handleDeleteService = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.")) return

        try {
            await deletePortfolioItem(id)
            toast.success("Servicio eliminado")
            fetchServices()
        } catch (error) {
            toast.error("Error al eliminar el servicio")
        }
    }

    const handleCreateTemplate = () => {
        setTemplateToEdit(null)
        setIsBuilderOpen(true)
    }

    const handleEditTemplate = (template: BriefingTemplate) => {
        setTemplateToEdit(template)
        setIsBuilderOpen(true)
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.")) return

        try {
            await deleteBriefingTemplate(id)
            toast.success("Plantilla eliminada")
            fetchTemplates()
        } catch (error: any) {
            toast.error(error.message || "Error al eliminar la plantilla")
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Title Row */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    <SplitText>Catálogo</SplitText>
                </h1>
                <p className="text-muted-foreground mt-1">
                    Servicios y plantillas de briefing que ofrece tu agencia.
                </p>
            </div>

            {/* Control Row: Tabs + Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Left: Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="services">Servicios</TabsTrigger>
                        <TabsTrigger value="briefings">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Plantillas de Briefing
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Right: Actions (conditional based on active tab) */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {activeTab === "services" ? (
                        <>
                            <Button
                                onClick={handleSync}
                                variant="outline"
                                className="border-brand-pink/20 text-brand-pink hover:bg-brand-pink/5"
                            >
                                <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing ? "animate-spin" : "")} />
                                <Sincronizar />
                            </Button>
                            <Button
                                onClick={handleCreateService}
                                className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-brand-pink/20"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleCreateTemplate}
                            className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
                        </Button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="services" className="mt-0">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <PortfolioList
                            items={items}
                            onEdit={handleEditService}
                            onDelete={handleDeleteService}
                        />
                    )}
                </TabsContent>

                <TabsContent value="briefings" className="mt-0">
                    {templatesLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <BriefingTemplatesList
                            templates={templates}
                            onEdit={handleEditTemplate}
                            onDelete={handleDeleteTemplate}
                        />
                    )}
                </TabsContent>
            </Tabs>

            <PortfolioServiceSheet
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                itemToEdit={itemToEdit}
                onSuccess={fetchServices}
            />

            <BriefingBuilderSheet
                open={isBuilderOpen}
                onOpenChange={setIsBuilderOpen}
                templateToEdit={templateToEdit}
                onSuccess={fetchTemplates}
            />
        </div>
    )
}

function Sincronizar() {
    return <span>Sincronizar</span>
}
