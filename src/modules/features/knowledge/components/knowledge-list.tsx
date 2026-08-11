"use client"

import { useState } from "react"
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical, Edit2, Trash2, Bot, User, BrainCircuit } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { KnowledgeEntry } from "@/modules/features/knowledge/knowledge-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface KnowledgeListProps {
    data: KnowledgeEntry[]
    onDelete: (id: string) => void
    onEdit: (entry: KnowledgeEntry) => void
}

export function KnowledgeList({ data, onDelete, onEdit }: KnowledgeListProps) {
    const [filter, setFilter] = useState("")
    const [activeFilter, setActiveFilter] = useState("all")

    const categories = Array.from(new Set(data.map(item => item.category)))
    const filterOptions = [
        { id: 'all', label: 'Todas', count: data.length, color: 'zinc' },
        ...categories.map(c => ({ id: c, label: c, count: data.filter(i => i.category === c).length, color: 'pink' }))
    ]

    const filtered = data.filter(item => {
        const matchesSearch = item.question.toLowerCase().includes(filter.toLowerCase()) ||
            item.answer.toLowerCase().includes(filter.toLowerCase()) ||
            item.category.toLowerCase().includes(filter.toLowerCase())
        const matchesFilter = activeFilter === 'all' || item.category === activeFilter
        return matchesSearch && matchesFilter
    })

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-100 dark:border-white/10 rounded-2xl bg-gray-50/50 dark:bg-zinc-900/40">
                <div className="h-12 w-12 rounded-2xl bg-brand-pink/10 text-brand-pink flex items-center justify-center mb-4">
                    <BrainCircuit className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Tu Base de Conocimiento está vacía</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mt-1 mb-4">
                    Comienza a agregar preguntas frecuentes manualmente o usa la IA para extraerlas de tus chats.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="sticky top-4 z-30">
                <SearchFilterBar
                    searchTerm={filter}
                    onSearchChange={setFilter}
                    searchPlaceholder="Buscar preguntas o respuestas..."
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    filters={filterOptions}
                />
            </div>

            <div className="glass-card rounded-2xl overflow-hidden relative">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <TableHead className="font-bold text-xs">Pregunta / Respuesta</TableHead>
                            <TableHead className="font-bold text-xs">Categoría</TableHead>
                            <TableHead className="font-bold text-xs">Fuente</TableHead>
                            <TableHead className="text-right font-bold text-xs">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-slate-500 dark:text-gray-400 text-xs">
                                    No se encontraron resultados para "{filter}"
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((item) => (
                                <TableRow key={item.id} className="group cursor-pointer hover:bg-zinc-50/60 dark:hover:bg-white/5 border-b border-gray-100 dark:border-white/5" onClick={() => onEdit(item)}>
                                    <TableCell className="max-w-[400px]">
                                        <div className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1 mb-1">{item.question}</div>
                                        <div className="text-xs text-slate-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                            {item.answer}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-medium text-xs border-transparent bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300 rounded-lg">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2" title={format(new Date(item.created_at), "PPpp", { locale: es })}>
                                            {item.source === 'ai_extracted' ? (
                                                <Badge variant="secondary" className="bg-brand-pink/10 text-brand-pink border border-brand-pink/20 gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                                    <Bot className="h-3 w-3" /> IA
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold dark:bg-zinc-800 dark:text-gray-300">
                                                    <User className="h-3 w-3" /> Manual
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item) }}>
                                                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm("¿Estás seguro de eliminar este registro?")) onDelete(item.id)
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground text-center">
                Mostrando {filtered.length} de {data.length} registros
            </div>
        </div>
    )
}

