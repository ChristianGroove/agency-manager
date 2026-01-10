'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
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
                        status: 'new'
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
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 dark:bg-zinc-900/80 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                <FileDown className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white">Importar Leads</SheetTitle>
                                <SheetDescription>Carga masiva de prospectos vía CSV</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-gray-200 dark:border-zinc-700 shadow-sm">
                            <div className="text-center space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-zinc-700/50 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-slate-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Sube tu archivo CSV</h3>
                                    <p className="text-sm text-gray-500 mt-1">Arrastra y suelta o selecciona un archivo</p>
                                </div>
                                <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                                    <Input
                                        id="csv_file"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="cursor-pointer file:bg-blue-50 file:text-blue-600 file:border-0 file:rounded-lg file:px-4 file:py-2 file:mr-4 file:font-semibold hover:file:bg-blue-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/20">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-2 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Instrucciones
                            </h4>
                            <ul className="text-sm text-blue-800 dark:text-blue-400 list-disc ml-4 space-y-1">
                                <li>Descarga la plantilla para ver el formato correcto.</li>
                                <li>Asegúrate de que los encabezados coincidan.</li>
                                <li>Las columnas requeridas son opcionales pero recomendadas.</li>
                            </ul>
                            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full mt-4 bg-white dark:bg-zinc-800 border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <FileDown className="mr-2 h-4 w-4" />
                                Descargar Plantilla CSV
                            </Button>
                        </div>

                        {importing && (
                            <div className="space-y-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-200 dark:border-zinc-700">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Procesando archivo...</span>
                                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    Procesando {progress.current} de {progress.total}... ({progress.errors} errores)
                                </p>
                            </div>
                        )}

                        {file && !importing && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-400">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                    <FileDown className="h-4 w-4" />
                                </div>
                                <div className="flex-1 truncate font-medium">{file.name}</div>
                            </div>
                        )}
                    </div>

                    <SheetFooter className="p-6 bg-white/80 dark:bg-zinc-800/80 border-t border-gray-100 dark:border-white/5 backdrop-blur-md flex flex-row justify-between gap-3 sm:space-x-0">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 dark:shadow-none"
                        >
                            {importing ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Iniciar Importación
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    )
}
