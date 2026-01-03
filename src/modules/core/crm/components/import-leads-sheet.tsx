'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileDown, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { parse } from 'papaparse'
import { createLead } from '../leads-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions' // Cannot use server action in client directly like this for validation?
// Actually createLead handles org ID. I just need to parse CSV and call createLead for each row.

interface ImportLeadsSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function ImportLeadsSheet({ open, onOpenChange, onSuccess }: ImportLeadsSheetProps) {
    const [file, setFile] = useState<File | null>(null)
    const [importing, setImporting] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0, errors: 0 })

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleImport = async () => {
        if (!file) return

        setImporting(true)
        setProgress({ current: 0, total: 0, errors: 0 })

        parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data as any[]
                setProgress(p => ({ ...p, total: rows.length }))

                let successCount = 0
                let errorCount = 0

                for (const row of rows) {
                    // Map CSV columns to Lead fields
                    // Expected format: Name, Email, Phone, Company, Source, Notes, Tags
                    // Adjust as needed
                    const leadData = {
                        name: row['Name'] || row['Nombre'] || 'Sin Nombre',
                        email: row['Email'] || row['Correo'] || undefined,
                        phone: row['Phone'] || row['Telefono'] || row['Teléfono'] || undefined,
                        company_name: row['Company'] || row['Empresa'] || undefined,
                        notes: row['Notes'] || row['Notas'] || undefined,
                        source: row['Source'] || row['Fuente'] || undefined,
                        tags: (row['Tags'] || row['Etiquetas'])
                            ? (row['Tags'] || row['Etiquetas']).split(',').map((t: string) => t.trim())
                            : [],
                        status: 'new' // Default status
                    }

                    if (!leadData.name) {
                        errorCount++
                        continue
                    }

                    try {
                        const res = await createLead(leadData)
                        if (res.success) {
                            successCount++
                        } else {
                            errorCount++
                            console.error('Error importing row:', row, res.error)
                        }
                    } catch (e) {
                        errorCount++
                        console.error('Error importing row:', row, e)
                    }

                    setProgress({ current: successCount + errorCount, total: rows.length, errors: errorCount })
                }

                toast.success(`Importación completada: ${successCount} importados, ${errorCount} errores.`)
                setImporting(false)
                setFile(null)
                onOpenChange(false)
                onSuccess()
            },
            error: (error) => {
                console.error('CSV Parse Error:', error)
                toast.error('Error al leer el archivo CSV')
                setImporting(false)
            }
        })
    }

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Email,Phone,Company,Source,Notes,Tags\nEjemplo Lead,ejemplo@email.com,123456789,Empresa Demo,website,Notas del prospecto,\"vip, nuevo\""
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "leads_template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Importar Leads desde CSV</DialogTitle>
                    <DialogDescription>
                        Sube un archivo CSV con tus leads. Asegúrate de usar la plantilla.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar Plantilla CSV
                        </Button>
                    </div>

                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="csv_file">Archivo CSV</Label>
                        <Input id="csv_file" type="file" accept=".csv" onChange={handleFileChange} />
                    </div>

                    {importing && (
                        <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-muted-foreground">
                                Procesando {progress.current} de {progress.total}... ({progress.errors} errores)
                            </p>
                        </div>
                    )}

                    {file && !importing && (
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm text-slate-600">
                            <Upload className="h-4 w-4" />
                            <span className="truncate">{file.name}</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!file || importing}>
                        {importing ? 'Importando...' : 'Importar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
