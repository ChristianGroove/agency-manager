"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Sparkles, Image as ImageIcon, Type, Link as LinkIcon, Phone, Plus, Trash2, HelpCircle, Video } from "lucide-react"
import { createTemplate, updateTemplate, TemplateComponent, TemplateCategory, MessageTemplate } from "../template-actions"
import { WhatsAppPreview } from "./whatsapp-preview"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TemplateBuilderSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    templateToEdit?: MessageTemplate | null
    onSuccess?: () => void
}

const formSchema = z.object({
    name: z.string().min(1, "Nombre requerido").regex(/^[a-z0-9_]+$/, "Solo minúsculas y guiones bajos (format_meta)"),
    category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
    language: z.string().default('es'),
})

export function TemplateBuilderSheet({ open, onOpenChange, templateToEdit, onSuccess }: TemplateBuilderSheetProps) {
    const [isLoading, setIsLoading] = useState(false)

    // Complex State for Components
    const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'MEDIA'>('NONE')
    const [headerFormat, setHeaderFormat] = useState<'IMAGE' | 'VIDEO' | 'DOCUMENT' | null>(null)
    const [headerText, setHeaderText] = useState("")

    const [bodyText, setBodyText] = useState("")

    const [footerText, setFooterText] = useState("")

    const [buttons, setButtons] = useState<Array<{ type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER', text: string, url?: string, phone_number?: string }>>([])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            category: 'MARKETING',
            language: 'es'
        }
    })

    // Reset or Load Template
    useEffect(() => {
        if (open) {
            if (templateToEdit) {
                // Populate Logic
                form.reset({
                    name: templateToEdit.name,
                    category: templateToEdit.category,
                    language: templateToEdit.language
                })

                // Parse components
                const safeComponents = templateToEdit.components || []
                const header = safeComponents.find(c => c.type === 'HEADER')
                const body = safeComponents.find(c => c.type === 'BODY')
                const footer = safeComponents.find(c => c.type === 'FOOTER')
                const btns = safeComponents.find(c => c.type === 'BUTTONS')

                if (header) {
                    if (header.format === 'TEXT') {
                        setHeaderType('TEXT')
                        setHeaderText(header.text || "")
                    } else {
                        setHeaderType('MEDIA')
                        setHeaderFormat(header.format as any)
                    }
                } else {
                    setHeaderType('NONE')
                }

                setBodyText(body?.text || "")
                setFooterText(footer?.text || "")
                setButtons(btns?.buttons || [])
            } else {
                // Reset
                form.reset({ name: "", category: "MARKETING", language: "es" })
                setHeaderType('NONE')
                setHeaderFormat(null)
                setHeaderText("")
                setBodyText("")
                setFooterText("")
                setButtons([])
            }
        }
    }, [open, templateToEdit, form])

    // Construct JSON for Preview and Submit
    const constructComponents = (): TemplateComponent[] => {
        const components: TemplateComponent[] = []

        // HEADER
        if (headerType === 'TEXT' && headerText) {
            components.push({ type: 'HEADER', format: 'TEXT', text: headerText })
        } else if (headerType === 'MEDIA' && headerFormat) {
            components.push({ type: 'HEADER', format: headerFormat })
        }

        // BODY
        if (bodyText) {
            components.push({ type: 'BODY', format: 'TEXT', text: bodyText })
        }

        // FOOTER
        if (footerText) {
            components.push({ type: 'FOOTER', format: 'TEXT', text: footerText })
        }

        // BUTTONS
        if (buttons.length > 0) {
            components.push({ type: 'BUTTONS', buttons: buttons })
        }

        return components
    }

    const currentComponents = constructComponents()

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (!bodyText) return toast.error("El cuerpo del mensaje es obligatorio")

        setIsLoading(true)
        try {
            const payload = {
                ...values,
                components: currentComponents
            }

            if (templateToEdit) {
                await updateTemplate(templateToEdit.id, payload)
                toast.success("Template actualizado")
            } else {
                await createTemplate(payload)
                toast.success("Template creado")
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    // Helper: Add Button
    const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
        if (buttons.length >= 3) return toast.warning("Máximo 3 botones permitidos")
        setButtons([...buttons, { type, text: "" }])
    }

    const removeButton = (index: number) => {
        const newBtns = [...buttons]
        newBtns.splice(index, 1)
        setButtons(newBtns)
    }

    const updateButton = (index: number, key: string, value: string) => {
        const newBtns = [...buttons]
        // @ts-ignore
        newBtns[index][key] = value
        setButtons(newBtns)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-6xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row
                "
            >
                {/* LEFT: FORM (Scrollable) */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 border-r">
                    {/* Header */}
                    <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
                        <div>
                            <SheetTitle className="text-lg font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-500" />
                                {templateToEdit ? 'Editar Template' : 'Nuevo Template'}
                            </SheetTitle>
                            <SheetDescription className="hidden">Constructor de Mensajes</SheetDescription>
                        </div>

                    </div>

                    {/* Form Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
                        <Form {...form}>
                            <form className="space-y-6">
                                {/* General Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre (ID)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="ej. welcome_discount_v1" className="bg-slate-50 font-mono text-sm" />
                                                </FormControl>
                                                <p className="text-[10px] text-muted-foreground">Solo minúsculas y _</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="MARKETING">Marketing (Promociones)</SelectItem>
                                                        <SelectItem value="UTILITY">Utility (Confirmaciones)</SelectItem>
                                                        <SelectItem value="AUTHENTICATION">Authentication (OTP)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="h-px bg-slate-100" />

                                {/* STRUCTURE BUILDER */}
                                <div className="space-y-4">
                                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Estructura del Mensaje</Label>

                                    <Accordion type="single" collapsible defaultValue="body" className="w-full">

                                        {/* HEADER */}
                                        <AccordionItem value="header" className="border rounded-xl px-4 shadow-sm mb-2 bg-white">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Cabecera (Opcional)</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                                <div className="flex gap-2">
                                                    {['NONE', 'TEXT', 'MEDIA'].map((t) => (
                                                        <div
                                                            key={t}
                                                            onClick={() => setHeaderType(t as any)}
                                                            className={`
                                                                flex-1 py-2 px-3 rounded-lg border text-center text-xs cursor-pointer transition-colors font-medium
                                                                ${headerType === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50'}
                                                            `}
                                                        >
                                                            {t === 'NONE' ? 'Ninguna' : t === 'TEXT' ? 'Texto' : 'Multimedia'}
                                                        </div>
                                                    ))}
                                                </div>

                                                {headerType === 'TEXT' && (
                                                    <div className="space-y-2">
                                                        <Label>Texto de Cabecera</Label>
                                                        <Input
                                                            value={headerText}
                                                            onChange={e => setHeaderText(e.target.value)}
                                                            maxLength={60}
                                                            placeholder="ej. ¡Oferta Especial!"
                                                        />
                                                        <p className="text-right text-[10px] text-muted-foreground">{headerText.length}/60</p>
                                                    </div>
                                                )}

                                                {headerType === 'MEDIA' && (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {['IMAGE', 'VIDEO', 'DOCUMENT'].map((f) => (
                                                            <div
                                                                key={f}
                                                                onClick={() => setHeaderFormat(f as any)}
                                                                className={`
                                                                    py-3 rounded-lg border flex flex-col items-center justify-center gap-1 cursor-pointer
                                                                    ${headerFormat === f ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'hover:bg-slate-50'}
                                                                `}
                                                            >
                                                                {f === 'IMAGE' && <ImageIcon className="w-4 h-4" />}
                                                                {f === 'VIDEO' && <Video className="w-4 h-4" />}
                                                                {/* @ts-ignore */}
                                                                {f === 'DOCUMENT' && <Type className="w-4 h-4" />}
                                                                <span className="text-[10px] font-medium">{f === 'IMAGE' ? 'Imagen' : f === 'VIDEO' ? 'Video' : 'Doc'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* BODY */}
                                        <AccordionItem value="body" className="border rounded-xl px-4 shadow-sm mb-2 bg-white data-[state=open]:ring-1 ring-blue-500/20">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                                                        <Type className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Cuerpo del Mensaje</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                                <div className="relative">
                                                    <Textarea
                                                        value={bodyText}
                                                        onChange={e => setBodyText(e.target.value)}
                                                        className="min-h-[120px] resize-none text-base leading-relaxed p-4 bg-slate-50"
                                                        placeholder="Hola {{1}}, gracias por tu compra..."
                                                    />

                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Usa {'{{1}}'}, {'{{2}}'} para variables.</span>
                                                    <div className="flex items-center gap-2">
                                                        <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] bg-slate-100" onClick={() => setBodyText(prev => prev + ' {{1}}')}>
                                                            + Variable
                                                        </Button>
                                                        <Button type="button" size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setBodyText(prev => prev + ' *negrita* ')}>
                                                            B
                                                        </Button>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* FOOTER */}
                                        <AccordionItem value="footer" className="border rounded-xl px-4 shadow-sm mb-2 bg-white">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                                                        <Type className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Pie de Página (Opcional)</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4">
                                                <Input
                                                    value={footerText}
                                                    onChange={e => setFooterText(e.target.value)}
                                                    placeholder="ej. Enviado por Agency Manager"
                                                    maxLength={60}
                                                />
                                            </AccordionContent>
                                        </AccordionItem>

                                        {/* BUTTONS */}
                                        <AccordionItem value="buttons" className="border rounded-xl px-4 shadow-sm mb-2 bg-white">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-orange-50 rounded-md text-orange-600">
                                                        <LinkIcon className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-sm">Botones (Máx 3)</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pt-2 pb-4 space-y-4">
                                                {buttons.map((btn, idx) => (
                                                    <div key={idx} className="p-3 border rounded-lg space-y-3 bg-slate-50 relative group">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="absolute top-2 right-2 h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600"
                                                            onClick={() => removeButton(idx)}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>

                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[10px]">
                                                                {btn.type === 'QUICK_REPLY' ? 'Respuesta Rápida' : btn.type === 'URL' ? 'Enlace' : 'Teléfono'}
                                                            </Badge>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Input
                                                                value={btn.text}
                                                                onChange={e => updateButton(idx, 'text', e.target.value)}
                                                                placeholder="Texto del botón"
                                                                className="h-8 text-sm"
                                                                maxLength={25}
                                                            />

                                                            {btn.type === 'URL' && (
                                                                <Input
                                                                    value={btn.url}
                                                                    onChange={e => updateButton(idx, 'url', e.target.value)}
                                                                    placeholder="https://..."
                                                                    className="h-8 text-sm font-mono"
                                                                />
                                                            )}
                                                            {btn.type === 'PHONE_NUMBER' && (
                                                                <Input
                                                                    value={btn.phone_number}
                                                                    onChange={e => updateButton(idx, 'phone_number', e.target.value)}
                                                                    placeholder="+52..."
                                                                    className="h-8 text-sm font-mono"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}

                                                {buttons.length < 3 && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button type="button" size="sm" variant="outline" onClick={() => addButton('QUICK_REPLY')} className="flex-1 text-xs">
                                                            + Rápida
                                                        </Button>
                                                        <Button type="button" size="sm" variant="outline" onClick={() => addButton('URL')} className="flex-1 text-xs">
                                                            + Enlace
                                                        </Button>
                                                        <Button type="button" size="sm" variant="outline" onClick={() => addButton('PHONE_NUMBER')} className="flex-1 text-xs">
                                                            + Teléfono
                                                        </Button>
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </form>
                        </Form>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t bg-slate-50 flex items-center justify-between shrink-0">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-red-500">
                            Cancelar
                        </Button>

                        <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold shadow-sm">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Guardar Template
                        </Button>
                    </div>
                </div>

                {/* RIGHT: PREVIEW (Fixed) */}
                <div className="w-[450px] shrink-0 bg-[#F0F2F5] dark:bg-[#0b141a] flex flex-col items-center justify-center p-8 border-l relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, gray 1px, transparent 0)', backgroundSize: '20px 20px' }}
                    />

                    <div className="relative z-10 flex flex-col items-center gap-6">
                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur px-4 py-2 rounded-full text-xs font-medium text-slate-500 shadow-sm border">
                            Vista Previa en Vivo
                        </div>

                        <div className="scale-110 origin-center transition-all duration-500">
                            <WhatsAppPreview components={currentComponents} />
                        </div>

                        <div className="text-center max-w-[280px]">
                            <p className="text-[10px] text-muted-foreground mt-4">
                                Esta vista es una aproximación. El diseño final puede variar ligeramente según el dispositivo del usuario (iOS/Android).
                            </p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
