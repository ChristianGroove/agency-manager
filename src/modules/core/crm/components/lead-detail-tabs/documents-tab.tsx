'use client'

import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileIcon, UploadCloud, Trash2, Download, Loader2 } from 'lucide-react'
import type { LeadDocument } from '@/types/crm-advanced'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { uploadLeadFile, createLeadDocument, deleteLeadDocument } from '../../crm-advanced-actions'

interface LeadDocumentsTabProps {
    leadId: string
    documents: LeadDocument[]
    onUpdate: () => void
}

export function LeadDocumentsTab({ leadId, documents, onUpdate }: LeadDocumentsTabProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // 1. Upload to Storage
            const uploadRes = await uploadLeadFile(formData)
            if (!uploadRes.success || !uploadRes.url) {
                throw new Error(uploadRes.error || "Error al subir archivo")
            }

            // 2. Create DB Record
            const dbRes = await createLeadDocument(
                leadId,
                file.name,
                uploadRes.url,
                file.size,
                file.type
            )

            if (dbRes.success) {
                toast.success("Documento subido correctamente")
                onUpdate()
            } else {
                throw new Error(dbRes.error || "Error al guardar registro")
            }

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Error inesperado")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    const handleDelete = async (docId: string) => {
        if (!confirm("¿Estás seguro de eliminar este documento?")) return

        setIsDeleting(docId)
        try {
            const res = await deleteLeadDocument(docId)
            if (res.success) {
                toast.success("Documento eliminado")
                onUpdate()
            } else {
                toast.error("Error al eliminar documento")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al eliminar documento")
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="space-y-6">
            <Card
                className={`border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
                <CardContent className="flex flex-col items-center justify-center py-10">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />

                    {isUploading ? (
                        <>
                            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                            <h3 className="text-sm font-medium mb-1">Subiendo archivo...</h3>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                            <h3 className="text-sm font-medium mb-1">Subir Archivos</h3>
                            <p className="text-xs text-muted-foreground mb-4">Haz clic para seleccionar un archivo (Max 10MB)</p>
                            <Button variant="outline" size="sm" onClick={handleFileClick}>
                                Seleccionar Archivo
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="space-y-3">
                {documents.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No hay documentos adjuntos</p>
                ) : (
                    documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-sm transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                                    <FileIcon className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Subido {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: es })}
                                        {' · '}{doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" asChild title="Descargar">
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                        <Download className="h-4 w-4" />
                                    </a>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(doc.id)}
                                    disabled={isDeleting === doc.id}
                                    title="Eliminar"
                                >
                                    {isDeleting === doc.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
