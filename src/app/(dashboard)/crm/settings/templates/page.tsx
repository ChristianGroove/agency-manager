"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, Zap, MessageSquare, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getTemplates, deleteTemplate, MessageTemplate } from "@/modules/core/messaging/template-actions"
import { TemplateBuilderSheet } from "@/modules/core/messaging/components/template-builder-sheet"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [filter, setFilter] = useState("")
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        setIsLoading(true)
        try {
            const data = await getTemplates()
            setTemplates(data)
        } catch (error) {
            toast.error("Error al cargar templates")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("¿Estás seguro de eliminar este template?")) return
        try {
            await deleteTemplate(id)
            setTemplates(templates.filter(t => t.id !== id))
            toast.success("Template eliminado")
        } catch (error) {
            toast.error("Error al eliminar")
        }
    }

    const handleEdit = (t: MessageTemplate) => {
        setEditingTemplate(t)
        setIsCreateOpen(true)
    }

    const handleNew = () => {
        setEditingTemplate(null)
        setIsCreateOpen(true)
    }

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(filter.toLowerCase()) ||
        t.category.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight">Plantillas de Mensajes</h3>
                    <p className="text-sm text-muted-foreground">Gestiona tus respuestas y mensajes automáticos aprobados por Meta.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar plantilla..."
                            className="pl-9"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleNew} className="bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Plantilla
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] border-2 border-dashed rounded-3xl bg-slate-50/50">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-medium">No tienes plantillas creadas</h3>
                    <p className="text-muted-foreground max-w-sm text-center mt-2 mb-6">
                        Comienza creando tu primera plantilla para estandarizar la comunicación con tus clientes.
                    </p>
                    <Button onClick={handleNew}>Crear Plantilla</Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-10">
                    {filteredTemplates.map(template => (
                        <Card
                            key={template.id}
                            onClick={() => handleEdit(template)}
                            className="group cursor-pointer hover:shadow-lg hover:border-green-400 transition-all duration-300 overflow-hidden border-slate-200"
                        >
                            <CardHeader className="pb-3 border-b bg-slate-50/50">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="font-mono text-sm text-slate-700 truncate w-48" title={template.name}>
                                            {template.name}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="text-[10px] font-normal lowercase bg-white border">
                                                {template.language}
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-medium border-0",
                                                    template.category === 'MARKETING' ? 'bg-purple-100 text-purple-700' :
                                                        template.category === 'UTILITY' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-orange-100 text-orange-700'
                                                )}
                                            >
                                                {template.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        template.status === 'APPROVED' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                            template.status === 'REJECTED' ? "bg-red-500" :
                                                "bg-yellow-400 animate-pulse"
                                    )} title={template.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="min-h-[60px]">
                                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                        {/* Fallback for preview content */}
                                        {template.components?.find(c => c.type === 'BODY')?.text || "Sin contenido de texto..."}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                                    <div className="flex gap-2">
                                        {template.components?.some(c => c.type === 'HEADER') && <FileText className="w-3.5 h-3.5" title="Multimedia" />}
                                        {template.components?.some(c => c.type === 'BUTTONS') && <Zap className="w-3.5 h-3.5" title="Botones" />}
                                    </div>
                                    <span className="capitalize text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">
                                        {template.status.toLowerCase()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <TemplateBuilderSheet
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                templateToEdit={editingTemplate}
                onSuccess={loadTemplates}
            />
        </div>
    )
}
