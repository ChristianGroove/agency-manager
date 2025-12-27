"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
    Loader2,
    FileText,
    Check,
    ChevronsUpDown,
    Sparkles,
    LayoutTemplate,
    User,
    ArrowRight
} from "lucide-react"
import { FullBriefingTemplate, BriefingTemplate, BriefingField } from "@/types/briefings"
import { getBriefingTemplates, createBriefing } from "@/lib/actions/briefings"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface CreateBriefingSheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function CreateBriefingSheet({
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger,
    onSuccess
}: CreateBriefingSheetProps) {
    const router = useRouter()
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Data
    const [templates, setTemplates] = useState<FullBriefingTemplate[]>([])
    const [clients, setClients] = useState<{ id: string, name: string, company_name?: string }[]>([])

    // Form State
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
    const [selectedClientId, setSelectedClientId] = useState<string>("none")

    // Computed
    const activeTemplate = templates.find(t => t.id === selectedTemplateId)

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open])

    const fetchData = async () => {
        if (templates.length > 0 && clients.length > 0) return // Cache simple

        setLoading(true)
        try {
            const { getCurrentOrganizationId } = await import('@/lib/actions/organizations')
            const orgId = await getCurrentOrganizationId()

            if (!orgId) {
                console.error('No organization context found')
                return
            }

            const [templatesData, clientsRes] = await Promise.all([
                getBriefingTemplates(),
                supabase
                    .from('clients')
                    .select('id, name, company_name')
                    .eq('organization_id', orgId)
                    .is('deleted_at', null)
                    .order('name')
            ])

            setTemplates(templatesData || [])
            setClients(clientsRes.data || [])
        } catch (error) {
            console.error("Error fetching dependencies:", error)
            toast.error("Error cargando plantillas")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!selectedTemplateId) {
            toast.error("Debes seleccionar una plantilla")
            return
        }

        setSubmitting(true)
        try {
            const finalClientId = selectedClientId === "none" ? null : selectedClientId
            await createBriefing(selectedTemplateId, finalClientId, null)

            toast.success("Briefing creado correctamente")
            setOpen(false)

            if (onSuccess) {
                onSuccess()
            } else {
                router.refresh()
            }

            // Allow animation to finish
            setTimeout(() => {
                setSelectedTemplateId("")
                setSelectedClientId("none")
            }, 300)

        } catch (error) {
            console.error(error)
            toast.error("Error al crear el briefing")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger && (
                <div onClick={() => setOpen(true)}>{trigger}</div>
            )}

            <SheetContent className="w-full max-w-[90vw] md:max-w-4xl p-0 overflow-hidden bg-white sm:rounded-l-2xl border-l shadow-2xl">
                <div className="flex h-full flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

                    {/* LEFT COLUMN: Controls */}
                    <div className="w-full md:w-[400px] flex flex-col bg-white h-full relative z-10">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <SheetTitle>Nuevo Briefing</SheetTitle>
                            </div>
                            <SheetDescription>
                                Genera un enlace único para recopilar información de tu cliente.
                            </SheetDescription>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-gray-400">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <p className="text-sm">Cargando plantillas...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Template Select */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <LayoutTemplate className="h-4 w-4 text-indigo-500" />
                                                Plantilla
                                            </Label>
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder="Selecciona una plantilla" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {templates.map((t) => (
                                                        <SelectItem key={t.id} value={t.id} className="cursor-pointer">
                                                            <div className="flex flex-col text-left py-1">
                                                                <span className="font-medium">{t.name}</span>
                                                                {t.description && (
                                                                    <span className="text-xs text-muted-foreground line-clamp-1 opacity-70">
                                                                        {t.description}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {activeTemplate && (
                                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mt-2">
                                                    <p className="text-xs text-indigo-700 leading-relaxed">
                                                        {activeTemplate.description || "Sin descripción"}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Badge variant="secondary" className="bg-white text-indigo-600 text-[10px] border-indigo-100">
                                                            {new Set(activeTemplate.structure?.map(f => f.step_title || 'General') || []).size} pasos
                                                        </Badge>
                                                        <Badge variant="secondary" className="bg-white text-indigo-600 text-[10px] border-indigo-100">
                                                            {activeTemplate.structure?.length || 0} campos
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Separator />

                                        {/* Client Select */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-emerald-500" />
                                                Cliente (Opcional)
                                            </Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between h-11",
                                                            !selectedClientId || selectedClientId === "none" ? "text-muted-foreground" : ""
                                                        )}
                                                    >
                                                        {selectedClientId && selectedClientId !== "none"
                                                            ? clients.find((c) => c.id === selectedClientId)?.name
                                                            : "-- Lead Nuevo (Enlace Público) --"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[340px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Buscar cliente..." />
                                                        <CommandList className="max-h-[250px] overflow-y-auto">
                                                            <CommandEmpty>No se encontró ningún cliente.</CommandEmpty>
                                                            <CommandGroup>
                                                                <CommandItem
                                                                    value="none"
                                                                    onSelect={() => setSelectedClientId("none")}
                                                                    className="cursor-pointer"
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedClientId === "none" ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    -- Lead Nuevo (Enlace Público) --
                                                                </CommandItem>
                                                                {clients.map((c) => (
                                                                    <CommandItem
                                                                        key={c.id}
                                                                        value={`${c.name} ${c.company_name || ''}`}
                                                                        onSelect={() => setSelectedClientId(c.id)}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                selectedClientId === c.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span>{c.name}</span>
                                                                            {c.company_name && (
                                                                                <span className="text-xs text-muted-foreground">{c.company_name}</span>
                                                                            )}
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <p className="text-[11px] text-gray-400 leading-tight">
                                                Si no seleccionas un cliente, podrás compartir el enlace púbicamente y asignar el cliente después.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Footer Actions */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 sticky bottom-0 z-20">
                            <Button
                                className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white h-11 shadow-md shadow-pink-200"
                                onClick={handleSubmit}
                                disabled={submitting || !selectedTemplateId || loading}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creando Briefing...
                                    </>
                                ) : (
                                    <>
                                        Generar Enlace
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Preview */}
                    <div className="flex-1 bg-gray-50/50 hidden md:block h-full overflow-hidden">
                        <div className="h-full flex flex-col">
                            <div className="p-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm sticky top-0">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Vista Previa del Formulario
                                </h3>
                            </div>

                            <ScrollArea className="flex-1 p-8">
                                {activeTemplate ? (
                                    <div className="max-w-xl mx-auto space-y-8 pb-20">
                                        {/* Mock Form Header */}
                                        <div className="text-center space-y-4 mb-10">
                                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-2">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <h1 className="text-2xl font-bold text-gray-900">{activeTemplate.name}</h1>
                                            {activeTemplate.description && (
                                                <p className="text-gray-500 text-sm max-w-md mx-auto">{activeTemplate.description}</p>
                                            )}
                                        </div>

                                        {/* Steps Preview */}
                                        {(() => {
                                            // Helper to group fields by step on the fly
                                            type GroupedStep = { id: string, title: string, fields: BriefingField[] };
                                            // We need to cast activeTemplate.structure to any[] or BriefingField[] if TS complains about specific props.

                                            const groupedSteps = (activeTemplate.structure || []).reduce<GroupedStep[]>((acc, field: any) => {
                                                const stepTitle = field.step_title || 'General Details';
                                                let step = acc.find(s => s.title === stepTitle);
                                                if (!step) {
                                                    step = { id: stepTitle, title: stepTitle, fields: [] };
                                                    acc.push(step);
                                                }
                                                step.fields.push(field);
                                                return acc;
                                            }, []);

                                            return groupedSteps.map((step, index: number) => (
                                                <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-90">
                                                    <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                                                        <Badge variant="outline" className="bg-white h-6 w-6 flex items-center justify-center p-0 rounded-full shrink-0">
                                                            {index + 1}
                                                        </Badge>
                                                        <h4 className="font-semibold text-gray-900 text-sm">{step.title}</h4>
                                                    </div>
                                                    <div className="p-4 space-y-4">
                                                        {step.fields?.map((field: any) => (
                                                            <div key={field.id} className="space-y-1.5 pointer-events-none select-none">
                                                                <div className="flex items-center justify-between">
                                                                    <Label className="text-xs text-gray-600">{field.label}</Label>
                                                                    {field.required && <span className="text-red-400 text-[10px]">*</span>}
                                                                </div>
                                                                {/* Mock Input based on type */}
                                                                <div className="h-9 w-full bg-gray-50 rounded-md border border-gray-100" />
                                                            </div>
                                                        ))}
                                                        {(!step.fields || step.fields.length === 0) && (
                                                            <p className="text-xs text-gray-400 italic text-center py-2">Sin campos en este paso</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 min-h-[400px]">
                                        <div className="p-4 bg-gray-100 rounded-full">
                                            <LayoutTemplate className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <p className="max-w-xs text-center text-sm">
                                            Selecciona una plantilla a la izquierda para ver su estructura y preguntas.
                                        </p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                </div>
            </SheetContent>
        </Sheet>
    )
}
