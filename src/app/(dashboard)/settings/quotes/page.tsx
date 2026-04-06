"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getQuoteSettings, updateQuoteSettings, QuoteSettings } from "@/modules/features/crm/services/logic/quote-settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Palette, MessageSquare, Briefcase, Zap } from "lucide-react"

export default function QuoteSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<QuoteSettings | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setLoading(true)
        setErrorMsg(null)
        const res = await getQuoteSettings()
        if (res.success && res.settings) {
            setSettings(res.settings)
        } else {
            console.error("[QuoteSettingsPage] Error:", res.error)
            setErrorMsg(res.error || "Error desconocido")
            toast.error("Error al cargar configuración: " + (res.error || ""))
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!settings) return
        setSaving(true)
        const res = await updateQuoteSettings(settings)
        if (res.success) {
            toast.success("Configuración guardada")
            router.refresh()
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

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    if (!settings) return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-500">Error al cargar</h2>
            <p className="text-muted-foreground mt-2">{errorMsg || "No se pudo cargar la configuración"}</p>
            <Button className="mt-4" onClick={loadSettings}>Reintentar</Button>
        </div>
    )

    return (
        <div className="container max-w-4xl py-6 space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quote Designer 🎨</h1>
                    <p className="text-muted-foreground mt-2">
                        Personaliza cómo tus clientes interactúan con tus cotizaciones.
                        Transforma un simple "PDF" en una experiencia de compra.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="vertical" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="vertical">1. Vertical & Industria</TabsTrigger>
                    <TabsTrigger value="buttons">2. Botones & Acciones</TabsTrigger>
                    <TabsTrigger value="template">3. Plantilla</TabsTrigger>
                </TabsList>

                <TabsContent value="vertical" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Selecciona tu Vertical</CardTitle>
                            <CardDescription>
                                Esto pre-configurará el lenguaje de los botones para adaptarlo a tu negocio.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div
                                onClick={() => setVertical('agency')}
                                className={`cursor-pointer border-2 rounded-xl p-4 hover:border-primary transition-all ${settings.vertical === 'agency' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted'}`}
                            >
                                <Briefcase className="h-8 w-8 mb-2 text-indigo-500" />
                                <h3 className="font-bold">Agencia / B2B</h3>
                                <p className="text-xs text-muted-foreground mt-1">Cierres formales, presupuestos y contratos.</p>
                            </div>
                            <div
                                onClick={() => setVertical('ecommerce')}
                                className={`cursor-pointer border-2 rounded-xl p-4 hover:border-primary transition-all ${settings.vertical === 'ecommerce' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted'}`}
                            >
                                <Zap className="h-8 w-8 mb-2 text-orange-500" />
                                <h3 className="font-bold">Ecommerce / Delivery</h3>
                                <p className="text-xs text-muted-foreground mt-1">Pedidos rápidos, confirmaciones de orden.</p>
                            </div>
                            <div
                                onClick={() => setVertical('reservation')}
                                className={`cursor-pointer border-2 rounded-xl p-4 hover:border-primary transition-all ${settings.vertical === 'reservation' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted'}`}
                            >
                                <MessageSquare className="h-8 w-8 mb-2 text-green-500" />
                                <h3 className="font-bold">Citas / Servicios</h3>
                                <p className="text-xs text-muted-foreground mt-1">Clínicas, consultorios y reservas de tiempo.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="buttons" className="space-y-4 mt-4">
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
                                />
                                <p className="text-xs text-muted-foreground">Ej: ✅ Aprobar, 🍕 Pedir Ahora, 📅 Confirmar</p>
                            </div>
                            <div className="grid gap-2">
                                <Label>Botón de Rechazar / Negociar</Label>
                                <Input
                                    value={settings.reject_label}
                                    onChange={(e) => setSettings({ ...settings, reject_label: e.target.value })}
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
                                <Label>Razones de Rechazo (separadas por coma)</Label>
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
                            </div>
                            <div className="space-y-2">
                                <Label>Mensaje de Confirmación al Cliente</Label>
                                <Input
                                    placeholder="Gracias por su respuesta. Un asesor se comunicará pronto."
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
                                <p className="text-xs text-muted-foreground">Usa ${'{'}reason{'}'} para incluir la razón seleccionada.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="template" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plantilla del Mensaje</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Encabezado</Label>
                                <Input
                                    value={settings.template_config.header}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        template_config: { ...settings.template_config, header: e.target.value }
                                    })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Pie de Página</Label>
                                <Input
                                    value={settings.template_config.footer}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        template_config: { ...settings.template_config, footer: e.target.value }
                                    })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
