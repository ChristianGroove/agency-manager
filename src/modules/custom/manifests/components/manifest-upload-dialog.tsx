
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Upload, Loader2, FileText } from 'lucide-react'
import { uploadManifest } from '../actions'
import { toast } from 'sonner'

export function ManifestUploadDialog({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [open, setOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleUpload() {
        if (files.length === 0) return

        setIsUploading(true)
        let successCount = 0
        let totalTime = 0

        try {
            // Check for file size limit (10MB)
            const MAX_SIZE = 10 * 1024 * 1024
            const oversizedFiles = files.filter(f => f.size > MAX_SIZE)
            if (oversizedFiles.length > 0) {
                toast.error(`Los siguientes archivos exceden el límite de 10MB: ${oversizedFiles.map(f => f.name).join(', ')}`)
                setIsUploading(false)
                return
            }

            // Upload sequentially
            for (const file of files) {
                const start = Date.now()
                const formData = new FormData()
                formData.append('file', file)

                const res = await uploadManifest(formData)

                if (res.success) {
                    successCount++
                } else {
                    console.error(`Error uploading ${file.name}:`, res.error)
                    toast.error(`Error en ${file.name}: ${res.error}`)
                }
                totalTime += Date.now() - start
            }

            if (successCount > 0) {
                toast.success(`Se subieron ${successCount} de ${files.length} manifiestos.`)
                setOpen(false)
                setFiles([])
                onUploadComplete()
            }
        } catch (err) {
            toast.error('Error general en la carga')
        } finally {
            setIsUploading(false)
        }
    }

    const handleContainerClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files))
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Manifiestos
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Subir Manifiestos PDF</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div
                        onClick={handleContainerClick}
                        className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer hover:bg-muted/50 transition-colors relative"
                    >
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        {files.length > 0 ? (
                            <div className="text-center">
                                <FileText className="h-10 w-10 text-primary mx-auto mb-2" />
                                <p className="font-medium">{files.length} archivo(s) seleccionado(s)</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {files.map(f => f.name).join(', ').slice(0, 50)}
                                    {files.map(f => f.name).join(', ').length > 50 ? '...' : ''}
                                </p>
                                <p className="text-xs text-blue-500 mt-2">Clic para cambiar</p>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Upload className="h-10 w-10 mx-auto mb-2" />
                                <p>Haz clic para seleccionar uno o varios PDFs</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? `Subiendo ${files.length} archivo(s)...` : 'Subir e Indexar'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
