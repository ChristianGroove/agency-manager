"use client"

import { useState, useEffect } from "react"
import { Search, Filter, ArrowRight, Server, Palette, Monitor, Globe, TrendingUp, MessageCircle, Briefcase, Lightbulb, Puzzle, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { ServiceCatalogItem } from "@/types"
import { cn } from "@/lib/utils"

interface ServiceCatalogSelectorProps {
    onSelect: (item: ServiceCatalogItem) => void
    onCancel: () => void
}

const CATEGORY_CONFIG = {
    "Infraestructura & Suscripciones": { icon: Server, color: "text-blue-500", bg: "bg-blue-50", label: "Infraestructura" },
    "Branding & Identidad": { icon: Palette, color: "text-purple-500", bg: "bg-purple-50", label: "Branding" },
    "UX / UI & Producto Digital": { icon: Monitor, color: "text-pink-500", bg: "bg-pink-50", label: "UX / UI" },
    "Web & Ecommerce": { icon: Globe, color: "text-indigo-500", bg: "bg-indigo-50", label: "Web / E-comm" },
    "Marketing & Growth": { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50", label: "Growth" },
    "Social Media & Contenido": { icon: MessageCircle, color: "text-orange-500", bg: "bg-orange-50", label: "Social" },
    "Diseño como Servicio (DaaS)": { icon: Briefcase, color: "text-cyan-500", bg: "bg-cyan-50", label: "DaaS" },
    "Consultoría & Especialidades": { icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-50", label: "Consultoría" },
    "Servicios Flexibles / A Medida": { icon: Puzzle, color: "text-gray-500", bg: "bg-gray-50", label: "Flexible" },
}

export function ServiceCatalogSelector({ onSelect, onCancel }: ServiceCatalogSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [catalogItems, setCatalogItems] = useState<ServiceCatalogItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCatalog = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('service_catalog')
                    .select('*')
                    // Order by name inside category for consistency, or by Price desc
                    .order('base_price', { ascending: false })

                if (error) throw error
                if (data) setCatalogItems(data as ServiceCatalogItem[])
            } catch (error) {
                console.error("Error fetching catalog:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchCatalog()
    }, [])

    const filteredItems = catalogItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = selectedCategory ? item.category === selectedCategory : true
        return matchesSearch && matchesCategory
    })

    // Group items by category for the "All" view if desired, or just list them.
    // Given the request for "modern/bonito", a masonry or nice grid is good.
    // Let's stick to the grid but with the category sidebar.

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

                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4">Categorías</div>
                        {Object.entries(CATEGORY_CONFIG).map(([catName, config]) => (
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
                                <config.icon className={cn("mr-2 h-3.5 w-3.5", config.color)} />
                                {config.label}
                            </Button>
                        ))}
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
                            placeholder="Buscar servicio, precio o tag..."
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
                            Cargando catálogo...
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground">
                            <Puzzle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>No se encontraron servicios.</p>
                            <Button variant="link" onClick={() => setSelectedCategory(null)}>
                                Ver todos los servicios
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
                            {filteredItems.map(item => {
                                // Dynamic Config based on category of item
                                const config = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || { icon: Puzzle, color: 'text-gray-500', bg: 'bg-gray-50' }
                                const Icon = config.icon

                                return (
                                    <div
                                        key={item.id}
                                        className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
                                        onClick={() => onSelect(item)}
                                    >
                                        {/* Colored Top Banner */}
                                        <div className={cn("h-1.5 w-full", config.bg.replace("bg-", "bg-gradient-to-r from-white to-").replace("50", "400"))} />

                                        <div className="p-5 flex-1 flex flex-col">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div className={cn("p-2 rounded-lg", config.bg)}>
                                                    <Icon className={cn("h-5 w-5", config.color)} />
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[10px] font-medium px-2 h-5 border-0",
                                                        item.type === 'recurring'
                                                            ? "bg-indigo-50 text-indigo-700"
                                                            : "bg-amber-50 text-amber-700"
                                                    )}
                                                >
                                                    {item.type === 'recurring' ? 'RECURRENTE' : 'ÚNICO'}
                                                </Badge>
                                            </div>

                                            <h3 className="font-bold text-gray-900 leading-tight mb-2 text-base group-hover:text-indigo-600 transition-colors">
                                                {item.name}
                                            </h3>

                                            <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                                                {item.description}
                                            </p>

                                            {/* Footer Price */}
                                            <div className="pt-4 border-t border-gray-50 mt-auto flex items-end justify-between">
                                                <div>
                                                    <p className="text-xs text-gray-400 font-medium mb-0.5">Precio Base</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-lg font-bold text-gray-900">
                                                            {item.base_price > 0
                                                                ? `$${item.base_price.toLocaleString()}`
                                                                : 'A definir'}
                                                        </span>
                                                        {item.type === 'recurring' && item.frequency && (
                                                            <span className="text-xs text-gray-500 font-medium capitalize">
                                                                / {item.frequency === 'monthly' ? 'mes' :
                                                                    item.frequency === 'yearly' ? 'año' : item.frequency}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                                                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer Hint */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 text-xs text-center text-gray-500">
                    Mostrando {filteredItems.length} servicios disponibles. Selecciona uno para autocompletar el formulario.
                </div>
            </div>
        </div>
    )
}
