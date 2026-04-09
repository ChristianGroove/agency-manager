'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    ArrowLeft,
    Send,
    Radio,
    CheckCircle2,
    Clock,
    AlertCircle,
    Users,
    MessageSquare,
    Eye,
    Trash2
} from 'lucide-react'
import { getBroadcast, Broadcast, sendBroadcast, deleteBroadcast } from '../actions'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
    draft: { label: 'Borrador', icon: Clock, color: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Programado', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    sending: { label: 'Enviando', icon: Send, color: 'bg-yellow-100 text-yellow-700 animate-pulse' },
    completed: { label: 'Completado', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    failed: { label: 'Fallido', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
}

export function BroadcastDetailView({ id }: { id: string }) {
    const router = useRouter()
    const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadBroadcast()
    }, [id])

    async function loadBroadcast() {
        setLoading(true)
        const result = await getBroadcast(id)
        if (result.success && result.broadcast) {
            setBroadcast(result.broadcast)
        }
        setLoading(false)
    }

    async function handleSend() {
        if (!confirm('¿Enviar esta campaña ahora?')) return
        const result = await sendBroadcast(id)
        if (result.success) {
            toast.success('Campaña iniciada')
            loadBroadcast()
        } else {
            toast.error(result.error)
        }
    }

    async function handleDelete() {
        if (!confirm('¿Eliminar esta campaña?')) return
        const result = await deleteBroadcast(id)
        if (result.success) {
            toast.success('Campaña eliminada')
            router.push('/crm/broadcasts')
        } else {
            toast.error(result.error)
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                <Card className="p-6">
                    <div className="h-32 bg-muted rounded animate-pulse" />
                </Card>
            </div>
        )
    }

    if (!broadcast) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Campaña no encontrada</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </div>
        )
    }

    const statusConfig = STATUS_CONFIG[broadcast.status]
    const StatusIcon = statusConfig.icon

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{broadcast.name}</h1>
                            <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Creada {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true, locale: es })}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                        <Button onClick={handleSend}>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar Ahora
                        </Button>
                    )}
                    <Button variant="outline" className="text-red-600" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{broadcast.total_recipients}</p>
                    <p className="text-xs text-muted-foreground">Destinatarios</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{broadcast.sent_count}</p>
                    <p className="text-xs text-muted-foreground">Enviados</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{broadcast.delivered_count}</p>
                    <p className="text-xs text-muted-foreground">Entregados</p>
                </Card>
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{broadcast.failed_count}</p>
                    <p className="text-xs text-muted-foreground">Fallidos</p>
                </Card>
            </div>

            {/* Message Content */}
            <Card className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensaje
                </h2>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{broadcast.message}</p>
                </div>
            </Card>

            {/* Filters */}
            <Card className="p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Segmentación Aplicada
                </h2>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(broadcast.filters || {}).filter(([_, value]) => Boolean(value)).map(([key, value]) => (
                        <Badge key={key} variant="secondary">
                            {key}: {String(value)}
                        </Badge>
                    ))}
                    {Object.keys(broadcast.filters || {}).length === 0 && (
                        <p className="text-sm text-muted-foreground">Sin filtros específicos</p>
                    )}
                </div>
            </Card>

            {/* Timeline */}
            {broadcast.sent_at && (
                <Card className="p-6">
                    <h2 className="font-semibold mb-4">Timeline</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <span>Creada: {format(new Date(broadcast.created_at), 'PPp', { locale: es })}</span>
                        </div>
                        {broadcast.sent_at && (
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Enviada: {format(new Date(broadcast.sent_at), 'PPp', { locale: es })}</span>
                            </div>
                        )}
                        {broadcast.completed_at && (
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span>Completada: {format(new Date(broadcast.completed_at), 'PPp', { locale: es })}</span>
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
