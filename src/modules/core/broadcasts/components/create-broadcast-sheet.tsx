'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Send,
    Users,
    MessageSquare,
    Mail,
    Phone,
    Loader2,
    Radio
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { createBroadcast, getRecipientCount } from '../actions'
import { toast } from 'sonner'

interface CreateBroadcastSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function CreateBroadcastSheet({ open, onOpenChange, onSuccess }: CreateBroadcastSheetProps) {
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

    // Reset form when sheet opens
    useEffect(() => {
        if (open) {
            setForm({
                name: '',
                message: '',
                channel: 'whatsapp',
                filters: {
                    status: '',
                    has_phone: true,
                    has_email: false,
                    score_min: 0
                }
            })
            setRecipientCount(0)
        }
    }, [open])

    const updateFilters = async (newFilters: typeof form.filters) => {
        setForm(prev => ({ ...prev, filters: newFilters }))
        setCountLoading(true)
        const result = await getRecipientCount(newFilters)
        if (result.success) {
            setRecipientCount(result.count)
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
        const result = await createBroadcast({
            name: form.name,
            message: form.message,
            channel: form.channel,
            filters: form.filters
        })

        if (result.success) {
            toast.success('Campaña creada exitosamente')
            onOpenChange(false)
            onSuccess()
        } else {
            toast.error(result.error || 'Error al crear campaña')
        }
        setLoading(false)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center gap-3 shrink-0 px-8 py-5 bg-white/80 backdrop-blur-md border-b border-gray-100">
                        <div className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink">
                            <Radio className="h-5 w-5" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-semibold text-gray-900">
                                Nueva Campaña
                            </SheetTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Envía un mensaje a múltiples contactos
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1">
                        <div className="px-8 py-6 space-y-6">
                            {/* Recipients Preview */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-pink/10 rounded-lg">
                                        <Users className="h-5 w-5 text-brand-pink" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Destinatarios</p>
                                        <p className="text-xs text-muted-foreground">Según los filtros actuales</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {countLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    ) : (
                                        <p className="text-2xl font-bold text-gray-900">{recipientCount}</p>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-2">
                                <Label>Nombre de la Campaña *</Label>
                                <Input
                                    placeholder="Ej: Promoción Enero 2026"
                                    value={form.name}
                                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="h-11"
                                />
                            </div>

                            {/* Channel */}
                            <div className="space-y-2">
                                <Label>Canal de Envío</Label>
                                <Select
                                    value={form.channel}
                                    onValueChange={(v) => setForm(prev => ({ ...prev, channel: v as any }))}
                                >
                                    <SelectTrigger className="h-11">
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

                            {/* Message */}
                            <div className="space-y-2">
                                <Label>Mensaje *</Label>
                                <Textarea
                                    placeholder="Escribe tu mensaje aquí... Usa {{nombre}} para personalizar"
                                    rows={5}
                                    value={form.message}
                                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Variables: {'{{nombre}}'}, {'{{empresa}}'}, {'{{telefono}}'}
                                </p>
                            </div>

                            {/* Segmentation */}
                            <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-brand-pink" />
                                    Segmentación
                                </h3>

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

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_phone" className="cursor-pointer">Solo con teléfono</Label>
                                    <Switch
                                        id="has_phone"
                                        checked={form.filters.has_phone}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_phone: v })}
                                    />
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <Label htmlFor="has_email" className="cursor-pointer">Solo con email</Label>
                                    <Switch
                                        id="has_email"
                                        checked={form.filters.has_email}
                                        onCheckedChange={(v) => updateFilters({ ...form.filters, has_email: v })}
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {form.message && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Vista Previa</Label>
                                    <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 text-sm border border-green-100">
                                        {form.message}
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="sticky bottom-0 px-8 py-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center justify-between">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-brand-pink hover:bg-brand-pink/90 text-white px-6"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" />
                            Crear Campaña
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
