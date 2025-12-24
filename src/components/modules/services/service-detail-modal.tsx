"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Service } from "@/types"
import { Calendar, CreditCard, Clock, FileText, Activity, CheckCircle2, AlertCircle, XCircle, PauseCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ServiceDetailModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    service: Service | null
}

export function ServiceDetailModal({ isOpen, onOpenChange, service }: ServiceDetailModalProps) {
    if (!service) return null

    const statusConfig = {
        active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
        paused: { label: 'Pausado', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: PauseCircle },
        completed: { label: 'Completado', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
        cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    }

    const status = statusConfig[service.status as keyof typeof statusConfig] || statusConfig.active

    const frequencyLabels: Record<string, string> = {
        monthly: 'Mensual',
        biweekly: 'Quincenal',
        quarterly: 'Trimestral',
        semiannual: 'Semestral',
        yearly: 'Anual'
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">

                {/* Header with Status Pattern */}
                <div className={`p-6 border-b border-gray-100 ${status.color.replace('text-', 'bg-opacity-20 ')} bg-opacity-50`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm ${status.color}`}>
                            <Activity className="h-6 w-6" />
                        </div>
                        <Badge className={`${status.color} hover:${status.color} border shadow-none px-3 py-1 text-sm font-semibold rounded-lg capitalize`}>
                            {status.icon && <status.icon className="w-3.5 h-3.5 mr-1.5" />}
                            {status.label}
                        </Badge>
                    </div>
                    <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                        {service.name}
                    </DialogTitle>
                    <p className="text-gray-500 mt-1 flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        Creado el {format(new Date(service.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>

                <div className="p-6 space-y-8">

                    {/* Grid Info */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Financials */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="h-4 w-4" /> Financiero
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Monto Recurrente</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        ${service.amount?.toLocaleString()}
                                    </p>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Frecuencia</p>
                                    <p className="font-medium text-gray-900">
                                        {frequencyLabels[service.frequency || 'monthly'] || service.frequency}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Ciclos
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Próxima Facturación</p>
                                    <p className="font-medium text-indigo-600">
                                        {/* @ts-ignore */}
                                        {service.next_billing_date
                                            /* @ts-ignore */
                                            ? format(new Date(service.next_billing_date), "dd/MM/yyyy")
                                            : "No programada"}
                                    </p>
                                </div>
                                <Separator className="bg-gray-200" />
                                <div>
                                    <p className="text-sm text-gray-500 mb-1">Fecha Inicio</p>
                                    <p className="font-medium text-gray-900">
                                        {service.created_at
                                            ? format(new Date(service.created_at), "dd/MM/yyyy")
                                            : "No definida"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {service.description && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4" /> Detalles Adicionales
                            </h4>
                            <div className="bg-white p-4 rounded-xl border border-gray-200 text-gray-600 text-sm leading-relaxed">
                                {service.description}
                            </div>
                        </div>
                    )}

                </div>

                <DialogFooter className="bg-gray-50 p-4 border-t border-gray-100">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Cerrar Detalle
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    )
}
