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
import { Eye, Copy, ExternalLink, MoreVertical, Trash2 } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu"
import { deleteBriefing } from "@/lib/actions/briefings"
import { toast } from "sonner"
import Link from "next/link"

interface BriefingListProps {
    briefings: Briefing[]
}

export function BriefingList({ briefings }: BriefingListProps) {
    const copyLink = (token: string) => {
        const url = `${window.location.origin}/briefing/${token}`
        navigator.clipboard.writeText(url)
        toast.success("Link copiado al portapapeles")
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar este briefing? Esta acción no se puede deshacer.")) {
            try {
                await deleteBriefing(id)
                toast.success("Briefing eliminado correctamente")
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

    return (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Tipo de Briefing</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {briefings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                No hay briefings creados aún.
                            </TableCell>
                        </TableRow>
                    ) : (
                        briefings.map((briefing) => (
                            <TableRow key={briefing.id} className="hover:bg-gray-50/50">
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
    )
}
