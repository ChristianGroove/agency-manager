"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CATALOG_TEMPLATES } from "./templates/data"
import { seedCatalogFromTemplate } from "./actions"
import { toast } from "sonner"
import { Loader2, Download, Package } from "lucide-react"

interface TemplateImporterProps {
    onSuccess: () => void
}

export function TemplateImporter({ onSuccess }: TemplateImporterProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<string>("")

    const handleImport = async () => {
        if (!selectedTemplate) return

        setLoading(true)
        try {
            await seedCatalogFromTemplate(selectedTemplate)
            toast.success("Plantilla importada correctamente")
            setOpen(false)
            onSuccess()
        } catch (error) {
            console.error(error)
            toast.error("Error al importar plantilla")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 rounded-xl h-10 px-4 text-xs font-semibold gap-2">
                    <Download className="h-4 w-4" />
                    Importar Plantilla
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Importar Catálogo</DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Selecciona una plantilla predefinida para poblar tu catálogo rápidamente.</DialogDescription>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-4">
                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                            <SelectTrigger className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white text-xs">
                                <SelectValue placeholder="Seleccionar plantilla..." />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                                {CATALOG_TEMPLATES.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        <span className="font-semibold text-xs">{t.name}</span>
                                        <p className="text-[10px] text-muted-foreground dark:text-gray-400">{t.items.length} servicios incluidos</p>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedTemplate && (
                            <div className="text-xs bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10 text-slate-600 dark:text-gray-300 leading-relaxed">
                                {CATALOG_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                            </div>
                        )}
                    </div>

                    {/* Sticky Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                        <Button variant="ghost" className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold" onClick={() => setOpen(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!selectedTemplate || loading}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-brand-pink/20 px-8 rounded-xl h-11 font-bold cursor-pointer transition-all"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Importar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
