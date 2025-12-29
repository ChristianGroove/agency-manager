"use client"

import { Briefing } from "@/types/briefings"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, Copy, ExternalLink, MoreVertical, Trash2, Search, ListFilter, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { BulkActionsFloatingBar } from "@/components/shared/bulk-actions-floating-bar"
import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getBriefings, deleteBriefing } from "@/modules/verticals/agency/briefings/actions"
import { toast } from "sonner"
import Link from "next/link"

interface BriefingListProps {
    briefings: Briefing[]
}

import { useRouter } from "next/navigation"

export function BriefingList({ briefings }: BriefingListProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState("")
    const [showFilters, setShowFilters] = useState(false)
    const [statusFilter, setStatusFilter] = useState("all")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDeleting, setIsDeleting] = useState(false)

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/briefing/${token}`
        navigator.clipboard.writeText(url)
        toast.success("Link copiado al portapapeles")
    }

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds)
        if (newSelection.has(id)) {
            newSelection.delete(id)
        } else {
            newSelection.add(id)
        }
        setSelectedIds(newSelection)
    }

    const toggleAll = () => {
        if (selectedIds.size === filteredBriefings.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredBriefings.map(b => b.id)))
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`¿Estás seguro de eliminar ${selectedIds.size} briefings seleccionados?`)) return

        setIsDeleting(true)
        try {
            const { deleteBriefings } = await import("@/modules/verticals/agency/briefings/actions")
            await deleteBriefings(Array.from(selectedIds))
            toast.success(`${selectedIds.size} briefings eliminados`)
            setSelectedIds(new Set())
            router.refresh()
        } catch (error) {
            console.error("Error deleting briefings:", error)
            toast.error("Error al eliminar briefings")
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este briefing? Esta acción no se puede deshacer de la vista actual.")) {
            try {
                await deleteBriefing(id)
                toast.success("Briefing enviado a la papelera")
                router.refresh()
            } catch (error) {
                console.error("Error deleting briefing:", error)
                toast.error("Error al eliminar el briefing")
            }
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <Badge variant="secondary">Borrador</Badge>
            case 'sent':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Enviado</Badge>
            case 'in_progress':
                return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En Progreso</Badge>
            case 'submitted':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const filteredBriefings = briefings.filter(briefing => {
        const clientName = briefing.client?.name || ""
        const templateName = briefing.template?.name || ""

        const matchesSearch =
            clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            templateName.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || briefing.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-8">
            {/* Unified Control Block */}
            <div className="flex flex-col md:flex-row gap-3 sticky top-4 z-30">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-col md:flex-row items-center gap-2 flex-1 transition-all hover:shadow-md">
                    {/* Integrated Search */}
                    <div className="relative flex-1 w-full md:w-auto min-w-[200px] flex items-center px-3 gap-2">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <Input
                            placeholder="Buscar por cliente o tipo de briefing..."
                            className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-full outline-none text-gray-700 placeholder:text-gray-400 h-9 p-0 shadow-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Vertical Divider (Desktop) */}
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    {/* Collapsible Filter Pills (Middle) */}
                    <div className={cn(
                        "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out",
                        showFilters ? "max-w-[800px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0 p-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-1.5 min-w-max">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 hidden lg:block">Estado</span>
                            {[
                                { id: 'all', label: 'Todos', color: 'gray' },
                                { id: 'draft', label: 'Borrador', color: 'gray' },
                                { id: 'sent', label: 'Enviado', color: 'blue' },
                                { id: 'in_progress', label: 'En Progreso', color: 'amber' },
                                { id: 'submitted', label: 'Completado', color: 'green' },
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        statusFilter === filter.id
                                            ? filter.id === 'draft' ? "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20 shadow-sm"
                                                : filter.id === 'sent' ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-sm"
                                                    : filter.id === 'in_progress' ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 shadow-sm"
                                                        : filter.id === 'submitted' ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm"
                                                            : "bg-gray-900 text-white shadow-sm"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span>{filter.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />

                    {/* Toggle Filters Button (Fixed Right) */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                            showFilters
                                ? "bg-gray-100 text-gray-900 border-gray-200 shadow-inner"
                                : "bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-900"
                        )}
                        title="Filtrar Briefings"
                    >
                        <ListFilter className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden relative">
                <BulkActionsFloatingBar
                    selectedCount={selectedIds.size}
                    onDelete={handleBulkDelete}
                    onClearSelection={() => setSelectedIds(new Set())}
                    isDeleting={isDeleting}
                />
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={filteredBriefings.length > 0 && selectedIds.size === filteredBriefings.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Tipo de Briefing</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Creación</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredBriefings.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                    No hay briefings que coincidan con los filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredBriefings.map((briefing) => (
                                <TableRow key={briefing.id} className="hover:bg-gray-50/50">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.has(briefing.id)}
                                            onCheckedChange={() => toggleSelection(briefing.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900">
                                        {briefing.client?.name || 'Sin Cliente (Lead)'}
                                    </TableCell>
                                    <TableCell className="text-gray-700">{briefing.template?.name}</TableCell>
                                    <TableCell>{getStatusBadge(briefing.status)}</TableCell>
                                    <TableCell className="text-gray-500">
                                        {new Date(briefing.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <Link href={`/briefings/${briefing.id}`}>
                                                    <DropdownMenuItem>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        <span>Ver Respuestas</span>
                                                    </DropdownMenuItem>
                                                </Link>
                                                <Link href={`/briefing/${briefing.token}`} target="_blank">
                                                    <DropdownMenuItem>
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        <span>Ver como Cliente</span>
                                                    </DropdownMenuItem>
                                                </Link>
                                                <DropdownMenuItem onClick={() => copyLink(briefing.token)}>
                                                    <Copy className="mr-2 h-4 w-4" />
                                                    <span>Copiar Link</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(briefing.id)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Eliminar</span>
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
        </div>
    )
}
