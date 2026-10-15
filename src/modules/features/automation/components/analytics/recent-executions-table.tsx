'use client'

import { DataTable as Table } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { useClientTablePagination } from "@/components/ui/use-table-pagination"
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface RecentExecutionsTableProps {
    executions: any[]
}

export function RecentExecutionsTable({ executions }: RecentExecutionsTableProps) {
    const { rows: pageRows, pagination } = useClientTablePagination(executions)

    if (executions.length === 0) {
        return (
            <div className="glass-card text-center py-8 text-muted-foreground border-dashed">
                No hay ejecuciones recientes.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Duración</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pageRows.map((exec) => {
                        const duration = exec.completed_at && exec.started_at
                            ? ((new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / 1000).toFixed(2) + 's'
                            : '-'

                        return (
                            <TableRow key={exec.id}>
                                <TableCell className="font-medium">
                                    {exec.workflows?.name || 'Sin nombre'}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={exec.status === 'completed' ? 'default' : exec.status === 'failed' ? 'destructive' : 'secondary'}
                                        className={exec.status === 'completed' ? 'bg-green-500 hover:bg-green-600' : ''}
                                    >
                                        {exec.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {exec.started_at ? formatDistanceToNow(new Date(exec.started_at), { addSuffix: true, locale: es }) : '-'}
                                </TableCell>
                                <TableCell>{duration}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
                <DataTablePagination {...pagination} itemLabel="ejecuciones" className="mt-3" />
        </div>
    )
}
