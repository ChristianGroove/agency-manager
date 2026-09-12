"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Gift, Clock, ShieldCheck, AlertCircle, Calendar, Sparkles, XCircle, Loader2 } from "lucide-react"
import { format, addDays, isAfter } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { adminSetCourtesyAccess } from "@/modules/billing/saas/admin-actions"

interface CourtesyAccessModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    org: {
        id: string
        name: string
        slug?: string
        status?: string
        trial_ends_at?: string | null
        saas_subscriptions?: {
            bypass_until?: string | null
            admin_notes?: string | null
        } | null
    } | null
    onSuccess?: () => void
}

const PRESET_DAYS = [
    { label: "+7 Días", days: 7 },
    { label: "+15 Días", days: 15 },
    { label: "+30 Días", days: 30 },
    { label: "+60 Días", days: 60 },
    { label: "+90 Días", days: 90 },
]

export function CourtesyAccessModal({
    open,
    onOpenChange,
    org,
    onSuccess
}: CourtesyAccessModalProps) {
    const [selectedDate, setSelectedDate] = useState("")
    const [reason, setReason] = useState("")
    const [isSaving, setIsSaving] = useState(false)
    const [isRevoking, setIsRevoking] = useState(false)

    const currentBypass = org?.saas_subscriptions?.bypass_until || org?.trial_ends_at
    const isCurrentlyActive = currentBypass && isAfter(new Date(currentBypass), new Date())

    useEffect(() => {
        if (open && org) {
            if (currentBypass && isAfter(new Date(currentBypass), new Date())) {
                setSelectedDate(currentBypass.split('T')[0])
                setReason(org.saas_subscriptions?.admin_notes || "")
            } else {
                setSelectedDate(addDays(new Date(), 30).toISOString().split('T')[0])
                setReason("")
            }
        }
    }, [open, org, currentBypass])

    if (!org) return null

    const handleApplyPreset = (days: number) => {
        const nextDate = addDays(new Date(), days)
        setSelectedDate(nextDate.toISOString().split('T')[0])
    }

    const handleSave = async () => {
        if (!selectedDate) {
            toast.error("Selecciona una fecha límite para la cortesía")
            return
        }

        const dateObj = new Date(`${selectedDate}T23:59:59Z`)
        if (isNaN(dateObj.getTime())) {
            toast.error("Fecha inválida")
            return
        }

        if (dateObj <= new Date()) {
            toast.error("La fecha de cortesía debe ser posterior a hoy")
            return
        }

        setIsSaving(true)
        try {
            await adminSetCourtesyAccess(org.id, dateObj.toISOString(), reason.trim() || undefined)
            toast.success(`Acceso de cortesía activado para ${org.name}`)
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || "Error al configurar cortesía")
        } finally {
            setIsSaving(false)
        }
    }

    const handleRevoke = async () => {
        if (!confirm(`¿Confirmas que deseas REVOCAR el acceso de cortesía para ${org.name}?`)) return

        setIsRevoking(true)
        try {
            await adminSetCourtesyAccess(org.id, null)
            toast.success(`Acceso de cortesía revocado para ${org.name}`)
            onOpenChange(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || "Error al revocar cortesía")
        } finally {
            setIsRevoking(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px] rounded-3xl p-6">
                <DialogHeader className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Gift className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-bold">
                                Acceso de Cortesía / Gracia
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Otorga acceso temporal al tenant sin cobro ni suscripción obligatoria.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Organization Banner */}
                    <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border flex items-center justify-between">
                        <div className="min-w-0">
                            <span className="text-xs font-bold truncate block">{org.name}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{org.slug}</span>
                        </div>
                        {isCurrentlyActive ? (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Cortesía Activa ({format(new Date(currentBypass), 'dd MMM yyyy', { locale: es })})
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                Sin Cortesía Activa
                            </Badge>
                        )}
                    </div>

                    {/* Presets Grid */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                            Periodo Rápido (Presets)
                        </Label>
                        <div className="grid grid-cols-5 gap-1.5">
                            {PRESET_DAYS.map((preset) => (
                                <Button
                                    key={preset.days}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-medium rounded-xl hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                    onClick={() => handleApplyPreset(preset.days)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-1.5">
                        <Label htmlFor="courtesy_until" className="text-xs font-semibold">
                            Fecha Límite de Cortesía
                        </Label>
                        <div className="relative">
                            <Input
                                id="courtesy_until"
                                type="date"
                                value={selectedDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-xl pl-9 font-medium text-xs"
                            />
                            <Calendar className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            El tenant conservará acceso sin restricciones hasta las 23:59 UTC del día seleccionado.
                        </p>
                    </div>

                    {/* Reason / Admin Notes */}
                    <div className="space-y-1.5">
                        <Label htmlFor="courtesy_reason" className="text-xs font-semibold">
                            Motivo / Nota Administrativa (Opcional)
                        </Label>
                        <Textarea
                            id="courtesy_reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Piloto comercial, acuerdo especial, compensación por incidencia..."
                            className="rounded-xl text-xs resize-none"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2 border-t">
                    {isCurrentlyActive ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isRevoking || isSaving}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20 text-xs font-semibold"
                            onClick={handleRevoke}
                        >
                            {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                            Revocar Cortesía
                        </Button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving || isRevoking}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || isRevoking}
                            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-semibold rounded-xl"
                        >
                            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                            Aplicar Cortesía
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
