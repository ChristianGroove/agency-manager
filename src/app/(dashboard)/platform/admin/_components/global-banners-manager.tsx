"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, Plus, Save, Trash2, Edit2, PlayCircle, Eye, X, Image as ImageIcon, LayoutTemplate, Palette, Globe, Target, Trash, Sparkles, Film } from "lucide-react"

import { getGlobalBanners, upsertGlobalBanner, toggleBannerActive, deleteGlobalBanner } from "@/modules/core/admin/actions"
import { GlobalBannerConfig, GlobalDashboardBanner } from "@/modules/core/dashboard/components/global-dashboard-banner"
import { LottieVisualPickerModal } from "./lottie-visual-picker-modal"
import lottieCatalog from "./lottie-catalog.json"

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

const BASE_SPACES = [
    { value: 'all', label: '🌐 Global (Todos los Dashboards)' },
    { value: 'agency', label: '🏢 Agencia / Marketing & B2B' },
    { value: 'resto', label: '🍽️ Restaurantes & Gastronomía' },
    { value: 'retail', label: '🛍️ Retail & Comercio' },
    { value: 'cleaning', label: '🧹 Limpieza & Servicios Especializados' },
    { value: 'real_estate', label: '🏠 Bienes Raíces / Real Estate' },
    { value: 'saas', label: '💻 SaaS & Plataformas de Software' },
    { value: 'reseller', label: '🤝 Resellers & Aliados Comerciales' },
    { value: 'platform', label: '⚙️ Plataforma Central (Superadmin / Core)' },
]

export function GlobalBannersManager({ apps = [] }: { apps?: any[] }) {
    const [banners, setBanners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isLottiePickerOpen, setIsLottiePickerOpen] = useState(false)

    // El banner que estamos editando en el formulario
    const [formData, setFormData] = useState<GlobalBannerConfig>(DEFAULT_BANNER)
    const [isPristine, setIsPristine] = useState(true)

    const selectedLottieItem = useMemo(() => {
        if (!formData.media_url) return null
        return (lottieCatalog as any[]).find(item => item.value === formData.media_url)
    }, [formData.media_url])

    const saasAppOptions = useMemo(() => {
        return (apps || [])
            .filter(app => app && (app.slug || app.id))
            .map(app => ({
                value: app.slug || app.id,
                label: `📦 ${app.name} (${app.slug || app.category || 'app'})`
            }))
            .filter(appOpt => !BASE_SPACES.some(b => b.value === appOpt.value))
    }, [apps])

    const allKnownOptions = useMemo(() => {
        return [...BASE_SPACES, ...saasAppOptions]
    }, [saasAppOptions])

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
                    <p className="text-sm text-muted-foreground">Configura los banners publicitarios dinámicos que verán los usuarios en sus Dashboards por tipo de espacio.</p>
                </div>

                {/* SELECTOR DE BANNER A EDITAR O CREAR */}
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
                                    <div className="flex items-center gap-2">
                                        <Badge variant={formData.is_active ? "default" : "secondary"} className={formData.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                                            {formData.is_active ? "Activo en Vivo" : "Inactivo"}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => handleToggleActive(formData)}
                                        >
                                            {formData.is_active ? "Desactivar" : "Activar"}
                                        </Button>
                                    </div>
                                )}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Todos los cambios se reflejan inmediatamente en la vista previa a la derecha.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-0 divide-y">
                            {/* SECCIÓN 1: GENERAL */}
                            <div className="p-5 space-y-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Target className="h-3 w-3" /> Configuración Principal
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
                                            <SelectTrigger><SelectValue placeholder="Selecciona un Space Type" /></SelectTrigger>
                                            <SelectContent className="max-h-[320px]">
                                                <SelectItem value="all" className="font-semibold text-primary">
                                                    🌐 Global (Todos los Dashboards)
                                                </SelectItem>
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    Verticales Principales
                                                </div>
                                                {BASE_SPACES.filter(s => s.value !== 'all').map(s => (
                                                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                ))}
                                                {saasAppOptions.length > 0 && (
                                                    <>
                                                        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-2">
                                                            SaaS Engine Spaces & Soluciones
                                                        </div>
                                                        {saasAppOptions.map(s => (
                                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                                        ))}
                                                    </>
                                                )}
                                                {formData.space_type && !allKnownOptions.some(o => o.value === formData.space_type) && (
                                                    <SelectItem value={formData.space_type}>
                                                        🎯 {formData.space_type} (Personalizado)
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground">Nota: Solo puede haber un banner activo por cada space a la vez.</p>
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
                                                placeholder={`Línea ${idx + 1}...`}
                                                rows={2}
                                                className="resize-none text-sm"
                                            />
                                            {tipsArray.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-muted-foreground hover:text-red-500 shrink-0"
                                                    onClick={() => removeTip(idx)}
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}

                                    <Button variant="outline" size="sm" onClick={addTip} className="w-full text-xs">
                                        <Plus className="h-3.5 w-3.5 mr-1" /> Agregar otra frase rotativa
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Botón - Texto (Opcional)</Label>
                                        <Input
                                            placeholder="Ej: Probar Ahora"
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
                                        <div className="space-y-2">
                                            {/* Visual preview card & open modal button */}
                                            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                                        {formData.media_url ? (
                                                            <Film className="h-6 w-6 text-primary animate-pulse" />
                                                        ) : (
                                                            <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-foreground truncate">
                                                            {selectedLottieItem?.label || (formData.media_url ? 'Animación seleccionada' : 'Ninguna animación')}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                                                            {formData.media_url ? formData.media_url.split('/').pop() : 'Selecciona una miniatura visual'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsLottiePickerOpen(true)}
                                                    className="gap-1.5 shrink-0 bg-white dark:bg-zinc-800 hover:bg-primary hover:text-primary-foreground transition-colors text-xs h-9 px-3 border-primary/30"
                                                >
                                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                    Galería ({lottieCatalog.length})
                                                </Button>
                                            </div>

                                            {/* Input direct URL / path with Clear button */}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Ruta JSON ej: /animations/..."
                                                    value={formData.media_url || ''}
                                                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                                                    className="text-xs h-8 font-mono"
                                                />
                                                {formData.media_url && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setFormData({ ...formData, media_url: '' })}
                                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-red-500"
                                                        title="Quitar animación"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            <LottieVisualPickerModal
                                                open={isLottiePickerOpen}
                                                onOpenChange={setIsLottiePickerOpen}
                                                selectedValue={formData.media_url}
                                                onSelect={(val) => setFormData({ ...formData, media_url: val })}
                                            />
                                        </div>
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

                {/* COLUMNA DERECHA: PREVIEW (7 columnas), Fixed o Sticky para que siempre se vea */}
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
