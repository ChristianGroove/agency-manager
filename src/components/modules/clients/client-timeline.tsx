"use client"

import { useEffect, useState } from "react"
import { getClientHistory } from "@/lib/actions/history" // You'll need to create this first
import {
    FileText,
    Zap,
    DollarSign,
    RefreshCw,
    Clock,
    PauseCircle,
    PlayCircle,
    CheckCircle2,
    AlertCircle,
    User,
    Mail,
    Trash2
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ClientTimelineProps {
    clientId: string
}

// Event Translation Map
const EVENT_LABELS: Record<string, string> = {
    'invoice.created': 'Factura Generada',
    'invoice.paid': 'Pago Registrado',
    'invoice.sent': 'Factura Enviada',
    'invoice.status_change': 'Cambio de Estado',
    'service.created': 'Servicio Contratado',
    'service.paused': 'Servicio Pausado',
    'service.resumed': 'Servicio Reactivado',
    'service.cancelled': 'Servicio Cancelado',
    'cycle.created': 'Ciclo de Facturación Iniciado',
    'default': 'Evento del Sistema'
}

type TimelineEvent = {
    id: string
    entity_type: string
    event_type: string
    created_at: string
    payload: any
    triggered_by?: string
}

export function ClientTimeline({ clientId }: ClientTimelineProps) {
    const [events, setEvents] = useState<TimelineEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadHistory()
    }, [clientId])

    const loadHistory = async () => {
        setLoading(true)
        try {
            const { success, data } = await getClientHistory(clientId)
            if (success && data) {
                setEvents(data)
            }
        } catch (error) {
            console.error("Failed to load history", error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (type: string, payload: any) => {
        if (type.startsWith('document') || type.includes('invoice')) return <FileText className="h-4 w-4 text-blue-500" />
        if (type.startsWith('service') && type.includes('create')) return <Zap className="h-4 w-4 text-indigo-500" />
        if (type.includes('pause')) return <PauseCircle className="h-4 w-4 text-amber-500" />
        if (type.includes('resume')) return <PlayCircle className="h-4 w-4 text-emerald-500" />
        if (type.includes('payment') || type.includes('paid')) return <DollarSign className="h-4 w-4 text-emerald-600" />
        if (type.includes('cycle')) return <RefreshCw className="h-4 w-4 text-purple-500" />
        if (type.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />

        return <Clock className="h-4 w-4 text-gray-400" />
    }

    const formatMessage = (event: TimelineEvent) => {
        const { entity_type, event_type, payload } = event
        const key = `${entity_type}.${event_type}`

        // 1. Get Base Label: Try constructed key first, then raw event_type
        const baseLabel = EVENT_LABELS[key] || EVENT_LABELS[event_type] || event.event_type.replace(/_/g, ' ')

        // 2. Add Detail based on Payload (Enhancement)
        if (entity_type === 'invoice') {
            if (event_type === 'created') return `${baseLabel}: $${payload.total?.toLocaleString() ?? '0'}`
            if (event_type === 'paid') return `${baseLabel}: $${payload.amount?.toLocaleString() ?? '0'}`
        }
        if (entity_type === 'service') {
            // Check for both raw event type (e.g. 'service.paused') or suffixed (e.g. 'paused')
            if (event_type.includes('paused') || event_type.includes('resumed')) {
                return baseLabel
            }
        }

        return baseLabel
    }

    const getActorName = (trigger: string | undefined) => {
        if (!trigger || trigger === 'system') return 'Sistema'
        if (trigger === 'user') return 'Administrador' // Should ideally match to a real user name if available
        return trigger
    }

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-xl">
                <p className="text-sm text-gray-500">No hay actividad registrada aún.</p>
            </div>
        )
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    Actividad Reciente
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
                <div className="relative pl-4 border-l border-gray-200 space-y-8">
                    {events.map((event, index) => (
                        <div key={event.id} className="relative group">
                            {/* Dot */}
                            <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-gray-200 border-2 border-white group-hover:bg-indigo-500 transition-colors" />

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white rounded shadow-sm border border-gray-100">
                                        {getIcon(`${event.entity_type}.${event.event_type}`, event.payload)}
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-gray-700 mt-1">
                                    {formatMessage(event)}
                                </p>
                                {/* Actor Display */}
                                <div className="flex items-center gap-1 mt-1">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-400 capitalize">
                                        {getActorName(event.triggered_by)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
