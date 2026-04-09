"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type EmailLog = {
    id: string
    recipient: string
    subject: string
    status: 'sent' | 'failed' | 'queued'
    created_at: string
    error_message?: string
}

export function EmailLogsTable() {
    const [logs, setLogs] = useState<EmailLog[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('email_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) console.error(error)
        else setLogs(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Historial de Correos</h3>
                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Destinatario</TableHead>
                            <TableHead>Asunto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                    No hay registros recientes.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge variant={log.status === 'sent' ? 'secondary' : 'destructive'} className={log.status === 'sent' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''}>
                                            {log.status === 'sent' ? 'Enviado' : 'Fallido'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                                    </TableCell>
                                    <TableCell>{log.recipient}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={log.subject}>
                                        {log.subject}
                                        {log.error_message && (
                                            <div className="text-xs text-red-500 mt-1">{log.error_message}</div>
                                        )}
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
