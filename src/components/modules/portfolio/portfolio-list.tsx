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

export function PortfolioList({ items, onEdit, onDelete }: PortfolioListProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Group items by category
    const groupedItems = filteredItems.reduce((acc, item) => {
        if (!acc[item.category]) {
            acc[item.category] = []
        }
        acc[item.category].push(item)
        return acc
    }, {} as Record<string, ServiceCatalogItem[]>)

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

            {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
                    <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No se encontraron servicios</p>
                </div>
            ) : (
                Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="space-y-3">
                        <h3 className="font-semibold text-gray-600 text-sm pl-1 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-pink/50"></span>
                            {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {categoryItems.map(item => (
                                <div
                                    key={item.id}
                                    className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-indigo-100 transition-all duration-300 flex flex-col relative"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <Badge variant="secondary" className={cn(
                                            "text-[10px] uppercase font-bold tracking-tight",
                                            item.type === 'recurring' ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"
                                        )}>
                                            {item.type === 'recurring' ? 'Suscripción' : 'Pago Único'}
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

                                    <h4 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
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
                    </div>
                ))
            )}
        </div>
    )
}
