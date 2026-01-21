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
import { Loader2, Plus, Sparkles, Server, CheckCircle2, CreditCard } from "lucide-react"
import { ServiceCatalogItem } from "@/types"
import { createCatalogItem, updateCatalogItem } from "./actions"
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

export function CatalogServiceSheet({
    open,
    onOpenChange,
    itemToEdit,
    onSuccess
}: CatalogServiceSheetProps) {
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
        metadata: {}
    })

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
                toast.error('Error al cargar datos iniciales')
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
                metadata: {}
            })
        }
    }, [itemToEdit, open])

    const handleSubmit = async () => {
        if (!formData.name || !formData.category) {
            toast.error("Nombre y Categoría son obligatorios")
            return
        }

        setLoading(true)
        try {
            if (itemToEdit) {
                await updateCatalogItem(itemToEdit.id, formData)
                toast.success("Servicio actualizado")
            } else {
                await createCatalogItem(formData)
                toast.success("Servicio creado")
            }
            onOpenChange(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar el servicio")
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
                                        {itemToEdit ? "Editar Servicio" : "Nuevo Servicio"}
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Define la oferta de valor
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form Content */}
                        <div className="p-8 pb-20 space-y-6">
                            {/* Basics */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Servicio *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej. Diseño Web Corporativo"
                                        className="font-medium"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Categoría *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.length > 0 ? (
                                                categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                ))
                                            ) : (
                                                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                                                    <p>No hay categorías</p>
                                                    <p className="text-xs mt-1">Crea una categoría primero</p>
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={formData.description || ""}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="¿Qué incluye este servicio?"
                                        rows={4}
                                        className="resize-none"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Briefing / Form Linkage */}
                            <div className="space-y-2">
                                <Label>Formulario Requerido (Briefing)</Label>
                                <Select
                                    value={formData.metadata?.form_template_id || "none"}
                                    onValueChange={(val) => setFormData({
                                        ...formData,
                                        metadata: { ...formData.metadata, form_template_id: val === "none" ? null : val }
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin formulario" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {formTemplates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    El cliente deberá llenar este formulario al contratar el servicio.
                                </p>
                            </div>

                            <Separator />

                            {/* Billing Config */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-gray-900">Configuración de Facturación</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo de Cobro</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="recurring">Recurrente</SelectItem>
                                                <SelectItem value="one_off">Pago Único</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.type === 'recurring' && (
                                        <div className="space-y-2">
                                            <Label>Frecuencia</Label>
                                            <Select
                                                value={formData.frequency}
                                                onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="monthly">Mensual</SelectItem>
                                                    <SelectItem value="biweekly">Quincenal</SelectItem>
                                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                                    <SelectItem value="semiannual">Semestral</SelectItem>
                                                    <SelectItem value="yearly">Anual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Precio Base (Referencia)</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400">$</span>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.base_price}
                                            onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                            className="pl-7"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Este precio se usará como sugerencia al crear cotizaciones.
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Visibility */}
                            <div className="flex items-center justify-between rounded-xl border p-4 bg-gray-50/50">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Catálogo Público</Label>
                                    <div className="text-xs text-muted-foreground">
                                        Visible en el portal de clientes
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.is_visible_in_portal}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_visible_in_portal: checked })}
                                />
                            </div>

                            <Separator />

                            {/* Portal Card Metadata */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                                        <Sparkles className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">Información para Portal del Cliente</h4>
                                        <p className="text-xs text-gray-500">Detalles que verán al explorar el catálogo</p>
                                    </div>
                                </div>

                                {/* Descripción Detallada */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Descripción Detallada (Reverso de Card)</Label>
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
                                        placeholder="Descripción extensa que se mostrará al girar la tarjeta..."
                                        rows={4}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-gray-500">Se mostrará en el reverso de la card cuando el cliente la seleccione</p>
                                </div>

                                {/* Features */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Características</Label>
                                    <div className="space-y-2">
                                        {(formData.metadata?.portal_card?.features || []).map((feature: string, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input
                                                    value={feature}
                                                    onChange={(e) => {
                                                        const features = [...(formData.metadata?.portal_card?.features || [])]
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
                                                    placeholder="Ej. Soporte 24/7"
                                                    className="text-sm"
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
                                                    className="shrink-0"
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const features = [...(formData.metadata?.portal_card?.features || []), ""]
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
                                            className="w-full text-xs"
                                        >
                                            + Agregar característica
                                        </Button>
                                    </div>
                                </div>

                                {/* Highlights */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Destacados</Label>
                                    <div className="space-y-2">
                                        {(formData.metadata?.portal_card?.highlights || []).map((highlight: string, idx: number) => (
                                            <div key={idx} className="flex gap-2">
                                                <Input
                                                    value={highlight}
                                                    onChange={(e) => {
                                                        const highlights = [...(formData.metadata?.portal_card?.highlights || [])]
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
                                                    placeholder="Ej. Más vendido"
                                                    className="text-sm"
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
                                                    className="shrink-0"
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const highlights = [...(formData.metadata?.portal_card?.highlights || []), ""]
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
                                            className="w-full text-xs"
                                        >
                                            + Agregar destacado
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-8 py-4 flex items-center justify-between mt-auto">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-brand-pink hover:bg-brand-pink/90 text-white px-8"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {itemToEdit ? "Guardar Cambios" : "Crear Servicio"}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Live Preview (40%) */}
                    <div className="hidden md:flex col-span-5 flex-col h-full bg-slate-50/50 p-10 overflow-y-auto items-center justify-center">
                        <div className="w-full max-w-md space-y-6">
                            <div className="text-center space-y-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Vista Previa (Catálogo)
                                </h3>
                                <p className="text-sm text-gray-500">Así verán tus clientes este servicio</p>
                                <p className="text-xs text-purple-600">Click para voltear la card →</p>
                            </div>

                            {/* Interactive Flip Card Preview */}
                            <CatalogItemFlipCard
                                item={{
                                    id: 'preview',
                                    name: formData.name || 'Nombre del Servicio',
                                    description: formData.description || 'Descripción del servicio...',
                                    category: formData.category || 'Categoría',
                                    type: formData.type || 'recurring',
                                    frequency: formData.frequency,
                                    base_price: formData.base_price || 0,
                                    is_visible_in_portal: formData.is_visible_in_portal ?? true,
                                    metadata: {
                                        portal_card: {
                                            detailed_description: formData.metadata?.portal_card?.detailed_description || 'Agrega una descripción detallada para mostrar aquí...',
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

                            {!formData.is_visible_in_portal && (
                                <div className="flex items-center gap-2 justify-center text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    Oculto en el portal público
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
