"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CalendarClock, PlayCircle } from "lucide-react"
import { Service } from "@/types"
import { addMonths, addWeeks, addYears, parseISO } from "date-fns"
import { toggleServiceStatus } from "@/modules/verticals/agency/services/actions"

interface ResumeServiceModalProps {
    service: any
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function ResumeServiceModal({ service, isOpen, onClose, onSuccess }: ResumeServiceModalProps) {
    const [loading, setLoading] = useState(false)
    const [newFrequency, setNewFrequency] = useState<string>(service?.frequency || 'monthly')
    const [shouldResetDate, setShouldResetDate] = useState(true)

    if (!service) return null

    const handleResume = async () => {
        setLoading(true)
        try {
            let newDate = undefined
            if (shouldResetDate) {
                // Calculate next date based on TODAY + Frequency
                const now = new Date()
                if (newFrequency === 'monthly') newDate = addMonths(now, 1).toISOString()
                else if (newFrequency === 'biweekly') newDate = addWeeks(now, 2).toISOString()
                else if (newFrequency === 'quarterly') newDate = addMonths(now, 3).toISOString()
                else if (newFrequency === 'semiannual') newDate = addMonths(now, 6).toISOString()
                else if (newFrequency === 'yearly') newDate = addYears(now, 1).toISOString()
            }

            // Toggle service to active (only 2 arguments)
            const result = await toggleServiceStatus(service.id, 'active')

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert("Error al reanudar el servicio")
            }
        } catch (error) {
            console.error(error)
            alert("Error desconocido")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-700">
                        <PlayCircle className="h-5 w-5" />
                        Reanudar Servicio
                    </DialogTitle>
                    <DialogDescription>
                        Configura las condiciones para reactivar <strong>{service.name}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Frequency Selector */}
                    <div className="space-y-2">
                        <Label>Frecuencia de Facturación</Label>
                        <Select value={newFrequency} onValueChange={setNewFrequency}>
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

                    {/* Date Reset Switch */}
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-gray-50/50">
                        <div className="space-y-0.5">
                            <Label className="text-base">Reiniciar ciclo de cobro</Label>
                            <p className="text-xs text-muted-foreground">
                                Si activas esto, la próxima factura se generará en 1 periodo a partir de HOY.
                            </p>
                        </div>
                        <Switch
                            checked={shouldResetDate}
                            onCheckedChange={setShouldResetDate}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button
                        onClick={handleResume}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                        Confirmar Reactivación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
