"use client"

import { useState } from "react"
import { createManualWorkLog } from "../../actions/payroll-actions"
import { getCleaningStaff } from "../../actions/staff-actions"
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
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

interface AddWorkLogModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    preselectedStaffId?: string
    onSuccess?: () => void
}

export function AddWorkLogModal({ open, onOpenChange, preselectedStaffId, onSuccess }: AddWorkLogModalProps) {
    const [staff, setStaff] = useState<any[]>([])
    const [selectedStaffId, setSelectedStaffId] = useState(preselectedStaffId || "")
    const [startDate, setStartDate] = useState("")
    const [startTime, setStartTime] = useState("09:00")
    const [endDate, setEndDate] = useState("")
    const [endTime, setEndTime] = useState("17:00")
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (open) {
            loadStaff()
            // Set default to today
            const today = new Date().toISOString().split('T')[0]
            setStartDate(today)
            setEndDate(today)
            if (preselectedStaffId) setSelectedStaffId(preselectedStaffId)
        }
    }, [open, preselectedStaffId])

    const loadStaff = async () => {
        const data = await getCleaningStaff()
        setStaff(data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedStaffId || !startDate || !endDate) {
            toast.error("Complete todos los campos requeridos")
            return
        }

        const startDateTime = `${startDate}T${startTime}:00`
        const endDateTime = `${endDate}T${endTime}:00`

        const start = new Date(startDateTime)
        const end = new Date(endDateTime)

        if (end <= start) {
            toast.error("La hora de fin debe ser posterior a la hora de inicio")
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createManualWorkLog({
                staffId: selectedStaffId,
                startTime: startDateTime,
                endTime: endDateTime,
                notes
            })

            if (result.success) {
                toast.success("Registro de horas creado exitosamente")
                onOpenChange(false)
                // Reset form
                setSelectedStaffId("")
                setNotes("")
                if (onSuccess) {
                    onSuccess()
                } else {
                    window.location.reload()
                }
            } else {
                toast.error(result.error || "Error al crear registro")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error inesperado")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Agregar Registro de Horas Manual</DialogTitle>
                        <DialogDescription>
                            Crea un registro de horas trabajadas manualmente
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Staff Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="staff">Personal *</Label>
                            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar personal" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Fecha de Inicio *</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Hora de Inicio *</Label>
                                <Input
                                    id="startTime"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* End Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="endDate">Fecha de Fin *</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime">Hora de Fin *</Label>
                                <Input
                                    id="endTime"
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notas</Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Horas extras del fin de semana"
                                rows={3}
                            />
                        </div>

                        {/* Preview */}
                        {startDate && endDate && startTime && endTime && (
                            <div className="bg-blue-50 p-3 rounded-lg text-sm">
                                <strong>Vista previa:</strong>
                                <div className="mt-1">
                                    {(() => {
                                        const start = new Date(`${startDate}T${startTime}`)
                                        const end = new Date(`${endDate}T${endTime}`)
                                        const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2)
                                        return `${hours} horas trabajadas`
                                    })()}
                                </div>
                            </div>
                        )}
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
                        >
                            {isSubmitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
                            ) : (
                                "Crear Registro"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
