'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
    ArrowLeft,
    Send,
    Users,
    MessageSquare,
    Mail,
    Phone,
    Loader2,
    Sparkles
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { createQuickCampaign, getRecipientCount } from '../marketing-actions'
import { toast } from 'sonner'

export function CreateBroadcastView() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [recipientCount, setRecipientCount] = useState(0)
    const [countLoading, setCountLoading] = useState(false)

    const [form, setForm] = useState({
        name: '',
        message: '',
        channel: 'whatsapp' as 'whatsapp' | 'sms' | 'email',
        filters: {
            status: '',
            has_phone: true,
            has_email: false,
            score_min: 0
        }
    })

    const updateFilters = async (newFilters: typeof form.filters) => {
        setForm(prev => ({ ...prev, filters: newFilters }))
        setCountLoading(true)
        const result = await getRecipientCount(newFilters)
        if (result.success) {
            setRecipientCount(result.count ?? 0)
        }
        setCountLoading(false)
    }

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            toast.error('Ingresa un nombre para la campaña')
            return
        }
        if (!form.message.trim()) {
            toast.error('Ingresa el mensaje a enviar')
            return
        }

        setLoading(true)
        // Use the new Unified Action
        const result = await createQuickCampaign({
            name: form.name,
            message: form.message,
            channel: form.channel,
            filters: form.filters
        })

        if (result.success) {
            toast.success('Campaña creada exitosamente')
            router.push('/crm/marketing')
        } else {
            toast.error(result.error || 'Error al crear campaña')
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nueva Campaña</h1>
                    <p className="text-muted-foreground">
                        Configura y envía un mensaje a múltiples contactos
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Form */}
                <div className="col-span-2 space-y-6">
                    {/* Basic Info */}
                    <Card className="p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-brand-pink" />
                            Información Básica
                        </h2>

                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Campaña</Label>
                            <Input
                                id="name"
                                placeholder="Ej: Promoción Enero 2026"
                                value={form.name}
                                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="channel">Canal</Label>
                            <Select
                                value={form.channel}
                                onValueChange={(v) => setForm(prev => ({ ...prev, channel: v as any }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="whatsapp">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-4 w-4 text-green-600" />
                                            WhatsApp
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="sms">
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-blue-600" />
                                            SMS
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="email">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-purple-600" />
                                            Email
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message">Mensaje</Label>
                            <Textarea
                                id="message"
                                placeholder="Escribe tu mensaje aquí... Usa {{nombre}} para personalizar"
                                rows={5}
                                value={form.message}
                                onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Variables disponibles: {'{{nombre}}'}, {'{{empresa}}'}, {'{{telefono}}'}
                            </p>
                        </div>
                    </Card>

                    {/* Filters */}
                    <Card className="p-6 space-y-4">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-brand-pink" />
                            Segmentación
                        </h2>

                        <div className="space-y-2">
                            <Label>Estado del Lead</Label>
                            <Select
                                value={form.filters.status || 'all'}
                                onValueChange={(v) => updateFilters({ ...form.filters, status: v === 'all' ? '' : v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los estados</SelectItem>
                                    <SelectItem value="open">Abierto</SelectItem>
                                    <SelectItem value="qualified">Calificado</SelectItem>
                                    <SelectItem value="negotiation">Negociación</SelectItem>
                                    <SelectItem value="won">Ganado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="has_phone">Solo con teléfono</Label>
                            <Switch
                                id="has_phone"
                                checked={form.filters.has_phone}
                                onCheckedChange={(v) => updateFilters({ ...form.filters, has_phone: v })}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="has_email">Solo con email</Label>
                            <Switch
                                id="has_email"
                                checked={form.filters.has_email}
                                onCheckedChange={(v) => updateFilters({ ...form.filters, has_email: v })}
                            />
                        </div>
                    </Card>
                </div>

                {/* Right Column - Preview */}
                <div className="space-y-6">
                    {/* Recipients Count */}
                    <Card className="p-6 text-center">
                        <Users className="h-8 w-8 mx-auto text-brand-pink mb-2" />
                        {countLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        ) : (
                            <p className="text-3xl font-bold">{recipientCount}</p>
                        )}
                        <p className="text-sm text-muted-foreground">Destinatarios</p>
                    </Card>

                    {/* Message Preview */}
                    <Card className="p-6">
                        <h3 className="font-semibold mb-3">Vista Previa</h3>
                        <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-sm">
                            {form.message || 'Tu mensaje aparecerá aquí...'}
                        </div>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-2">
                        <Button
                            className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Crear Campaña
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.back()}
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
