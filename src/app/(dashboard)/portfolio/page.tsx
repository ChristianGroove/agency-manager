"use client"

/**
 * NOMENCLATURA: Este módulo muestra "Catálogo" en la UI.
 * Backend usa tabla 'service_catalog' (NO cambiar nombres técnicos).
 * "Catálogo" = Plantillas/oferta de servicios que el negocio ofrece.
 * Ver: /NOMENCLATURE.md para más info.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CatalogList } from "@/modules/core/catalog/catalog-list"
import { CatalogServiceSheet } from "@/modules/core/catalog/catalog-service-sheet"
import { CategoryManager } from "@/modules/core/catalog/components/category-manager"
import { getCatalogItems, deleteCatalogItem } from "@/modules/core/catalog/actions"
import { getCategories, ServiceCategory } from "@/modules/core/catalog/categories-actions"
import { ServiceCatalogItem } from "@/types"
import { BriefingTemplate } from "@/types/briefings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"
import { CategorySelector } from "@/modules/core/catalog/category-selector"
import { TemplateImporter } from "@/modules/core/catalog/template-importer"


export default function PortfolioPage() {
    const [activeTab, setActiveTab] = useState<string>("services")

    // Services state
    const [items, setItems] = useState<ServiceCatalogItem[]>([])
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [itemToEdit, setItemToEdit] = useState<ServiceCatalogItem | null>(null)
    const [currentOrgName, setCurrentOrgName] = useState<string>('')

    // Filter & View State
    const [searchTerm, setSearchTerm] = useState("")
    const [activeCategory, setActiveCategory] = useState("all")
    const [activePaymentFilter, setActivePaymentFilter] = useState("all") // 'all' | 'recurring' | 'one_time'
    const [viewMode, setViewMode] = useState<ViewMode>('grid')

    /**
     * Fetch current organization name
     * Uses server action to avoid next/headers import in client component
     */
    const fetchOrgName = async () => {
        try {
            const { getCurrentOrgName } = await import('@/modules/core/organizations/actions')
            const name = await getCurrentOrgName()
            setCurrentOrgName(name || '')
        } catch (error) {
            console.error('Error fetching org:', error)
        }
    }

    /**
     * Fetch portfolio services for current organization
     */
    const fetchServices = async () => {
        setLoading(true)
        try {
            const [data, cats] = await Promise.all([
                getCatalogItems(),
                getCategories()
            ])
            setItems(data)
            setCategories(cats)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar el portafolio")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchOrgName()
        fetchServices()
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
            await deleteCatalogItem(id)
            toast.success("Servicio eliminado")
            fetchServices()
        } catch (error) {
            toast.error("Error al eliminar el servicio")
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Title Row with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Catálogo</SplitText>
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Servicios y productos que ofrece tu negocio.
                    </p>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <TemplateImporter onSuccess={fetchServices} />
                    <CategoryManager />
                    <Button
                        onClick={handleCreateService}
                        className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-brand-pink/20"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
                    </Button>
                </div>
            </div>

            {/* Filter & View Bar */}
            <div className="space-y-4 sticky top-4 z-30 bg-gray-50/95 backdrop-blur-sm py-2">
                <div className="flex flex-col md:flex-row gap-3">
                    <SearchFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Buscar por nombre..."
                        filters={[
                            { id: 'all', label: 'Todos', count: items.length, color: 'gray' },
                            { id: 'one_off', label: 'Pago Único', count: items.filter(i => i.type === 'one_off').length, color: 'orange' },
                            { id: 'recurring', label: 'Suscripción', count: items.filter(i => i.type === 'recurring').length, color: 'indigo' },
                        ]}
                        activeFilter={activePaymentFilter}
                        onFilterChange={setActivePaymentFilter}
                    />
                    <ViewToggle
                        view={viewMode}
                        onViewChange={setViewMode}
                    />
                </div>

                <div className="flex items-center">
                    <CategorySelector
                        categories={categories}
                        activeCategory={activeCategory}
                        onSelect={setActiveCategory}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="mt-0">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <CatalogList
                        items={items.filter(item => {
                            // 1. Search (Name only now, or maybe description)
                            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))

                            // 2. Category
                            const matchesCategory = activeCategory === 'all' ? true : item.category === activeCategory

                            // 3. Payment Type
                            const matchesPayment = activePaymentFilter === 'all' ? true : item.type === activePaymentFilter

                            return matchesSearch && matchesCategory && matchesPayment
                        })}
                        viewMode={viewMode}
                        onEdit={handleEditService}
                        onDelete={handleDeleteService}
                    />
                )}
            </div>

            {/* Sheets */}
            <CatalogServiceSheet
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                itemToEdit={itemToEdit}
                onSuccess={fetchServices}
            />
        </div>
    )
}
