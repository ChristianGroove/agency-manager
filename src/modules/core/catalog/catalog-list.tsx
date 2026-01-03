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

import { ViewMode } from "@/components/shared/view-toggle"

interface CatalogListProps {
    items: ServiceCatalogItem[]
    onEdit: (item: ServiceCatalogItem) => void
    onDelete: (id: string) => void
    viewMode: ViewMode
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CatalogList({ items, onEdit, onDelete, viewMode }: CatalogListProps) {

    const renderGrid = (itemsToRender: ServiceCatalogItem[]) => {
        if (itemsToRender.length === 0) {
            return <EmptyState />
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {itemsToRender.map(item => (
                    <div
                        key={item.id}
                        className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col relative h-full"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <Badge variant="secondary" className={cn(
                                "text-[10px] uppercase font-bold tracking-tight",
                                item.type === 'recurring' ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"
                            )}>
                                {categoryShorthand(item.type)}
                            </Badge>

                            <ActionMenu item={item} onEdit={onEdit} onDelete={onDelete} />
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
                            {item.category && (
                                <Badge variant="outline" className="text-[10px] text-gray-500 bg-gray-50">
                                    {item.category}
                                </Badge>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const renderList = (itemsToRender: ServiceCatalogItem[]) => {
        if (itemsToRender.length === 0) {
            return <EmptyState />
        }

        return (
            <div className="space-y-3">
                {itemsToRender.map(item => (
                    <div
                        key={item.id}
                        className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-lg",
                                item.type === 'recurring' ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"
                            )}>
                                <Briefcase className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900 truncate" title={item.name}>{item.name}</h4>
                                    {item.category && (
                                        <Badge variant="outline" className="text-[10px] text-gray-500 bg-gray-50 shrink-0">
                                            {item.category}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-tight",
                                        item.type === 'recurring' ? "text-indigo-600" : "text-orange-600"
                                    )}>
                                        {categoryShorthand(item.type)}
                                    </span>
                                    <span>•</span>
                                    <span className="truncate max-w-[300px]">{item.description || "Sin descripción"}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                                <div className="font-bold text-gray-900">
                                    ${item.base_price?.toLocaleString() || 0}
                                </div>
                                {item.type === 'recurring' && (
                                    <div className="text-xs text-gray-400">
                                        /{item.frequency === 'monthly' ? 'mes' : 'año'}
                                    </div>
                                )}
                            </div>

                            <ActionMenu item={item} onEdit={onEdit} onDelete={onDelete} />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const categoryShorthand = (type: string) => type === 'recurring' ? 'Suscripción' : 'Pago Único'

    return viewMode === 'list' ? renderList(items) : renderGrid(items)
}

function EmptyState() {
    return (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
            <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No se encontraron servicios</p>
        </div>
    )
}

function ActionMenu({ item, onEdit, onDelete }: { item: ServiceCatalogItem, onEdit: (i: ServiceCatalogItem) => void, onDelete: (id: string) => void }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
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
    )
}
