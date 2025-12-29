"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CreateInvoiceSheet } from "@/modules/verticals/agency/invoicing/create-invoice-sheet"
import { Calendar, CreditCard, User, FileText, CheckCircle2, AlertCircle, Clock, Globe, Hash } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ServiceDetailsModalProps {
    service: any
    isOpen: boolean
    onClose: () => void
}

export function ServiceDetailsModal({ service, isOpen, onClose }: ServiceDetailsModalProps) {
    if (!service) return null

    const getFrequencyLabel = (freq?: string) => {
        if (!freq) return '-'
        const map: Record<string, string> = {
            monthly: 'Mensual',
            biweekly: 'Quincenal',
            quarterly: 'Trimestral',
            semiannual: 'Semestral',
            yearly: 'Anual'
        }
        return map[freq] || freq
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-'
        return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
                <DialogTitle className="sr-only">Detalles del Servicio</DialogTitle>
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2 opacity-90">
                                <Hash className="h-4 w-4" />
                                <span className="text-xs font-mono uppercase tracking-wider">{service.id.slice(0, 8)}</span>
                            </div>
                            <h2 className="text-2xl font-bold leading-tight">{service.name}</h2>
                            <p className="text-gray-300 text-sm mt-1 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {service.client?.name || 'Cliente sin asignar'}
                            </p>
                        </div>
                        <Badge variant="outline" className={cn(
                            "capitalize border-0 font-semibold px-3 py-1",
                            service.status === 'active' ? "bg-emerald-500/20 text-emerald-100" :
                                service.status === 'paused' ? "bg-amber-500/20 text-amber-100" :
                                    "bg-white/10 text-gray-300"
                        )}>
                            {service.status === 'active' ? 'Activo' : service.status === 'paused' ? 'Pausado' : 'Cancelado'}
                        </Badge>
                    </div>
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Info Grid */}
                    <div className="grid grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 align-middle">
                                <CreditCard className="h-3.5 w-3.5" />
                                Costo & Tipo
                            </span>
                            <div className="flex items-baseline gap-1 mt-1.5">
                                <span className="text-2xl font-bold text-gray-900">${service.amount?.toLocaleString()}</span>
                                <span className="text-xs text-gray-500 font-medium">
                                    / {service.type === 'recurring' ? getFrequencyLabel(service.frequency) : 'proyecto'}
                                </span>
                            </div>
                            <Badge variant="secondary" className="mt-2 bg-gray-100 text-gray-600 border-gray-200">
                                {service.type === 'recurring' ? 'Suscripción Recurrente' : 'Pago Único'}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Cronología
                                </span>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Creado:</span>
                                        <span className="font-medium text-gray-900">{formatDate(service.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Próximo Cobro:</span>
                                        <span className="font-medium text-gray-900">{/* Placeholder for logic */}-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Info */}
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                <FileText className="h-3.5 w-3.5" />
                                Descripción
                            </span>
                            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed border border-gray-100">
                                {service.description || "Sin descripción disponible para este servicio."}
                            </div>
                        </div>

                        {service.client?.company_name && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-blue-800 text-sm">
                                <Globe className="h-4 w-4 text-blue-500" />
                                <span>Facturación vinculada a: <strong>{service.client.company_name}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                    >
                        Cerrar Detalle
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
