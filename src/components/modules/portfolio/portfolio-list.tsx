"use client"

import { useState } from "react"
import { ServiceCatalogItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Briefcase, MoreHorizontal, Pencil, Trash2, Search, Filter } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PortfolioListProps {
    items: ServiceCatalogItem[]
    onEdit: (item: ServiceCatalogItem) => void
    onDelete: (id: string) => void
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PortfolioList({ items, onEdit, onDelete }: PortfolioListProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const uniqueCategories = Array.from(new Set(items.map(item => item.category))).sort()

    const filterItems = (category?: string) => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesCategory = category ? item.category === category : true
            return matchesSearch && matchesCategory
        })
    }

    const renderGrid = (itemsToRender: ServiceCatalogItem[]) => {
        if (itemsToRender.length === 0) {
            return (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
                    <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No se encontraron servicios</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {itemsToRender.map(item => (
                    <div
                        key={item.id}
                        className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 flex flex-col relative h-full"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <Badge variant="secondary" className={cn(
                                "text-[10px] uppercase font-bold tracking-tight",
                                item.type === 'recurring' ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"
                            )}>
                                {categoryShorthand(item.type)}
                            </Badge>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-6 w-6 p-0 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MoreHorizontal className="h-3 w-3 text-gray-400" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <h4 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1" title={item.name}>{item.name}</h4>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 min-h-[40px]">
                            {item.description || "Sin descripción"}
                        </p>

                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 font-medium">PRECIO BASE</span>
                                <span className="font-bold text-gray-900">
                                    ${item.base_price?.toLocaleString() || 0}
                                    {item.type === 'recurring' && <span className="text-xs font-normal text-gray-400">/{item.frequency === 'monthly' ? 'mes' : 'año'}</span>}
                                </span>
                            </div>
                            {item.is_visible_in_portal && (
                                <div className="h-2 w-2 rounded-full bg-green-500" title="Visible en Portal"></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const categoryShorthand = (type: string) => type === 'recurring' ? 'Suscripción' : 'Pago Único'

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Buscar servicios..."
                    className="border-none shadow-none focus-visible:ring-0 bg-transparent p-0 h-auto font-medium placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="overflow-x-auto pb-2 scrollbar-hide">
                    <TabsList className="w-auto inline-flex h-auto p-1 bg-transparent gap-2">
                        <TabsTrigger
                            value="all"
                            className="rounded-full px-4 py-2 data-[state=active]:bg-brand-pink data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
                        >
                            Todos
                        </TabsTrigger>
                        {uniqueCategories.map(cat => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="rounded-full px-4 py-2 data-[state=active]:bg-brand-pink data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white"
                            >
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="all" className="mt-6 focus-visible:outline-none">
                    {renderGrid(filterItems())}
                </TabsContent>

                {uniqueCategories.map(cat => (
                    <TabsContent key={cat} value={cat} className="mt-6 focus-visible:outline-none">
                        {renderGrid(filterItems(cat))}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
