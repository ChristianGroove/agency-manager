
'use client'

import { useEffect, useState } from "react"
import { CRMTemplate } from "../templates/types"
import { getAvailableTemplatesAction, applyTemplateAction } from "../templates/actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function TemplateSelector() {
    const [templates, setTemplates] = useState<CRMTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null) // For confirmation dialog

    useEffect(() => {
        getAvailableTemplatesAction().then(data => {
            setTemplates(data)
            setLoading(false)
        })
    }, [])

    const handleApply = async () => {
        if (!selectedTemplate) return

        setApplying(selectedTemplate)
        try {
            await applyTemplateAction(selectedTemplate)
            toast.success("Plantilla Aplicada: Tu pipeline de CRM se ha actualizado correctamente.")
        } catch (error) {
            toast.error("Error: No se pudo aplicar la plantilla. Inténtalo de nuevo.")
        } finally {
            setApplying(null)
            setSelectedTemplate(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(template => (
                    <Card
                        key={template.id}
                        className={`flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border-muted/60 dark:border-white/10 ${template.industry === 'agency' ? 'border-primary/40 dark:border-primary/40 ring-1 ring-primary/20' : ''
                            }`}
                    >
                        {/* Gradient Background Decoration */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <CardHeader className="relative pb-2">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm shadow-sm">{template.industry}</Badge>
                                {template.industry === 'agency' && (
                                    <Badge className="bg-primary/90 text-primary-foreground shadow-sm">Recomendado</Badge>
                                )}
                            </div>
                            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                                {template.name}
                            </CardTitle>
                            <CardDescription className="text-sm line-clamp-2 mt-1">
                                {template.description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex-1 relative space-y-4 pt-2">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                                    Estados del Pipeline
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {template.pipelineStages.slice(0, 5).map(stage => (
                                        <div
                                            key={stage.key}
                                            className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 border border-muted text-[10px] font-medium text-muted-foreground"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${stage.color.replace('bg-', 'bg-')}`} />
                                            {stage.name}
                                        </div>
                                    ))}
                                    {template.pipelineStages.length > 5 && (
                                        <span className="text-[10px] text-muted-foreground self-center px-1">
                                            +{template.pipelineStages.length - 5} más
                                        </span>
                                    )}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="relative pt-2 pb-6">
                            <Button
                                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-all duration-300"
                                size="lg"
                                disabled={!!applying}
                                onClick={() => setSelectedTemplate(template.id)}
                            >
                                {applying === template.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Usar esta Plantilla
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <AlertDialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Aplicar Plantilla CRM?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-muted-foreground">
                                Esto re-configurará tu Pipeline de Ventas con nuevos estados y reglas de automatización.
                                Los leads existentes deberán ser reasignados si sus estados actuales dejan de existir.
                                <br /><br />
                                <div className="flex items-center p-2 bg-yellow-50 text-yellow-800 rounded text-xs">
                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                    Recomendado para nuevas organizaciones o reinicios completos.
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApply}>Confirmar y Aplicar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
