"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Sparkles, Server, CheckCircle2, CreditCard, Upload } from "lucide-react"
import { useRef } from "react"
import { optimizeImage, blobToFile } from "@/lib/utils/image-optimization"
import { uploadCatalogImage } from "./image-actions"
import { ServiceCatalogItem } from "@/types"
import { createCatalogItem, updateCatalogItem } from "./actions"
import { generateCatalogImage } from "./ai-actions"
import { getCategories, ServiceCategory } from "@/modules/core/catalog/categories-actions"
import { getFormTemplates, FormTemplate } from "@/modules/core/forms/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CatalogItemFlipCard } from "@/modules/core/portal/catalog-item-flip-card"

interface CatalogServiceSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    itemToEdit?: ServiceCatalogItem | null
    onSuccess?: () => void
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function CatalogServiceSheet({
    open,
    onOpenChange,
    itemToEdit,
    onSuccess
}: CatalogServiceSheetProps) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<ServiceCategory[]>([])
    const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([])

    const [formData, setFormData] = useState<Partial<ServiceCatalogItem>>({
        name: "",
        description: "",
        category: "",
        type: "recurring",
        frequency: "monthly",
        base_price: 0,
        is_visible_in_portal: true,
        image_url: "",
        ai_generated_image: false,
        cta_type: "whatsapp",
        price_label_type: "base_price",
        metadata: {}
    })
    const [isGenerating, setIsGenerating] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load categories AND form templates
    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, templates] = await Promise.all([
                    getCategories(),
                    getFormTemplates()
                ])
                setCategories(cats)
                setFormTemplates(templates)
            } catch (error) {
                console.error('Error loading data:', error)
                toast.error(t('catalog.toasts.loading_error'))
            }
        }
        if (open) {
            loadData()
        }
    }, [open])

    // Sync form state
    useEffect(() => {
        if (itemToEdit) {
            setFormData({
                ...itemToEdit,
                metadata: itemToEdit.metadata || {}
            })
        } else {
            setFormData({
                name: "",
                description: "",
                category: "",
                type: "recurring",
                frequency: "monthly",
                base_price: 0,
                is_visible_in_portal: true,
                cta_type: "whatsapp",
                price_label_type: "base_price",
                metadata: {}
            })
        }
    }, [itemToEdit, open])

    const handleGenerateAIImage = async () => {
        if (!formData.name) {
            toast.error("Se necesita un nombre para generar la imagen")
            return
        }
        setIsGenerating(true)
        try {
            const result = await generateCatalogImage({
                name: formData.name,
                description: formData.description,
                category: formData.category
            })
            if (result.success) {
                setFormData(prev => ({
                    ...prev,
                    image_url: result.url,
                    ai_generated_image: true
                }))
                toast.success("¡Imagen generada con éxito!")
            }
        } catch (error: any) {
            toast.error(error.message || "Error al generar imagen")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            // 1. Client-side Compression and Optimization
            const optimizedBlob = await optimizeImage(file, {
                maxWidth: 1200,
                quality: 0.8,
                format: 'image/webp'
            })

            const optimizedFile = blobToFile(optimizedBlob, file.name)

            // 2. Prepare FormData
            const uploadFormData = new FormData()
            uploadFormData.append("file", optimizedFile)

            // 3. Upload to Supabase
            const result = await uploadCatalogImage(uploadFormData)

            if (result.success && result.url) {
                setFormData(prev => ({
                    ...prev,
                    image_url: result.url,
                    ai_generated_image: false
                }))
                toast.success("Imagen optimizada y subida con éxito")
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || "Error al procesar/subir imagen")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    const handleSubmit = async () => {
        if (!formData.name || !formData.category) {
            toast.error(t('catalog.toasts.validation_error'))
            return
        }

        setLoading(true)
        try {
            if (itemToEdit) {
                await updateCatalogItem(itemToEdit.id, formData)
                toast.success(t('catalog.toasts.updated'))
            } else {
                await createCatalogItem(formData)
                toast.success(t('catalog.toasts.created'))
            }
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error(error)
            toast.error(t('catalog.toasts.save_error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="w-full sm:max-w-5xl p-0 gap-0 border-none shadow-2xl m-4 rounded-3xl overflow-hidden bg-white"
                side="right"
            >
                {/* Grid Container */}
                <div className="grid grid-cols-12 h-[calc(100vh-2rem)]">
                    {/* LEFT PANEL: Configuration (60%) */}
                    <div className="col-span-12 md:col-span-7 flex flex-col h-full bg-white border-r border-slate-100 overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-8 py-5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-pink/10 rounded-lg">
                                    <Server className="h-5 w-5 text-brand-pink" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-semibold text-gray-900">
                                        {itemToEdit ? t('catalog.sheet_title_edit') : t('catalog.sheet_title_new')}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t('catalog.sheet_subtitle')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="p-8 pb-32 space-y-6">
                            {/* Basics: Name & Category in Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">{t('catalog.form.name_label')} *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={t('catalog.form.name_placeholder')}
                                        className="font-medium h-10"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-gray-400">{t('catalog.form.category_label')} *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue placeholder={t('catalog.form.category_placeholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                    <p>{t('catalog.form.category_empty')}</p>
                                                    <p className="text-xs mt-1">{t('catalog.form.category_create_hint')}</p>
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Billing & Frequency Grouping */}
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    {t('catalog.section_billing')}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t('catalog.form.billing_type_label')}</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                        >
                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recurring">{t('services.summary.active_subscription')}</SelectItem>
                                                <SelectItem value="one_off">{t('services.summary.one_time_payment')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.type === 'recurring' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">{t('catalog.form.frequency_label')}</Label>
                                            <Select
                                                value={formData.frequency}
                                                onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">{t('quotes.builder.frequency.monthly')}</SelectItem>
                                                    <SelectItem value="biweekly">{t('quotes.builder.frequency.biweekly')}</SelectItem>
                                                    <SelectItem value="quarterly">{t('quotes.builder.frequency.quarterly')}</SelectItem>
                                                    <SelectItem value="semiannual">{t('quotes.builder.frequency.semiannual')}</SelectItem>
                                                    <SelectItem value="yearly">{t('quotes.builder.frequency.yearly')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                {/* Price & Price Label logic combined */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs">{t('catalog.form.base_price_label')}</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={formData.base_price}
                                                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                                className="pl-7 h-9"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs">Mostrar Precio como</Label>
                                        <Select
                                            value={formData.price_label_type || "base_price"}
                                            onValueChange={(val: any) => setFormData({ ...formData, price_label_type: val })}
                                        >
                                            <SelectTrigger className="text-sm h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="base_price">Precio Base</SelectItem>
                                                <SelectItem value="price">Precio</SelectItem>
                                                <SelectItem value="from">Desde</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground italic px-1">
                                    {t('catalog.form.base_price_hint')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                {/* Section: CTA Button */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acción Principal</Label>
                                    <Select
                                        value={formData.cta_type || "whatsapp"}
                                        onValueChange={(val: any) => setFormData({ ...formData, cta_type: val })}
                                    >
                                        <SelectTrigger className="text-sm h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="whatsapp">Solicitar vía WhatsApp</SelectItem>
                                            <SelectItem value="buy">Comprar ahora</SelectItem>
                                            <SelectItem value="info">Más información</SelectItem>
                                            <SelectItem value="quote">Solicitar cotización</SelectItem>
                                            <SelectItem value="appointment">Agendar cita</SelectItem>
                                            <SelectItem value="portfolio">Ver detalles / Portfolio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Multimedia & AI Logic in 2nd column or below */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imagen del Servicio</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={formData.image_url || ""}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value, ai_generated_image: false })}
                                            placeholder="URL de imagen..."
                                            className="text-sm h-10"
                                        />
                                        <div className="flex gap-1.5 shrink-0">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleGenerateAIImage}
                                                disabled={isGenerating || !formData.name}
                                                className="h-10 px-3 border-brand-pink/30 hover:bg-brand-pink/10 hover:text-brand-pink transition-all active:scale-95"
                                                title="Generar con IA"
                                            >
                                                {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading || isGenerating}
                                                className="h-10 px-3 border-brand-pink/30 hover:bg-brand-pink/10 hover:text-brand-pink transition-all active:scale-95"
                                                title="Subir Archivo"
                                            >
                                                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                            </Button>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    <p className="text-[9px] text-gray-400 italic">
                                        Subir archivos los optimiza automáticamente a WebP para ahorrar espacio.
                                    </p>
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Briefing & Visibility in Rows of 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('catalog.form.form_template_label')}</Label>
                                    <Select
                                        value={formData.metadata?.form_template_id || "none"}
                                        onValueChange={(val) => setFormData({
                                            ...formData,
                                            metadata: { ...formData.metadata, form_template_id: val === "none" ? null : val }
                                        })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder={t('catalog.form.form_template_none')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('catalog.form.form_template_none_item')}</SelectItem>
                                            {formTemplates.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between rounded-lg border p-3 bg-gray-50/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-semibold">{t('catalog.form.visibility_title')}</Label>
                                        <div className="text-[9px] text-muted-foreground">{t('catalog.form.visibility_desc')}</div>
                                    </div>
                                    <Switch
                                        checked={formData.is_visible_in_portal}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_visible_in_portal: checked })}
                                    />
                                </div>
                            </div>

                            <Separator className="opacity-50" />

                            {/* Portal Card Metadata */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-brand-pink/10 flex items-center justify-center">
                                        <Sparkles className="h-3.5 w-3.5 text-brand-pink" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-tight text-gray-900">{t('catalog.section_portal')}</h4>
                                        <p className="text-[10px] text-gray-400">{t('catalog.form.portal_desc_title')}</p>
                                    </div>
                                </div>

                                {/* Descripción Detallada */}
                                <div className="space-y-2">
                                    <Label className="text-xs">{t('catalog.form.portal_detailed_label')}</Label>
                                    <Textarea
                                        value={formData.metadata?.portal_card?.detailed_description || ""}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            metadata: {
                                                ...formData.metadata,
                                                portal_card: {
                                                    ...formData.metadata?.portal_card,
                                                    detailed_description: e.target.value
                                                }
                                            }
                                        })}
                                        placeholder={t('catalog.form.portal_detailed_placeholder')}
                                        rows={3}
                                        className="resize-none text-sm"
                                    />
                                </div>

                                {/* Features & Highlights in side-by-side or compact list */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-xs flex items-center gap-2">
                                            {t('catalog.form.features_label')}
                                            <Badge variant="outline" className="text-[8px] h-4">{formData.metadata?.portal_card?.features?.length || 0}</Badge>
                                        </Label>
                                        <div className="space-y-2">
                                            {(formData.metadata?.portal_card?.features || []).map((feature: string, idx: number) => (
                                                <div key={idx} className="flex gap-1.5 px-1 group">
                                                    <Input
                                                        value={feature}
                                                        onChange={(e) => {
                                                            const features = [...((formData.metadata?.portal_card?.features as string[]) || [])]
                                                            features[idx] = e.target.value
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    portal_card: {
                                                                        ...formData.metadata?.portal_card,
                                                                        features
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                        placeholder="Item..."
                                                        className="text-xs h-8 bg-white"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const features = (formData.metadata?.portal_card?.features || []).filter((_: any, i: number) => i !== idx)
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    portal_card: {
                                                                        ...formData.metadata?.portal_card,
                                                                        features
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentFeatures = (formData.metadata?.portal_card?.features as string[]) || []
                                                    const features = [...currentFeatures, ""]
                                                    setFormData({
                                                        ...formData,
                                                        metadata: {
                                                            ...formData.metadata,
                                                            portal_card: {
                                                                ...formData.metadata?.portal_card,
                                                                features
                                                            }
                                                        }
                                                    })
                                                }}
                                                className="w-full text-[10px] h-8 border-slate-200 border-dashed text-slate-400 hover:text-brand-pink hover:border-brand-pink/50"
                                            >
                                                + Feature
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs flex items-center gap-2">
                                            {t('catalog.form.highlights_label')}
                                            <Badge variant="outline" className="text-[8px] h-4">{formData.metadata?.portal_card?.highlights?.length || 0}</Badge>
                                        </Label>
                                        <div className="space-y-2">
                                            {(formData.metadata?.portal_card?.highlights || []).map((highlight: string, idx: number) => (
                                                <div key={idx} className="flex gap-1.5 px-1 group">
                                                    <Input
                                                        value={highlight}
                                                        onChange={(e) => {
                                                            const highlights = [...((formData.metadata?.portal_card?.highlights as string[]) || [])]
                                                            highlights[idx] = e.target.value
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    portal_card: {
                                                                        ...formData.metadata?.portal_card,
                                                                        highlights
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                        placeholder="Ex. 24/7..."
                                                        className="text-xs h-8 bg-white border-amber-100 focus-visible:ring-amber-200"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const highlights = (formData.metadata?.portal_card?.highlights || []).filter((_: any, i: number) => i !== idx)
                                                            setFormData({
                                                                ...formData,
                                                                metadata: {
                                                                    ...formData.metadata,
                                                                    portal_card: {
                                                                        ...formData.metadata?.portal_card,
                                                                        highlights
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const currentHighlights = (formData.metadata?.portal_card?.highlights as string[]) || []
                                                    const highlights = [...currentHighlights, ""]
                                                    setFormData({
                                                        ...formData,
                                                        metadata: {
                                                            ...formData.metadata,
                                                            portal_card: {
                                                                ...formData.metadata?.portal_card,
                                                                highlights
                                                            }
                                                        }
                                                    })
                                                }}
                                                className="w-full text-[10px] h-8 border-amber-100 border-dashed text-amber-500 hover:bg-amber-50"
                                            >
                                                + Highlight
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-8 py-4 flex items-center justify-between z-30">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading} className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                {t('catalog.buttons.cancel')}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-brand-pink hover:bg-brand-pink/90 text-white px-10 shadow-lg shadow-brand-pink/20 font-bold uppercase text-[10px] tracking-widest h-11"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {itemToEdit ? t('catalog.buttons.save') : t('catalog.buttons.create')}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Live Preview (40%) */}
                    <div className="hidden md:flex col-span-5 flex-col h-full bg-slate-50/50 p-10 overflow-y-auto items-center justify-center border-l border-slate-100">
                        <div className="w-full max-w-sm space-y-6">
                            <div className="text-center space-y-1.5 mb-8">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {t('catalog.preview.title')}
                                </h3>
                                <div className="h-1 w-8 bg-brand-pink/30 mx-auto rounded-full" />
                            </div>

                            {/* Interactive Flip Card Preview */}
                            <CatalogItemFlipCard
                                item={{
                                    id: 'preview',
                                    name: formData.name || t('catalog.preview.default_name'),
                                    description: formData.description || t('catalog.preview.default_desc'),
                                    category: formData.category || t('catalog.preview.default_category'),
                                    type: formData.type || 'recurring',
                                    frequency: formData.frequency,
                                    base_price: formData.base_price || 0,
                                    is_visible_in_portal: formData.is_visible_in_portal ?? true,
                                    image_url: formData.image_url,
                                    ai_generated_image: formData.ai_generated_image,
                                    cta_type: formData.cta_type || 'whatsapp',
                                    price_label_type: formData.price_label_type || 'base_price',
                                    metadata: {
                                        portal_card: {
                                            detailed_description: formData.metadata?.portal_card?.detailed_description || t('catalog.preview.default_detailed'),
                                            features: formData.metadata?.portal_card?.features || [],
                                            highlights: formData.metadata?.portal_card?.highlights || []
                                        }
                                    },
                                    organization_id: '',
                                    created_at: new Date().toISOString()
                                }}
                                variant="portal"
                                isRequested={false}
                                onRequestInterest={() => { }}
                                settings={{ agency_phone: '1234567890' }}
                            />

                            <div className="space-y-3 pt-6">
                                {!formData.is_visible_in_portal && (
                                    <div className="flex items-center gap-2 justify-center text-[10px] font-bold uppercase tracking-tight text-amber-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        {t('catalog.preview.hidden_badge')}
                                    </div>
                                )}
                                <p className="text-center text-[10px] text-slate-400 font-medium px-8 leading-relaxed">
                                    Este es un vistazo rápido de cómo verá el cliente este servicio en su portal.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
