"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { FormTemplate, FormField } from "@/modules/features/forms/actions"
import { getFormTemplates, createFormSubmission, getContactOptions } from "@/modules/features/forms/actions"
import { supabase } from "@/modules/core/database/supabase"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
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

interface CreateFormSheetProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function CreateFormSheet({
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    trigger,
    onSuccess
}: CreateFormSheetProps) {
    const router = useRouter()
    // const supabase = createClientComponentClient() // Removed in favor of imported instance
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
    const [templates, setTemplates] = useState<FormTemplate[]>([])
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
            const { getCurrentOrganizationId } = await import("@/modules/core/organizations/organization-actions")
            const orgId = await getCurrentOrganizationId()

            if (!orgId) {
                console.error('No organization context found')
                return
            }

            const [templatesData, contactRes] = await Promise.all([
                getFormTemplates(),
                getContactOptions()
            ])
            
            setTemplates(templatesData || [])
            setClients(contactRes as any || [])
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
            await createFormSubmission(selectedTemplateId, finalClientId, null)

            toast.success("Formulario creado correctamente")
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
            toast.error("Error al crear")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger && (
                <div onClick={() => setOpen(true)}>{trigger}</div>
            )}

            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>Nuevo Formulario</SheetTitle>
                    <SheetDescription>Genera un enlace único para recopilar información.</SheetDescription>
                </SheetHeader>
                <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">

                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Nuevo Formulario</SheetTitle>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Genera un enlace único para recopilar información.</p>
                            </div>
                        </div>
                    </div>

                    {/* Split View Grid */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-x divide-slate-200/80 dark:divide-white/5">

                            {/* LEFT: Form (5/12) */}
                            <div className="lg:col-span-5 overflow-y-auto p-8 h-full relative scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800 bg-white/50 dark:bg-transparent">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-slate-400 dark:text-zinc-500">
                                        <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
                                        <p className="text-sm font-semibold">Cargando plantillas...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Template Select */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                                                <LayoutTemplate className="h-4 w-4 text-brand-pink" />
                                                Plantilla
                                            </Label>
                                            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                                                <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs">
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
                                                <div className="bg-brand-pink/10 dark:bg-brand-pink/20 p-4 rounded-2xl border border-brand-pink/30 mt-2 space-y-2">
                                                    <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-medium">
                                                        {activeTemplate.description || "Sin descripción"}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-white dark:bg-zinc-800 text-brand-pink text-[10px] border-none font-bold">
                                                            {new Set(activeTemplate.structure?.map(f => f.step_title || 'General') || []).size} pasos
                                                        </Badge>
                                                        <Badge variant="secondary" className="bg-white dark:bg-zinc-800 text-brand-pink text-[10px] border-none font-bold">
                                                            {activeTemplate.structure?.length || 0} campos
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <Separator className="dark:bg-white/5" />

                                        {/* Client Select */}
                                        <div className="space-y-3">
                                            <Label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                                                <User className="h-4 w-4 text-emerald-500" />
                                                Cliente (Opcional)
                                            </Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between h-11 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white rounded-xl shadow-xs",
                                                            !selectedClientId || selectedClientId === "none" ? "text-slate-400 dark:text-zinc-500" : ""
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
                                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                                                Si no seleccionas un cliente, podrás compartir el enlace públicamente y asignar el cliente después.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="h-24"></div> {/* Spacer */}
                            </div>

                            {/* RIGHT: Preview (7/12) */}
                            <div className="hidden lg:flex lg:col-span-7 bg-slate-50/70 dark:bg-zinc-900/30 p-8 flex-col relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-50 pointer-events-none" />

                                <div className="relative z-10 h-full flex flex-col">
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-brand-pink" />Vista Previa del Formulario
                                        </h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
                                        {activeTemplate ? (
                                            <div className="max-w-xl mx-auto space-y-8 pb-20">
                                                {/* Mock Form Header */}
                                                <div className="text-center space-y-4 mb-10">
                                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-pink/10 text-brand-pink mb-2 shadow-sm">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{activeTemplate.name}</h1>
                                                    {activeTemplate.description && (
                                                        <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-md mx-auto">{activeTemplate.description}</p>
                                                    )}
                                                </div>

                                                {/* Steps Preview */}
                                                {(() => {
                                                    // Helper to group fields by step on the fly
                                                    type GroupedStep = { id: string, title: string, fields: FormField[] };

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
                                                        <div key={index} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden opacity-95">
                                                            <div className="bg-slate-50 dark:bg-zinc-800/50 px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-3">
                                                                <Badge variant="outline" className="bg-white dark:bg-zinc-900 h-6 w-6 flex items-center justify-center p-0 rounded-full shrink-0 font-bold border-slate-200 dark:border-zinc-700">
                                                                    {index + 1}
                                                                </Badge>
                                                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{step.title}</h4>
                                                            </div>
                                                            <div className="p-4 space-y-4">
                                                                {step.fields?.map((field: any) => (
                                                                    <div key={field.id} className="space-y-1.5 pointer-events-none select-none">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-xs text-slate-600 dark:text-zinc-300 font-medium">{field.label}</Label>
                                                                            {field.required && <span className="text-red-400 text-[10px]">*</span>}
                                                                        </div>
                                                                        {/* Mock Input based on type */}
                                                                        <div className="h-9 w-full bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60" />
                                                                    </div>
                                                                ))}
                                                                {(!step.fields || step.fields.length === 0) && (
                                                                    <p className="text-xs text-slate-400 italic text-center py-2">Sin campos en este paso</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 space-y-4 min-h-[400px]">
                                                <div className="p-4 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl">
                                                    <LayoutTemplate className="h-8 w-8 text-slate-300 dark:text-zinc-600" />
                                                </div>
                                                <p className="max-w-xs text-center text-sm font-medium">
                                                    Selecciona una plantilla a la izquierda para ver su estructura y preguntas.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || !selectedTemplateId || loading}
                            className="bg-brand-pink text-white hover:bg-brand-pink/90 shadow-xl shadow-brand-pink/20 px-8 rounded-xl h-11 cursor-pointer font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creando...
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
            </SheetContent>
        </Sheet>
    )
}


