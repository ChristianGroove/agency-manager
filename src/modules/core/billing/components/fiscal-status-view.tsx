"use client"

import { useEffect, useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileCode, Activity, Lock, AlertTriangle, CheckCircle, Search, ExternalLink } from "lucide-react"
import { getFiscalDocuments, FiscalDocumentRow } from "../actions/get-fiscal-documents"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export function FiscalStatusView() {
    const [docs, setDocs] = useState<FiscalDocumentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getFiscalDocuments()
                setDocs(data)
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filteredDocs = docs.filter(d =>
        d.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.cufe?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACEPTADA':
                return <Badge className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/10 border-green-200 dark:border-green-500/20">Aceptada DIAN</Badge>
            case 'RECHAZADA':
                return <Badge className="bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10 border-red-200 dark:border-red-500/20">Rechazada</Badge>
            case 'ENVIADA':
            case 'EN_PROCESO':
                return <Badge className="bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 animate-pulse">En Proceso</Badge>
            case 'CONTINGENCIA':
                return <Badge className="bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/10 border-orange-200 dark:border-orange-500/20">Contingencia</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Filter */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-lg border border-red-100 dark:border-red-500/20">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Zona Fiscal: Evidencia Inmutable</span>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar por Factura o CUFE..."
                        className="pl-8 bg-white dark:bg-white/5 dark:text-white dark:border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Read-Only Table */}
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                        <TableRow>
                            <TableHead>Factura</TableHead>
                            <TableHead>Emisión</TableHead>
                            <TableHead>Estado DIAN</TableHead>
                            <TableHead>CUFE (Evidencia)</TableHead>
                            <TableHead>Valor Fiscal</TableHead>
                            <TableHead className="text-right">Trazabilidad</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-gray-400">
                                    Cargando libros fiscales...
                                </TableCell>
                            </TableRow>
                        ) : filteredDocs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                        <p>No hay documentos electrónicos emitidos.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDocs.map((doc, i) => (
                                <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 border-gray-100 dark:border-white/10">
                                    <TableCell className="font-mono font-medium dark:text-white">{doc.invoice_number}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 text-xs">
                                        {new Date(doc.issued_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(doc.dian_status)}</TableCell>
                                    <TableCell>
                                        {doc.cufe ? (
                                            <div className="flex items-center gap-2 group cursor-help" title={doc.cufe}>
                                                <div className="font-mono text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded border border-gray-100 dark:border-white/10 max-w-[120px] truncate">
                                                    {doc.cufe}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300 text-xs italic">Pendiente</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">
                                        ${doc.total.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {doc.xml_url && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10" title="Ver XML Firmado">
                                                    <FileCode className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title="Ver Traza de Auditoría">
                                                <Activity className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <p className="text-xs text-center text-gray-400 max-w-2xl mx-auto">
                Esta vista muestra exclusivamente los registros inmutables almacenados en la tabla <code>dian_documents</code>.
                Cualquier discrepancia con la vista operativa debe ser investigada inmediatamente.
            </p>
        </div>
    )
}
