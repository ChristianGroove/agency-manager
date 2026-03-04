"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Save, Trash2, Edit2, PlayCircle, Eye, X, Image as ImageIcon, LayoutTemplate, Palette, Globe, Target, Trash } from "lucide-react"

import { getGlobalBanners, upsertGlobalBanner, toggleBannerActive, deleteGlobalBanner } from "@/modules/core/admin/actions"
import { GlobalBannerConfig, GlobalDashboardBanner } from "@/modules/core/dashboard/components/global-dashboard-banner"

const ANIMATIONS = [
    { label: "Hombre trabajando", value: "/animations/cartoon-man-working-at-desk-illustration-2025-10-20-04-30-47-utc.json" },
    { label: "Servicio Limpieza", value: "/animations/cartoon-window-cleaning-service-illustration-2025-10-20-04-30-52-utc.json" },
    { label: "Avión (Reseller)", value: "/animations/cartoon-airplane-animation-2025-10-20-02-23-50-utc.json" },
    { label: "Caja Premium (Resto)", value: "/animations/cartoon-premium-box-illustration-2025-10-20-03-11-12-utc.json" },
    { label: "Chica construyendo", value: "/animations/cartoon-illustration-of-woman-building-brand-block-2025-10-20-02-26-52-utc.json" },
    { label: "Atención al cliente", value: "/animations/customer-service-agent-tracking-a-package-2025-10-20-02-21-50-utc.json" },
    { label: "Planificador tareas", value: "/animations/cartoon-task-list-illustration-2025-10-20-03-26-27-utc.json" },
    { label: "Tienda online", value: "/animations/online-store-illustration-with-payment-card-2025-10-20-06-01-27-utc.json" }
]

const DEFAULT_BANNER: GlobalBannerConfig = {
    space_type: 'all',
    title: 'Nuevo Banner',
    description: ['Ingresa tu primer mensaje dinámico'],
    cta_text: '',
    cta_url: '',
    media_type: 'json_lottie',
    media_url: '',
    layout_pos: 'right',
    theme: 'brand_primary',
    is_active: false
}

export function GlobalBannersManager() {
    const [banners, setBanners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // El banner que estamos editando en el formulario
    const [formData, setFormData] = useState<GlobalBannerConfig>(DEFAULT_BANNER)
    const [isPristine, setIsPristine] = useState(true)

    useEffect(() => {
        loadBanners()
    }, [])

    const loadBanners = async () => {
        setLoading(true)
        const data = await getGlobalBanners()
        setBanners(data)
        setLoading(false)
    }

    const handleSelectBanner = (bannerId: string) => {
        if (bannerId === "new") {
            setFormData(DEFAULT_BANNER)
            setIsPristine(false)
            return
        }
        const found = banners.find(b => b.id === bannerId)
        if (found) {
            let desc = found.description
            if (typeof desc === 'string') {
                desc = [desc]
            }
            setFormData({ ...found, description: desc || [''] })
            setIsPristine(false)
        }
    }

    const handleSave = async () => {
        if (!formData.title || !formData.space_type) {
            toast.error("El Título y Space Type son obligatorios")
            return
        }

        // Limpiar descripciones vacías
        const cleanDescriptions = (Array.isArray(formData.description) ? formData.description : [formData.description])
            .filter((d: string) => d.trim() !== "")

        if (cleanDescriptions.length === 0) {
            toast.error("Debes agregar al menos una línea de descripción")
            return
        }

        setSaving(true)
        const payload = {
            ...formData,
            description: cleanDescriptions
        }

        const res = await upsertGlobalBanner(payload)
        if (res.success) {
            toast.success("Banner guardado exitosamente")
            await loadBanners()
            // Recargar datos actualizados al form
            if ('data' in res && res.data) {
                setFormData({ ...(res.data as any), description: cleanDescriptions })
            }
        } else {
            toast.error(res.error || "Error al guardar el banner")
        }
        setSaving(false)
    }

    const handleToggleActive = async (banner: any) => {
        const res = await toggleBannerActive(banner.id, banner.space_type, !banner.is_active)
        if (res.success) {
            toast.success(`Banner ${!banner.is_active ? 'activado' : 'desactivado'}`)
            await loadBanners()
            if (formData.id === banner.id) {
                setFormData(prev => ({ ...prev, is_active: !banner.is_active }))
            }
        } else {
            toast.error("Error al actualizar estado")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este banner permanentemente?")) return
        const res = await deleteGlobalBanner(id)
        if (res.success) {
            toast.success("Banner eliminado")
            if (formData.id === id) setFormData(DEFAULT_BANNER)
            loadBanners()
        } else {
            toast.error("Error al eliminar")
        }
    }

    // Handlers para el array dinámico de Textos
    const addTip = () => {
        const currentTips = Array.isArray(formData.description) ? formData.description : [formData.description]
        setFormData({ ...formData, description: [...currentTips, ""] })
    }

    const updateTip = (index: number, value: string) => {
        const currentTips = Array.isArray(formData.description) ? [...formData.description] : [formData.description as string]
        currentTips[index] = value
        setFormData({ ...formData, description: currentTips })
    }

    const removeTip = (index: number) => {
        const currentTips = Array.isArray(formData.description) ? [...formData.description] : [formData.description as string]
        currentTips.splice(index, 1)
        if (currentTips.length === 0) currentTips.push("") // Mantener al menos 1
        setFormData({ ...formData, description: currentTips })
    }

    if (loading && banners.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const tipsArray = Array.isArray(formData.description) ? formData.description : [formData.description as string]

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Gestor de Banners Globales</h2>
                    <p className="text-muted-foreground text-sm">Escoge un banner para editar y previsualiza los cambios en tiempo real.</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select
                        value={formData.id || (isPristine ? "" : "new")}
                        onValueChange={handleSelectBanner}
                    >
                        <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Seleccionar un banner para editar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new" className="font-bold text-primary">
                                <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Crear Nuevo Banner</span>
                            </SelectItem>
                            {banners.map(b => (
                                <SelectItem key={b.id} value={b.id}>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${b.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className="truncate">{b.title} ({b.space_type})</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {formData.id && (
                        <Button variant="outline" size="icon" className="text-red-500 hover:bg-red-50 border-red-200" onClick={() => handleDelete(formData.id!)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* COLUMNA IZQUIERDA: EDITOR (5 columnas) */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                    <Card className="border shadow-sm">
                        <CardHeader className="bg-slate-50 dark:bg-zinc-900 border-b pb-4">
                            <CardTitle className="text-lg flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Edit2 className="h-4 w-4 text-primary" />
                                    {formData.id ? 'Editando Banner' : 'Configuración de Nuevo Banner'}
                                </span>
                                {formData.id && (
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={() => handleToggleActive(formData)}
                                    />
                                )}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="p-0">
                            {/* SECCIÓN 1: IDENTIFICACIÓN */}
                            <div className="p-5 space-y-4 border-b">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Target className="h-3 w-3" /> Entorno y Red
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título Principal</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="font-semibold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Inyectar en (Space Type)</Label>
                                        <Select value={formData.space_type} onValueChange={(v) => setFormData({ ...formData, space_type: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Global (Todos los Dashboards)</SelectItem>
                                                <SelectItem value="platform">Plataforma (Ej: Pixy Agency)</SelectItem>
                                                <SelectItem value="agency">Agency / B2B</SelectItem>
                                                <SelectItem value="resto">Restaurantes</SelectItem>
                                                <SelectItem value="cleaning">Limpieza y Servicios</SelectItem>
                                                <SelectItem value="reseller">Resellers</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">Nota: Solo puede haber un banner activo "agencia", "resto", etc a la vez.</p>
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 2: TEXTOS DINÁMICOS */}
                            <div className="p-5 space-y-4 border-b bg-slate-50/50 dark:bg-black/10">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <LayoutTemplate className="h-3 w-3" /> Textos Animados (Fade-in)
                                </h3>
                                <p className="text-xs text-muted-foreground mb-2">Agrega líneas de texto que rotarán mágicamente cada 8 segundos.</p>

                                <div className="space-y-3">
                                    {tipsArray.map((tip, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <Textarea
                                                value={tip}
                                                onChange={(e) => updateTip(idx, e.target.value)}
                                                placeholder={`Línea u oración (presiona Enter para salto de línea) ${idx + 1}...`}
                                                className="text-sm min-h-[60px]"
                                            />
                                            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-red-500" onClick={() => removeTip(idx)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={addTip} className="w-full mt-2 border-dashed">
                                        <Plus className="h-3 w-3 mr-2" /> Agregar Nueva Línea de Texto
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Botón - Texto</Label>
                                        <Input
                                            placeholder="Opcional. Ej: Saber más"
                                            value={formData.cta_text || ''}
                                            onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Botón - URL</Label>
                                        <Input
                                            placeholder="https://..."
                                            value={formData.cta_url || ''}
                                            onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECCIÓN 3: MEDIA & UX */}
                            <div className="p-5 space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <ImageIcon className="h-3 w-3" /> Apariencia y Multimedia
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Tema (Variación de Fondo)</Label>
                                        <Select value={formData.theme} onValueChange={(v: any) => setFormData({ ...formData, theme: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="brand_primary">Marca Primario</SelectItem>
                                                <SelectItem value="brand_secondary">Marca Secundario</SelectItem>
                                                <SelectItem value="dark">Dark (Vidrio)</SelectItem>
                                                <SelectItem value="light">Light (Sólido)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Alineación de Media</Label>
                                        <Select value={formData.layout_pos} onValueChange={(v: any) => setFormData({ ...formData, layout_pos: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="right">A la Derecha</SelectItem>
                                                <SelectItem value="left">A la Izquierda</SelectItem>
                                                <SelectItem value="center">Imagen de Fondo (Marca de Agua)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Animación / Imagen</Label>
                                        <Select
                                            value={formData.media_type}
                                            onValueChange={(v) => {
                                                setFormData({ ...formData, media_type: v, media_url: '' })
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="json_lottie">Lottie 3D (JSON)</SelectItem>
                                                <SelectItem value="image">URL de Imagen</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.media_type === 'json_lottie' ? (
                                        <Select
                                            value={ANIMATIONS.some(a => a.value === formData.media_url) ? formData.media_url : (formData.media_url ? "custom" : "")}
                                            onValueChange={(v) => {
                                                if (v !== "custom") {
                                                    setFormData({ ...formData, media_url: v })
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una animación Lottie de la biblioteca" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ANIMATIONS.map(anim => (
                                                    <SelectItem key={anim.value} value={anim.value}>{anim.label}</SelectItem>
                                                ))}
                                                <SelectItem value="custom" disabled className="text-muted-foreground italic">Cargado via campo customizado (abajo)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            placeholder="Pega la URL pública de la imagen (JPG, PNG, GIF)"
                                            value={formData.media_url || ''}
                                            onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-slate-50 dark:bg-zinc-900 border-t py-4 flex justify-between items-center rounded-b-xl">
                            {!formData.id && (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="active-new"
                                        checked={formData.is_active}
                                        onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                                    />
                                    <Label htmlFor="active-new" className="text-xs cursor-pointer">Publicar Inmediato</Label>
                                </div>
                            )}
                            <div className="flex-1 flex justify-end">
                                <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Guardar Cambios
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: PREVIEW (7 columnas), Fixed o Sticky para que siempe se vea */}
                <div className="xl:col-span-7 sticky top-6">
                    <Card className="border-0 shadow-none bg-transparent">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Globe className="h-4 w-4 text-brand-cyan" />
                                Renderización en Tiempo Real
                            </h3>
                            <Badge variant="outline" className="bg-white/50 dark:bg-black/50 backdrop-blur">
                                {formData.space_type?.toUpperCase() || 'ALL'}
                            </Badge>
                        </div>

                        <div className="bg-slate-100 dark:bg-black/20 p-2 sm:p-6 lg:p-10 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 shadow-inner min-h-[400px] flex items-center justify-center relative overflow-hidden">
                            {/* Revestimiento que marca que es un canvas simulado */}
                            <div className="absolute top-4 left-4 text-xs font-mono text-muted-foreground flex items-center gap-1 opacity-50 z-0">
                                <LayoutTemplate className="w-3 h-3" /> Dashboard Slot (Responsive Frame)
                            </div>

                            <div className="w-full max-w-5xl z-10 transition-all duration-300">
                                <GlobalDashboardBanner config={{ ...formData, is_active: true }} />
                            </div>
                        </div>
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            Los colores `Brand Primary` y `Brand Secondary` se renderizan utilizando los códigos de color dinámicos injectados por la organización actualmente autenticada en su navegador.
                        </p>
                    </Card>
                </div>

            </div>
        </div>
    )
}
