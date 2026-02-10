
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Search, FileText, Eye, Download, Printer, Trash2 } from 'lucide-react'
import { ManifestUploadDialog } from './manifest-upload-dialog'
import { searchIMEI, getManifestUrl } from '../actions'
import { toast } from 'sonner'
import { PdfViewerDialog } from './pdf-viewer-dialog'

interface DocumentResult {
    id: string
    filename: string
    created_at: string
    storage_path: string
    matched_imei?: string
}

export function ManifestsDashboard({ initialDocs }: { initialDocs: any[] }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<DocumentResult[]>(initialDocs)
    const [isSearching, setIsSearching] = useState(false)

    // Viewer State
    const [viewerOpen, setViewerOpen] = useState(false)
    const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null)
    const [targetImei, setTargetImei] = useState<string | undefined>(undefined)

    async function handleSearch() {
        if (!query) {
            setResults(initialDocs)
            return
        }

        setIsSearching(true)
        try {
            const data = await searchIMEI(query)
            setResults(data)
            if (data.length === 0) toast.info('No se encontraron manifiestos con ese IMEI')
        } finally {
            setIsSearching(false)
        }
    }

    async function openManifest(doc: DocumentResult) {
        toast.loading('Cargando documento...')
        const url = await getManifestUrl(doc.storage_path)
        toast.dismiss()

        if (url) {
            setSelectedDocUrl(url)
            setTargetImei(doc.matched_imei) // Pass the IMEI to highlight if it was a search result
            setViewerOpen(true)
        } else {
            toast.error('Error al obtener URL del documento')
        }
    }

    async function handleDelete(doc: DocumentResult) {
        if (!confirm(`¿Estás seguro de eliminar el manifiesto "${doc.filename}"? esta acción no se puede deshacer.`)) return

        toast.loading('Eliminando...')
        try {
            const { deleteManifest } = await import('../actions')
            const res = await deleteManifest(doc.id, doc.storage_path)

            if (res.success) {
                toast.success('Manifiesto eliminado')
                // Remove from local state to avoid full reload if possible, or just reload
                setResults(prev => prev.filter(d => d.id !== doc.id))
            } else {
                toast.error(res.error || 'Error al eliminar')
            }
        } catch (err) {
            console.error(err)
            toast.error('Error al procesar la solicitud')
        } finally {
            toast.dismiss()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar IMEI (ej. 35284...)"
                        className="pl-8"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
                        {isSearching ? 'Buscando...' : 'Buscar'}
                    </Button>
                    <ManifestUploadDialog onUploadComplete={() => window.location.reload()} />
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>IMEI Encontrado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.length > 0 ? (
                            results.map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-orange-500" />
                                        {doc.filename}
                                    </TableCell>
                                    <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        {doc.matched_imei ? (
                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-mono text-xs border border-yellow-200">
                                                {doc.matched_imei}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => openManifest(doc)}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            Ver
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(doc)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-1" />
                                            Eliminar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No se encontraron documentos
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <PdfViewerDialog
                open={viewerOpen}
                onOpenChange={setViewerOpen}
                url={selectedDocUrl}
                highlightImei={targetImei}
            />
        </div>
    )
}
