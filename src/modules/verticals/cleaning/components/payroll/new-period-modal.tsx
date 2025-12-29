"use client"

import { useState } from "react"
import { createPayrollPeriod } from "../../actions/payroll-actions"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface NewPeriodModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function NewPeriodModal({ open, onOpenChange }: NewPeriodModalProps) {
    const [periodType, setPeriodType] = useState("biweekly")
    const [periodStart, setPeriodStart] = useState("")
    const [periodEnd, setPeriodEnd] = useState("")
    const [periodName, setPeriodName] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!periodStart || !periodEnd || !periodName) {
            toast.error("Complete todos los campos")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createPayrollPeriod({
                periodStart,
                periodEnd,
                periodName,
                periodType: periodType as any
            })

            if (result.success) {
                toast.success("Período creado exitosamente")
                onOpenChange(false)
                // Reset form
                setPeriodStart("")
                setPeriodEnd("")
                setPeriodName("")
                window.location.reload() // Simple refresh to show new period
            } else {
                toast.error(result.error || "Error al crear período")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    const generatePeriodName = () => {
        if (periodStart && periodEnd) {
            const start = new Date(periodStart)
            const end = new Date(periodEnd)
            const monthName = start.toLocaleDateString('es', { month: 'long' })
            return `Período ${monthName} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
        }
        return ""
    }

    const handleDatesChange = () => {
        const generated = generatePeriodName()
        if (generated && !periodName) {
            setPeriodName(generated)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Crear Período de Nómina</DialogTitle>
                        <DialogDescription>
                            Define las fechas del período de pago para tu equipo
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Period Type */}
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Período</Label>
                            <Select value={periodType} onValueChange={setPeriodType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="biweekly">Quincenal</SelectItem>
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date */}
                        <div className="space-y-2">
                            <Label htmlFor="start">Fecha de Inicio *</Label>
                            <Input
                                id="start"
                                type="date"
                                value={periodStart}
                                onChange={(e) => {
                                    setPeriodStart(e.target.value)
                                    setTimeout(handleDatesChange, 100)
                                }}
                                required
                            />
                        </div>

                        {/* End Date */}
                        <div className="space-y-2">
                            <Label htmlFor="end">Fecha de Fin *</Label>
                            <Input
                                id="end"
                                type="date"
                                value={periodEnd}
                                onChange={(e) => {
                                    setPeriodEnd(e.target.value)
                                    setTimeout(handleDatesChange, 100)
                                }}
                                required
                            />
                        </div>

                        {/* Period Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Período *</Label>
                            <Input
                                id="name"
                                value={periodName}
                                onChange={(e) => setPeriodName(e.target.value)}
                                placeholder="Ej: Quincena Enero 1-15, 2025"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Se generará automáticamente basado en las fechas
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                            ) : (
                                "Crear Período"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
