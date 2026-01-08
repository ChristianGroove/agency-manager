"use client"

import { useState } from "react"
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
import { KnowledgeEntry } from "../actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface KnowledgeListProps {
    data: KnowledgeEntry[]
    onDelete: (id: string) => void
    onEdit: (entry: KnowledgeEntry) => void
}

export function KnowledgeList({ data, onDelete, onEdit }: KnowledgeListProps) {
    const [filter, setFilter] = useState("")

    const filtered = data.filter(item =>
        item.question.toLowerCase().includes(filter.toLowerCase()) ||
        item.answer.toLowerCase().includes(filter.toLowerCase()) ||
        item.category.toLowerCase().includes(filter.toLowerCase())
    )

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed bg-muted/20">
                <div className="h-12 w-12 rounded-full bg-[var(--brand-pink)]/10 dark:bg-[var(--brand-pink)]/20 flex items-center justify-center mb-4">
                    <BrainCircuit className="h-6 w-6 text-[var(--brand-pink)]" />
                </div>
                <h3 className="text-lg font-semibold">Tu Base de Conocimiento está vacía</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-4">
                    Comienza a agregar preguntas frecuentes manualmente o usa la IA para extraerlas de tus chats.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar preguntas o respuestas..."
                        className="pl-9"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white dark:bg-zinc-900 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Pregunta / Respuesta</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Fuente</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No se encontraron resultados para "{filter}"
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((item) => (
                                <TableRow key={item.id} className="group cursor-pointer hover:bg-muted/30" onClick={() => onEdit(item)}>
                                    <TableCell className="max-w-[400px]">
                                        <div className="font-medium text-sm line-clamp-1 mb-1">{item.question}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {item.answer}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2" title={format(new Date(item.created_at), "PPpp", { locale: es })}>
                                            {item.source === 'ai_extracted' ? (
                                                <Badge variant="secondary" className="bg-[var(--brand-pink)]/10 text-[var(--brand-pink)] border-[var(--brand-pink)]/20 gap-1 px-2 py-0.5">
                                                    <Bot className="h-3 w-3" /> IA
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1 px-2 py-0.5">
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
