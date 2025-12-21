"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ServiceCatalogItem } from "@/types"
import { upsertPortfolioItem } from "@/lib/actions/portfolio"

interface PortfolioFormModalProps {
    isOpen: boolean
    onClose: () => void
    itemToEdit?: ServiceCatalogItem | null
    onSuccess?: () => void
}

const CATEGORIES = [
    "Infraestructura & Suscripciones",
    "Branding & Identidad",
    "UX / UI & Producto Digital",
    "Web & Ecommerce",
    "Marketing & Growth",
    "Social Media & Contenido",
    "Diseño como Servicio (DaaS)",
    "Consultoría & Especialidades",
    "Servicios Flexibles / A Medida"
]

export function PortfolioFormModal({ isOpen, onClose, itemToEdit, onSuccess }: PortfolioFormModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<ServiceCatalogItem>>({
        name: "",
        description: "",
        category: "",
        type: "recurring",
        frequency: "monthly",
        base_price: 0,
        is_visible_in_portal: true
    })

    useEffect(() => {
        if (itemToEdit) {
            setFormData(itemToEdit)
        } else {
            setFormData({
                name: "",
                description: "",
                category: "",
                type: "recurring",
                frequency: "monthly",
                base_price: 0,
                is_visible_in_portal: true
            })
        }
    }, [itemToEdit, isOpen])

    const handleSubmit = async () => {
        if (!formData.name || !formData.category) {
            toast.error("Nombre y Categoría son obligatorios")
            return
        }

        setLoading(true)
        try {
            await upsertPortfolioItem(formData)
            toast.success(itemToEdit ? "Servicio actualizado" : "Servicio creado exitosamente")
            onSuccess?.()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar el servicio")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] top-[5%] translate-y-0 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{itemToEdit ? "Editar Servicio" : "Nuevo Servicio de Portafolio"}</DialogTitle>
                    <DialogDescription>
                        Define los detalles del servicio. Esto creará automáticamente una plantilla de briefing.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre del Servicio *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej. Diseño Web Corporativo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoría *</Label>
                        <Select
                            value={formData.category}
                            onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe qué incluye este servicio..."
                            className="h-24 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de cobro</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recurring">Recurrente</SelectItem>
                                    <SelectItem value="one_off">Pago Único</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'recurring' && (
                            <div className="space-y-2">
                                <Label htmlFor="frequency">Frecuencia</Label>
                                <Select
                                    value={formData.frequency}
                                    onValueChange={(val: any) => setFormData({ ...formData, frequency: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
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
                        <Label htmlFor="price">Precio Base</Label>
                        <Input
                            id="price"
                            type="number"
                            min="0"
                            value={formData.base_price}
                            onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3 bg-gray-50/50">
                        <div className="space-y-0.5">
                            <Label>Visible en Portal de Clientes</Label>
                            <div className="text-xs text-muted-foreground">
                                Permite a los clientes descubrir este servicio.
                            </div>
                        </div>
                        <Switch
                            checked={formData.is_visible_in_portal}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_visible_in_portal: checked })}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-brand-pink hover:bg-brand-pink/90 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {itemToEdit ? "Actualizar Servicio" : "Crear Servicio"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
