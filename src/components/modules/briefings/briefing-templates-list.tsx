"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Copy, FileText } from "lucide-react"
import { BriefingTemplate } from "@/types/briefings"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface BriefingTemplatesListProps {
    templates: BriefingTemplate[]
    onEdit: (template: BriefingTemplate) => void
    onDelete: (id: string) => void
    onDuplicate?: (template: BriefingTemplate) => void
}

export function BriefingTemplatesList({
    templates,
    onEdit,
    onDelete,
    onDuplicate
}: BriefingTemplatesListProps) {
    if (templates.length === 0) {
        return (
            <Card className="p-12 text-center border-dashed">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay plantillas de briefing
                </h3>
                <p className="text-muted-foreground mb-6">
                    Crea tu primera plantilla para empezar a recopilar información de clientes.
                </p>
            </Card>
        )
    }

    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Preguntas</TableHead>
                        <TableHead>Última Edición</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {templates.map((template) => (
                        <TableRow key={template.id}>
                            <TableCell>
                                <div>
                                    <p className="font-medium">{template.name}</p>
                                    {template.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">
                                    {template.structure?.length || 0} preguntas
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDistanceToNow(new Date(template.updated_at), {
                                    addSuffix: true,
                                    locale: es
                                })}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onEdit(template)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    {onDuplicate && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDuplicate(template)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onDelete(template.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    )
}
