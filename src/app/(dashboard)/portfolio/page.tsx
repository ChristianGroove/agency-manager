"use client"

/**
 * NOMENCLATURA: Este módulo muestra "Catálogo" en la UI.
 * Backend usa tabla 'service_catalog' (NO cambiar nombres técnicos).
 * "Catálogo" = Plantillas/oferta de servicios que el negocio ofrece.
 * Ver: /NOMENCLATURE.md para más info.
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Package } from "lucide-react"
import { PortfolioList } from "@/modules/verticals/agency/portfolio/portfolio-list"
import { PortfolioServiceSheet } from "@/modules/verticals/agency/portfolio/portfolio-service-sheet"
import { CategoryManager } from "@/modules/verticals/agency/services/category-manager"
import { getPortfolioItems, deletePortfolioItem } from "@/modules/verticals/agency/portfolio/actions"
import { getCategories, ServiceCategory } from "@/modules/verticals/agency/categories/actions"
import { ServiceCatalogItem } from "@/types"
import { BriefingTemplate } from "@/types/briefings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SplitText } from "@/components/ui/split-text"
import { SearchFilterBar, FilterOption } from "@/components/shared/search-filter-bar"
import { ViewToggle, ViewMode } from "@/components/shared/view-toggle"
import { CategorySelector } from "@/modules/verticals/agency/portfolio/category-selector"
import { getSaaSProducts, seedSystemModules } from "@/modules/core/saas/actions"
import { SaaSProduct } from "@/types/saas"
import { AppList } from "@/modules/core/saas/app-list"
import { CreateAppSheet } from "@/modules/core/saas/create-app-sheet"

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



    // SaaS Apps state
    const [apps, setApps] = useState<SaaSProduct[]>([])
    const [appsLoading, setAppsLoading] = useState(true)
    const [isAppSheetOpen, setIsAppSheetOpen] = useState(false)

    // Check if current org is Pixy Agency (SaaS Builder)
    const isPixyAgency = currentOrgName === 'Pixy Agency'

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
                getPortfolioItems(),
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


    /**
     * Fetch SaaS apps assigned to organization via subscription
     * Single Subscription Model: Each org has ONE subscription_product_id
     */
    const fetchApps = async () => {
        setAppsLoading(true)
        try {
            // Use server action to get subscription app
            const { getSubscriptionApp } = await import('@/modules/verticals/agency/portfolio/actions')
            const product = await getSubscriptionApp()
            setApps(product ? [product] : [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar Apps SaaS")
            setApps([])
        } finally {
            setAppsLoading(false)
        }
    }

    useEffect(() => {
        fetchOrgName()
        fetchServices()
        if (isPixyAgency) {
            fetchApps() // Only fetch apps if Pixy Agency
        }
    }, [isPixyAgency])

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

                {/* Right: Actions (moved from below) */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {activeTab === "services" && (
                        <>
                            <CategoryManager />
                            <Button
                                onClick={handleCreateService}
                                className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-brand-pink/20"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Servicio
                            </Button>
                        </>
                    )}
                    {activeTab === "apps" && isPixyAgency && (
                        <Button
                            onClick={() => setIsAppSheetOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Nueva App
                        </Button>
                    )}
                </div>
            </div>

            {/* Control Row: Tabs ONLY */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                {/* Left: Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 w-full">
                    <TabsList className={cn(
                        "grid w-full",
                        isPixyAgency ? "max-w-md grid-cols-2" : "max-w-xs grid-cols-1"
                    )}>
                        <TabsTrigger value="services">Servicios</TabsTrigger>
                        {isPixyAgency && (
                            <TabsTrigger value="apps">
                                <Package className="h-4 w-4 mr-2" />
                                Apps SaaS
                            </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
            </div>

            {/* Filter & View Bar (Only for Services Tab) */}
            {activeTab === "services" && (
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
            )}

            {/* Tabs Content - decoupled from TabsList to allow inserting FilterBar */}
            {activeTab === "services" && (
                <div className="mt-0">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <PortfolioList
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
            )}


            {activeTab === "apps" && (
                <div className="mt-0">
                    {appsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <AppList items={apps} onEdit={(app) => { }} />
                    )}
                </div>
            )}


            {/* Sheets */}
            <PortfolioServiceSheet
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                itemToEdit={itemToEdit}
                onSuccess={fetchServices}
            />

            <CreateAppSheet
                open={isAppSheetOpen}
                onOpenChange={setIsAppSheetOpen}
                onSuccess={fetchApps}
            />
        </div>
    )
}
