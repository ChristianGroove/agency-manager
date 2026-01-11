"use client"

import { useState, useEffect } from "react"
import { getQuoteSettings, updateQuoteSettings, QuoteSettings } from "@/modules/core/crm/quote-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Palette, MessageSquare, Briefcase, Zap, PaintBucket, Save } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"

interface QuoteDesignerSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function QuoteDesignerSheet({ open, onOpenChange }: QuoteDesignerSheetProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<QuoteSettings | null>(null)

    useEffect(() => {
        if (open) {
            loadSettings()
        }
    }, [open])

    const loadSettings = async () => {
        setLoading(true)
        const res = await getQuoteSettings()
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

    const setVertical = (v: any) => {
        if (!settings) return
        let newLabels = { ...settings }

        switch (v) {
            case 'ecommerce':
                newLabels.approve_label = "🍕 Confirmar Pedido"
                newLabels.reject_label = "❌ Cancelar"
                newLabels.vertical = 'ecommerce'
                break;
            case 'reservation':
                newLabels.approve_label = "📅 Confirmar Cita"
                newLabels.reject_label = "❌ Re-agendar"
                newLabels.vertical = 'reservation'
                break;
            case 'agency':
                newLabels.approve_label = "✅ Aprobar Presupuesto"
                newLabels.reject_label = "❌ Rechazar / Cambios"
                newLabels.vertical = 'agency'
                break;
            default:
                newLabels.vertical = 'custom'
        }
        setSettings(newLabels)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-3xl w-full p-0 gap-0 border-none shadow-2xl
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
                                <SheetTitle className="text-xl font-bold text-gray-900 tracking-tight">Quote Designer 🎨</SheetTitle>
                                <SheetDescription>
                                    Personaliza la experiencia de compra de tus clientes.
                                </SheetDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="bg-black text-white hover:bg-gray-800 rounded-xl shadow-lg shadow-black/10"
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="mr-2 h-4 w-4" /> Guardar
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-8 relative scrollbar-thin scrollbar-thumb-gray-200">
                        {loading || !settings ? (
                            <div className="flex justify-center items-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                            </div>
                        ) : (
                            <Tabs defaultValue="vertical" className="space-y-6">
                                <TabsList className="bg-white border w-full justify-start p-1 h-auto flex-wrap">
                                    <TabsTrigger value="vertical">1. Vertical & Industria</TabsTrigger>
                                    <TabsTrigger value="buttons">2. Botones & Acciones</TabsTrigger>
                                    <TabsTrigger value="template">3. Plantilla Visual</TabsTrigger>
                                </TabsList>

                                {/* --- VERTICAL --- */}
                                <TabsContent value="vertical" className="animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div
                                            onClick={() => setVertical('agency')}
                                            className={`cursor-pointer border-2 rounded-xl p-5 flex items-center gap-4 hover:border-pink-300 transition-all ${settings.vertical === 'agency' ? 'border-pink-500 bg-pink-50/50' : 'border-gray-100 bg-white'}`}
                                        >
                                            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <Briefcase className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Agencia / B2B</h3>
                                                <p className="text-sm text-muted-foreground">Ideal para presupuestos formales, contratos y cierres de alto valor.</p>
                                            </div>
                                            {settings.vertical === 'agency' && <div className="ml-auto w-3 h-3 bg-pink-500 rounded-full" />}
                                        </div>

                                        <div
                                            onClick={() => setVertical('ecommerce')}
                                            className={`cursor-pointer border-2 rounded-xl p-5 flex items-center gap-4 hover:border-pink-300 transition-all ${settings.vertical === 'ecommerce' ? 'border-pink-500 bg-pink-50/50' : 'border-gray-100 bg-white'}`}
                                        >
                                            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Zap className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Ecommerce / Delivery</h3>
                                                <p className="text-sm text-muted-foreground">Optimizado para velocidad: Confirmar Pedido, Cancelar, Re-ordenar.</p>
                                            </div>
                                            {settings.vertical === 'ecommerce' && <div className="ml-auto w-3 h-3 bg-pink-500 rounded-full" />}
                                        </div>

                                        <div
                                            onClick={() => setVertical('reservation')}
                                            className={`cursor-pointer border-2 rounded-xl p-5 flex items-center gap-4 hover:border-pink-300 transition-all ${settings.vertical === 'reservation' ? 'border-pink-500 bg-pink-50/50' : 'border-gray-100 bg-white'}`}
                                        >
                                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                                <MessageSquare className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Citas / Servicios</h3>
                                                <p className="text-sm text-muted-foreground">Para clínicas y consultorios: Agendar, Confirmar, Re-programar.</p>
                                            </div>
                                            {settings.vertical === 'reservation' && <div className="ml-auto w-3 h-3 bg-pink-500 rounded-full" />}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* --- BUTTONS --- */}
                                <TabsContent value="buttons" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="grid gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Etiquetas de Acción</CardTitle>
                                                <CardDescription>Define qué dicen los botones que verá el cliente.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid gap-2">
                                                    <Label>Botón de Aprobar (Texto + Emoji)</Label>
                                                    <Input
                                                        value={settings.approve_label}
                                                        onChange={(e) => setSettings({ ...settings, approve_label: e.target.value })}
                                                        className="font-bold text-green-700 border-green-200 bg-green-50"
                                                    />
                                                    <p className="text-xs text-muted-foreground">Ej: ✅ Aprobar, 🍕 Pedir Ahora, 📅 Confirmar</p>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Botón de Rechazar / Negociar</Label>
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
                                                <CardTitle>Rechazo Inteligente</CardTitle>
                                                <CardDescription>Si el cliente rechaza, ¿qué opciones le damos?</CardDescription>
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
                                                        placeholder="Muy caro, No me interesa, Otro momento..."
                                                    />
                                                    <p className="text-xs text-muted-foreground">Separadas por coma.</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Mensaje de Confirmación</Label>
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
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Estructura del Mensaje</CardTitle>
                                            <CardDescription>Personaliza el Header y Footer predeterminados de tus cotizaciones.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-6">
                                            <div className="grid gap-2">
                                                <Label>Encabezado (Header)</Label>
                                                <Input
                                                    value={settings.template_config.header}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        template_config: { ...settings.template_config, header: e.target.value }
                                                    })}
                                                    className="font-medium"
                                                />
                                                <p className="text-xs text-muted-foreground">Aparece en negrita al inicio de cada mensaje.</p>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Pie de Página (Footer)</Label>
                                                <Input
                                                    value={settings.template_config.footer}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        template_config: { ...settings.template_config, footer: e.target.value }
                                                    })}
                                                    className="text-muted-foreground text-sm"
                                                />
                                                <p className="text-xs text-muted-foreground">Texto pequeño al final (Ej: "Enviado con ❤️ por Pixy")</p>
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
