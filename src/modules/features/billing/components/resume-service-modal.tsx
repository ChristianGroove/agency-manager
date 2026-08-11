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
import { toggleServiceStatusAction as toggleServiceStatus } from "@/modules/features/billing/billing-actions"

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
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl bg-white dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                            <PlayCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Reanudar Servicio
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                Configura las condiciones para reactivar <strong>{service.name}</strong>.
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-6">
                        {/* Frequency Selector */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">Frecuencia de Facturación</Label>
                            <Select value={newFrequency} onValueChange={setNewFrequency}>
                                <SelectTrigger className="bg-white dark:bg-black/20 border-slate-200 dark:border-white/10 h-10 rounded-xl dark:text-white text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800 dark:text-white">
                                    <SelectItem value="monthly">Mensual</SelectItem>
                                    <SelectItem value="biweekly">Quincenal</SelectItem>
                                    <SelectItem value="quarterly">Trimestral</SelectItem>
                                    <SelectItem value="semiannual">Semestral</SelectItem>
                                    <SelectItem value="yearly">Anual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Reset Switch */}
                        <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/60">
                            <div className="space-y-0.5 pr-2">
                                <Label className="text-xs font-bold text-gray-900 dark:text-white">Reiniciar ciclo de cobro</Label>
                                <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-relaxed">
                                    Si activas esto, la próxima factura se generará en 1 periodo a partir de HOY.
                                </p>
                            </div>
                            <Switch
                                checked={shouldResetDate}
                                onCheckedChange={setShouldResetDate}
                            />
                        </div>
                    </div>

                    {/* Sticky Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5 flex items-center justify-between z-20 shrink-0">
                        <Button variant="ghost" className="text-slate-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-xl h-10 px-4 text-xs font-semibold" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleResume}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 px-8 rounded-xl h-11 font-bold cursor-pointer transition-all"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                            Confirmar Reactivación
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
