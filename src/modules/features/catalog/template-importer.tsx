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
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Importar Plantilla
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-600" />
                        Importar Catálogo
                    </DialogTitle>
                    <DialogDescription>
                        Selecciona una plantilla predefinida para poblar tu catálogo rápidamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar plantilla..." />
                        </SelectTrigger>
                        <SelectContent>
                            {CATALOG_TEMPLATES.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                    <span className="font-semibold">{t.name}</span>
                                    <p className="text-xs text-muted-foreground">{t.items.length} servicios incluidos</p>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedTemplate && (
                        <div className="text-sm bg-slate-50 p-3 rounded-md text-slate-600">
                            {CATALOG_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!selectedTemplate || loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
