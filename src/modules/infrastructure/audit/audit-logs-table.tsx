'use client'

import { useEffect, useState } from "react"
import { getSecurityAuditLogs, SecurityAuditLog } from "./actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, RefreshCw, Filter, Search, ShieldAlert, ShieldCheck, Shield } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export function AuditLogsTable() {
    const [logs, setLogs] = useState<SecurityAuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)
    const [filterResource, setFilterResource] = useState("")

    useEffect(() => {
        fetchLogs()
    }, [page])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const { logs: newLogs, total } = await getSecurityAuditLogs(page, 20, { resource: filterResource })
            setLogs(newLogs)
            setHasMore(newLogs.length === 20) // Simple infinite scroll logic or pagination
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchLogs()
    }

    const getActionBadge = (action: string) => {
        if (action.includes("DELETED")) return <Badge variant="destructive">{action}</Badge>
        if (action.includes("CREATED")) return <Badge variant="default" className="bg-green-600 hover:bg-green-700">{action}</Badge>
        if (action.includes("UPDATED")) return <Badge variant="secondary">{action}</Badge>
        if (action.includes("LOGIN")) return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">{action}</Badge>
        return <Badge variant="outline">{action}</Badge>
    }

    return (
        <Card className="border-0 shadow-none bg-transparent">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <form onSubmit={handleSearch} className="relative flex-1 sm:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Filtrar por recurso (ej: client_id)..."
                            className="pl-9 bg-white dark:bg-white/5"
                            value={filterResource}
                            onChange={(e) => setFilterResource(e.target.value)}
                        />
                    </form>
                    <Button variant="outline" size="icon" onClick={() => { setPage(1); fetchLogs() }} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Auditoría Activa
                </div>
            </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Fecha</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Recurso</TableHead>
                            <TableHead className="text-right">Detalles</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    No hay registros de auditoría recientes.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{log.actor?.full_name || 'Desconocido'}</span>
                                            <span className="text-xs text-muted-foreground">{log.actor?.email || log.actor_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getActionBadge(log.action)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium">{log.resource_entity}</span>
                                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]" title={log.resource_id || ''}>
                                                {log.resource_id?.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <pre className="text-[10px] text-left inline-block bg-gray-50 dark:bg-black/20 p-1.5 rounded border max-w-[200px] overflow-auto max-h-[60px]">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

            <div className="flex items-center justify-end gap-2 mt-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                >
                    Anterior
                </Button>
                <div className="text-sm text-muted-foreground">
                    Página {page}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || loading}
                >
                    Siguiente
                </Button>
            </div>
        </Card>
    )
}
