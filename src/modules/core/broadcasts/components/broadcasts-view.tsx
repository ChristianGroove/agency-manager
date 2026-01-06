'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Plus,
    Send,
    Radio,
    CheckCircle2,
    Clock,
    AlertCircle,
    MoreHorizontal,
    Trash2,
    Eye,
    Users
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { getBroadcasts, Broadcast, deleteBroadcast, sendBroadcast } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SplitText } from "@/components/ui/split-text"

const STATUS_CONFIG = {
    draft: { label: 'Borrador', icon: Clock, color: 'bg-gray-100 text-gray-700' },
    scheduled: { label: 'Programado', icon: Clock, color: 'bg-blue-100 text-blue-700' },
    sending: { label: 'Enviando', icon: Send, color: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Completado', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
    failed: { label: 'Fallido', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
}

export function BroadcastsView() {
    const router = useRouter()
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadBroadcasts()
    }, [])

    async function loadBroadcasts() {
        setLoading(true)
        const result = await getBroadcasts()
        if (result.success) {
            setBroadcasts(result.broadcasts)
        }
        setLoading(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Eliminar esta campaña?')) return
        const result = await deleteBroadcast(id)
        if (result.success) {
            toast.success('Campaña eliminada')
            loadBroadcasts()
        } else {
            toast.error(result.error)
        }
    }

    async function handleSend(id: string) {
        if (!confirm('¿Enviar esta campaña ahora?')) return
        const result = await sendBroadcast(id)
        if (result.success) {
            toast.success('Campaña iniciada')
            loadBroadcasts()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Broadcasts</SplitText>
                    </h2>
                    <p className="text-muted-foreground mt-1">Envía mensajes masivos a tus leads y contactos</p>
                </div>
                <Button onClick={() => router.push('/crm/broadcasts/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Campaña
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Radio className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{broadcasts.length}</p>
                            <p className="text-xs text-muted-foreground">Total Campañas</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {broadcasts.filter(b => b.status === 'completed').length}
                            </p>
                            <p className="text-xs text-muted-foreground">Completadas</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                            <Send className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {broadcasts.reduce((sum, b) => sum + b.sent_count, 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Mensajes Enviados</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {broadcasts.reduce((sum, b) => sum + b.delivered_count, 0)}
                            </p>
                            <p className="text-xs text-muted-foreground">Entregados</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Broadcasts List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="p-4 animate-pulse">
                            <div className="h-6 w-48 bg-muted rounded" />
                            <div className="h-4 w-32 bg-muted rounded mt-2" />
                        </Card>
                    ))}
                </div>
            ) : broadcasts.length === 0 ? (
                <Card className="p-12 text-center">
                    <Radio className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay campañas</h3>
                    <p className="text-muted-foreground mb-4">
                        Crea tu primera campaña de broadcast para enviar mensajes masivos
                    </p>
                    <Button onClick={() => router.push('/crm/broadcasts/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Campaña
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {broadcasts.map(broadcast => {
                        const statusConfig = STATUS_CONFIG[broadcast.status]
                        const StatusIcon = statusConfig.icon

                        return (
                            <Card key={broadcast.id} className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <Radio className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{broadcast.name}</h3>
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {broadcast.message.substring(0, 60)}...
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Recipients */}
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{broadcast.total_recipients}</p>
                                            <p className="text-xs text-muted-foreground">destinatarios</p>
                                        </div>

                                        {/* Status Badge */}
                                        <Badge variant="outline" className={cn("gap-1", statusConfig.color)}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusConfig.label}
                                        </Badge>

                                        {/* Date */}
                                        <div className="text-right min-w-[100px]">
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(broadcast.created_at), { addSuffix: true, locale: es })}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => router.push(`/crm/broadcasts/${broadcast.id}`)}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    Ver Detalles
                                                </DropdownMenuItem>
                                                {(broadcast.status === 'draft' || broadcast.status === 'scheduled') && (
                                                    <DropdownMenuItem onClick={() => handleSend(broadcast.id)}>
                                                        <Send className="h-4 w-4 mr-2" />
                                                        Enviar Ahora
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => handleDelete(broadcast.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
