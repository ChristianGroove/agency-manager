"use client"

import { useState, useEffect, useMemo } from "react"
import { Search, Filter, ArrowRight, Check, Loader2 } from "lucide-react"
import * as LucideIcons from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { ServiceCatalogItem } from "@/types"
import { cn } from "@/lib/utils"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { getCategories, ServiceCategory } from "@/modules/core/catalog/categories-actions"

interface ServiceCatalogSelectorProps {
    onSelect: (item: ServiceCatalogItem) => void
    onCancel: () => void
}

// ✅ Dynamic categories loaded from database - no more hardcoded config!

export function ServiceCatalogSelector({ onSelect, onCancel }: ServiceCatalogSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>([])
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // SECURITY FIX: Only fetch catalog items for current organization
                const orgId = await getCurrentOrganizationId()

                if (!orgId) {
                    console.error("No organization selected")
                    setCatalogItems([])
                    setCategories([])
                    return
                }

                // Load categories and catalog items in parallel
                const [cats, catalogData] = await Promise.all([
                    getCategories(orgId),
                    supabase
                        .from('service_catalog')
                        .select('*')
                        .eq('organization_id', orgId)
                        .order('base_price', { ascending: false })
                ])

                setCategories(cats)

                if (catalogData.error) throw catalogData.error
                if (catalogData.data) setCatalogItems(catalogData.data as ServiceCatalogItem[])
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Helper function to get Lucide icon component
    const getIcon = (iconName: string) => {
        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Folder
        return IconComponent
    }

    // Helper function to get color classes for categories
    const getColorClasses = (color: string) => {
        const colorMap: Record<string, { text: string; bg: string }> = {
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

    // DYNAMIC CATEGORY FILTERING: Only show categories with products
    const availableCategories = useMemo(() => {
        const unique = [...new Set(catalogItems.map(item => item.category))]
        return unique.filter(cat => cat && categories.find(c => c.name === cat))
    }, [catalogItems, categories])

    const filteredItems = catalogItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = selectedCategory ? item.category === selectedCategory : true
        return matchesSearch && matchesCategory
    })

    return (
        <div className="flex h-[750px] w-full max-w-5xl mx-auto bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-100">
            {/* Sidebar Categories */}
            <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col">
                <div className="p-6 pb-4">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Catálogo</h2>
                    <p className="text-xs text-muted-foreground mt-1">Explora tus servicios</p>
                </div>

                <ScrollArea className="flex-1 px-3 pb-3">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start text-sm font-medium h-10 mb-2",
                                !selectedCategory ? "bg-white shadow-sm text-brand-dark" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            )}
                            onClick={() => setSelectedCategory(null)}
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Todos los Servicios
                        </Button>

                        {availableCategories.length > 0 ? (
                            <>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4">Categorías</div>
                                {availableCategories.map((catName) => {
                                    // Find category from database
                                    const category = categories.find(c => c.name === catName)
                                    if (!category) return null

                                    const Icon = getIcon(category.icon)
                                    const colors = getColorClasses(category.color)

                                    return (
                                        <Button
                                            key={catName}
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start text-xs h-9 transition-all",
                                                selectedCategory === catName
                                                    ? "bg-white shadow-sm text-gray-900 font-semibold"
                                                    : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                                            )}
                                            onClick={() => setSelectedCategory(catName)}
                                        >
                                            <Icon className={cn("mr-2 h-3.5 w-3.5", colors.text)} />
                                            {category.name}
                                        </Button>
                                    )
                                })}
                            </>
                        ) : (
                            <div className="text-center py-8 px-4">
                                <LucideIcons.FolderOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-xs text-muted-foreground">
                                    No hay categorías disponibles.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Crea tu primer servicio.
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 flex items-center px-6 gap-4 justify-between bg-white z-10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar plantilla de servicio..."
                            className="pl-9 bg-gray-50 border-transparent focus:bg-white transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        Cancelar
                    </Button>
                </div>

                {/* Grid */}
                <ScrollArea className="flex-1 p-6 bg-gray-50/30">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Cargando catálogo...
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <LucideIcons.Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No se encontraron servicios.</p>
                            <Button variant="link" onClick={() => setSelectedCategory(null)}>
                                Ver todos los servicios
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                            {filteredItems.map((item) => {
                                // Find category from database
                                const category = categories.find(c => c.name === item.category)
                                const Icon = category ? getIcon(category.icon) : LucideIcons.Folder
                                const colors = category ? getColorClasses(category.color) : getColorClasses('gray')

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => onSelect(item)}
                                        className="group relative bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-xl hover:border-brand/30 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={cn("p-2.5 rounded-lg transition-colors", colors.bg)}>
                                                <Icon className={cn("h-6 w-6", colors.text)} />
                                            </div>
                                            <Badge variant="outline" className="bg-slate-50 text-[10px] font-normal border-slate-200">
                                                {item.frequency === 'monthly' ? 'Mensual' : item.frequency}
                                            </Badge>
                                        </div>

                                        <div className="flex-1 mb-4">
                                            <h3 className="font-bold text-base text-gray-900 group-hover:text-brand transition-colors mb-1">
                                                {item.name}
                                            </h3>
                                            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">{item.category}</p>

                                            {item.description && (
                                                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-gray-50 w-full flex items-end justify-between mt-auto">
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-medium uppercase">Desde</p>
                                                <span className="text-lg font-bold text-gray-900">
                                                    ${item.base_price.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-brand group-hover:text-white transition-all">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    )
}
