"use client"

import { useState, useEffect, useTransition } from "react"
import { getQuoteSettings, updateQuoteSettings, QuoteSettings } from "@/modules/core/crm/quote-settings"
import { INDUSTRY_TEMPLATES } from "@/modules/core/crm/templates"
import { generateQuoteCopy } from "@/modules/core/ai-engine/actions/generate-quote-copy"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Palette, MessageSquare, Briefcase, Zap, PaintBucket, Save, Sparkles, RotateCcw, Home, Scale, Monitor, GraduationCap, Plane, PartyPopper, Truck, Lightbulb, Calendar } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface QuoteDesignerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId?: string
}

const ICONS_MAP: Record<string, any> = {
    Briefcase, Zap, Calendar, Home, Scale, Monitor, GraduationCap, Plane, PartyPopper, Truck, Lightbulb
}

export function QuoteDesignerSheet({ open, onOpenChange, organizationId }: QuoteDesignerSheetProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<QuoteSettings | null>(null)
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        if (open) {
            loadSettings()
        }
    }, [open])

    const loadSettings = async () => {
        setLoading(true)
        const res = await getQuoteSettings(organizationId)
        if (res.success && res.settings) {
            setSettings(res.settings)
        } else {
            toast.error("Error al cargar configuración: " + (res.error || ""))
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        const res = await updateQuoteSettings(settings)
        if (res.success) {
            toast.success("Diseño guardado", { description: "Tus cotizaciones ahora lucen fabulosas." })
            onOpenChange(false)
        } else {
            toast.error("Error al guardar")
        }
        setSaving(false)
    }

    const setVertical = (templateId: string) => {
        if (!settings) return
        const template = INDUSTRY_TEMPLATES.find(t => t.id === templateId)
        if (!template) return

        setSettings({
            ...settings,
            vertical: template.id,
            approve_label: template.approve_label,
            reject_label: template.reject_label,
            actions_config: {
                ...settings.actions_config,
                reject: {
                    ...settings.actions_config.reject,
                    reasons: template.reject_reasons,
                    acknowledgment_message: template.ack_msg || settings.actions_config.reject.acknowledgment_message
                }
            },
            template_config: {
                header: template.header,
                footer: template.footer
            }
        })
        toast.success(`Plantilla "${template.label}" aplicada`)
    }

    const handleReset = () => {
        if (!settings) return
        if (confirm("¿Restaurar valores predeterminados para esta plantilla?")) {
            setVertical(settings.vertical)
        }
    }

    const handleAICopy = (field: 'header' | 'footer') => {
        if (!settings) return
        startTransition(async () => {
            toast.info(`Generando ${field} con IA...`)
            const res = await generateQuoteCopy(settings, field)
            if (res.success && res.text) {
                setSettings(prev => prev ? ({
                    ...prev,
                    template_config: {
                        ...prev.template_config,
                        [field]: res.text
                    }
                }) : null)
                toast.success("Texto generado", { description: "Puedes editarlo si lo deseas." })
            } else {
                toast.error("Error AI: " + res.error)
            }
        })
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-4xl w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl">
                    {/* Header Fixed */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/40 backdrop-blur-md border-b border-black/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-pink-100 rounded-lg text-pink-700">
                                <Palette className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">Quote Designer 2.0 🎨</SheetTitle>
                                <SheetDescription>
                                    Personalización avanzada por industria con IA.
                                </SheetDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={handleReset}
                                disabled={saving || loading}
                                title="Restaurar valores de plantilla"
                            >
                                <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="bg-black text-white hover:bg-gray-800 rounded-xl shadow-lg shadow-black/10"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative scrollbar-thin scrollbar-thumb-gray-200">
                        {loading || !settings ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                            </div>
                        ) : (
                            <Tabs defaultValue="vertical" className="space-y-6">
                                <TabsList className="bg-white border w-full justify-start p-1 h-auto flex-wrap sticky top-0 z-10 shadow-sm">
                                    <TabsTrigger value="vertical">1. Industria & Plantilla</TabsTrigger>
                                    <TabsTrigger value="buttons">2. Botones & Acciones</TabsTrigger>
                                    <TabsTrigger value="template">3. Diseño Visual (IA)</TabsTrigger>
                                </TabsList>

                                {/* --- VERTICAL GRID --- */}
                                <TabsContent value="vertical" className="animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {INDUSTRY_TEMPLATES.map((template) => {
                                            const Icon = ICONS_MAP[template.icon] || Briefcase
                                            const isSelected = settings.vertical === template.id

                                            // Dynamic Colors for selection
                                            const colorClass = isSelected
                                                ? `border-${template.color}-500 bg-${template.color}-50`
                                                : `border-gray-100 bg-white hover:border-${template.color}-200`

                                            return (
                                                <div
                                                    key={template.id}
                                                    onClick={() => setVertical(template.id)}
                                                    className={cn(
                                                        "cursor-pointer border-2 rounded-xl p-4 flex flex-col gap-3 transition-all relative overflow-hidden group",
                                                        isSelected ? `border-pink-500 bg-pink-50/50 shadow-md` : "border-gray-100 bg-white hover:shadow-md hover:-translate-y-1"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", `bg-${template.color}-100 text-${template.color}-600`)}>
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        {isSelected && <div className="h-3 w-3 rounded-full bg-pink-500 animate-pulse" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors">{template.label}</h3>
                                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                            "{template.header}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </TabsContent>

                                {/* --- BUTTONS --- */}
                                <TabsContent value="buttons" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Etiquetas de Acción</CardTitle>
                                                <CardDescription>Cta principal y secundaria.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid gap-2">
                                                    <Label>Botón de Aprobar (Texto + Emoji)</Label>
                                                    <Input
                                                        value={settings.approve_label}
                                                        onChange={(e) => setSettings({ ...settings, approve_label: e.target.value })}
                                                        className="font-bold text-green-700 border-green-200 bg-green-50"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Botón de Rechazar</Label>
                                                    <Input
                                                        value={settings.reject_label}
                                                        onChange={(e) => setSettings({ ...settings, reject_label: e.target.value })}
                                                        className="font-bold text-red-700 border-red-200 bg-red-50"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <CardTitle>Rechazo Inteligente</CardTitle>
                                                        <CardDescription>Opciones para salvar la venta.</CardDescription>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => handleReset()} className="text-xs">
                                                        <RotateCcw className="h-3 w-3 mr-1" /> Reset
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Razones de Rechazo</Label>
                                                    <Input
                                                        value={settings.actions_config.reject.reasons.join(', ')}
                                                        onChange={(e) => {
                                                            const reasons = e.target.value.split(',').map(s => s.trim())
                                                            setSettings({
                                                                ...settings,
                                                                actions_config: {
                                                                    ...settings.actions_config,
                                                                    reject: { ...settings.actions_config.reject, reasons }
                                                                }
                                                            })
                                                        }}
                                                    />
                                                    <p className="text-xs text-muted-foreground">Separadas por coma.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mensaje de Agradecimiento/Cierre</Label>
                                                    <Input
                                                        value={settings.actions_config.reject.acknowledgment_message || ''}
                                                        onChange={(e) => {
                                                            setSettings({
                                                                ...settings,
                                                                actions_config: {
                                                                    ...settings.actions_config,
                                                                    reject: {
                                                                        ...settings.actions_config.reject,
                                                                        acknowledgment_message: e.target.value
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>

                                {/* --- TEMPLATE --- */}
                                <TabsContent value="template" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-4 flex gap-3 text-sm text-blue-800">
                                        <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
                                        <p>Usa el botón mágico para que la IA redacte un texto persuasivo basado en tu industria ({settings.vertical}) y configuración actual.</p>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Estructura del Mensaje</CardTitle>
                                            <CardDescription>Personaliza los textos fijos.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-6">
                                            <div className="grid gap-2">
                                                <Label className="flex justify-between items-center">
                                                    Encabezado (Header)
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                                        onClick={() => handleAICopy('header')}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                                        Refinar con IA
                                                    </Button>
                                                </Label>
                                                <Input
                                                    value={settings.template_config.header}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        template_config: { ...settings.template_config, header: e.target.value }
                                                    })}
                                                    className="font-bold border-l-4 border-l-pink-500"
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="flex justify-between items-center">
                                                    Pie de Página (Footer)
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
                                                        onClick={() => handleAICopy('footer')}
                                                        disabled={isPending}
                                                    >
                                                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                                        Refinar con IA
                                                    </Button>
                                                </Label>
                                                <Input
                                                    value={settings.template_config.footer}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        template_config: { ...settings.template_config, footer: e.target.value }
                                                    })}
                                                    className="text-muted-foreground text-sm"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
