"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { getOrganizationLimits, updateOrganizationLimits } from "@/modules/core/organizations/actions"
import { toast } from "sonner"

interface EditLimitsModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    organizationId: string
    organizationName: string
}

interface LimitRow {
    engine: string
    period: 'day' | 'month'
    limit: number
}

const ENGINE_OPTIONS = [
    { value: 'automation', label: 'Automaciones' },
    { value: 'messaging', label: 'Mensajería' },
    { value: 'ai', label: 'Consultas AI' },
    { value: 'storage', label: 'Almacenamiento (GB)' }
]

export function EditLimitsModal({ open, onOpenChange, organizationId, organizationName }: EditLimitsModalProps) {
    const [limits, setLimits] = useState<LimitRow[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open && organizationId) {
            loadFile()
        }
    }, [open, organizationId])

    const loadFile = async () => {
        setLoading(true)
        try {
            const data = await getOrganizationLimits(organizationId)
            if (data) {
                // Map DB result to LimitRow
                const mapped = data.map((l: any) => ({
                    engine: l.engine,
                    period: l.period,
                    limit: l.limit_value
                }))
                setLimits(mapped)
            }
        } catch (error) {
            console.error(error)
            toast.error("Error cargando límites")
        } finally {
            setLoading(false)
        }
    }

    const handleAddRow = () => {
        setLimits([...limits, { engine: 'messaging', period: 'month', limit: 1000 }])
    }

    const handleRemoveRow = (index: number) => {
        const newLimits = [...limits]
        newLimits.splice(index, 1)
        setLimits(newLimits)
    }

    const updateRow = (index: number, field: string, value: any) => {
        const newLimits = [...limits]
        newLimits[index] = { ...newLimits[index], [field]: value }
        setLimits(newLimits)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await updateOrganizationLimits(organizationId, limits)
            if (res.success) {
                toast.success("Límites actualizados correctamente")
                onOpenChange(false)
            } else {
                toast.error(res.error || "Error al guardar")
            }
        } catch (error) {
            toast.error("Error inesperado")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Gestionar Límites: {organizationName}</DialogTitle>
                    <DialogDescription>
                        Define las cuotas máximas de consumo para esta organización.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : limits.length === 0 ? (
                        <div className="text-center p-8 border border-dashed rounded-lg bg-muted/30">
                            <p className="text-sm text-muted-foreground mb-4">No hay límites configurados.</p>
                            <Button variant="outline" onClick={handleAddRow} size="sm">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Límite
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-2">
                                <div className="col-span-5">Recurso</div>
                                <div className="col-span-3">Frecuencia</div>
                                <div className="col-span-3">Límite</div>
                                <div className="col-span-1"></div>
                            </div>

                            {limits.map((row, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-5">
                                        <Select value={row.engine} onValueChange={(v) => updateRow(index, 'engine', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ENGINE_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-3">
                                        <Select value={row.period} onValueChange={(v) => updateRow(index, 'period', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="day">Diario</SelectItem>
                                                <SelectItem value="month">Mensual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            value={row.limit}
                                            onChange={(e) => updateRow(index, 'limit', parseInt(e.target.value))}
                                        />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <Button variant="outline" onClick={handleAddRow} size="sm" className="w-full mt-2 border-dashed">
                                <Plus className="mr-2 h-4 w-4" /> Agregar Otro Límite
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
