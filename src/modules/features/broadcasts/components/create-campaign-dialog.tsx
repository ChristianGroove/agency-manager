'use client'

import { useState, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Smartphone, Mail, Sparkles, Zap, Shield, Rocket } from 'lucide-react'
import { cn } from '@/modules/infrastructure/utils/utils'
import { createCampaign } from '../marketing-actions'
import type { MarketingChannel } from '../marketing-preflight-actions'

export interface CreateCampaignDialogProps {
    onClose: () => void
    onCreated: (id: string) => void
    initialChannel?: 'whatsapp' | 'email'
    channels?: MarketingChannel[]
}

export function CreateCampaignDialog({
    onClose,
    onCreated,
    initialChannel,
    channels = [],
}: CreateCampaignDialogProps) {
    const [name, setName] = useState('')
    const [goal, setGoal] = useState('')
    const [selectedEmitter, setSelectedEmitter] = useState<string>('')
    const [deliveryMode, setDeliveryMode] = useState<'stealth' | 'growth' | 'turbo'>('growth')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const saving = useRef(false)

    const isEmail = initialChannel === 'email'

    // Filter available senders for this channel type
    const availableSenders = channels.filter(channel =>
        isEmail ? channel.id.startsWith('smtp:') : !channel.id.startsWith('smtp:')
    )

    async function save(event: React.FormEvent) {
        event.preventDefault()
        if (saving.current || !name.trim()) return
        saving.current = true
        setBusy(true)
        setError('')
        try {
            const payload: Parameters<typeof createCampaign>[0] = {
                name: name.trim(),
            }
            if (initialChannel) {
                payload.channel = initialChannel
                payload.delivery_mode = deliveryMode
            }
            if (goal.trim()) {
                payload.goal = goal.trim()
            }
            if (selectedEmitter) {
                if (isEmail && selectedEmitter.startsWith('smtp:')) {
                    payload.smtp_config_id = selectedEmitter.replace('smtp:', '')
                } else if (!isEmail) {
                    payload.connection_id = selectedEmitter
                }
            }

            const result = await createCampaign(payload)
            if (!result.success || !result.campaign) {
                setError(result.error || 'No se pudo crear el borrador.')
                return
            }
            onCreated(result.campaign.id)
        } catch {
            setError('No se confirmó la creación. Actualiza la lista antes de volver a crearla.')
        } finally {
            saving.current = false
            setBusy(false)
        }
    }

    return (
        <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
            <DialogContent className="rounded-2xl border-border bg-card sm:max-w-xl p-0 overflow-hidden shadow-2xl">
                {/* Header con micro-branding del canal elegido */}
                <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
                    <DialogHeader className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            {isEmail ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300">
                                    <Mail className="h-3 w-3" />
                                    Canal: Email Masivo (SMTP)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                    <Smartphone className="h-3 w-3" />
                                    Canal: WhatsApp Masivo (Meta API)
                                </span>
                            )}
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                · Nuevo borrador
                            </span>
                        </div>

                        <DialogTitle className="text-xl font-bold tracking-tight">
                            {isEmail ? 'Configurar Campaña de Email' : 'Configurar Campaña de WhatsApp'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {isEmail
                                ? 'Establece el nombre y el remitente para iniciar tu campaña de correo masivo corporativo.'
                                : 'Establece el nombre y la línea oficial de WhatsApp para iniciar tu campaña masiva.'}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Formulario de Configuración Unificada */}
                <form onSubmit={save} className="space-y-5 px-6 py-5">
                    {/* Sección 1: Identificación */}
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="new-campaign-name" className="text-xs font-bold text-foreground">
                                Nombre
                            </Label>
                            <Input
                                id="new-campaign-name"
                                autoFocus
                                maxLength={160}
                                value={name}
                                disabled={busy}
                                onChange={e => setName(e.target.value)}
                                placeholder={isEmail ? 'Ej. Newsletter Octubre - Clientes VIP' : 'Ej. Promoción 2x1 Fin de Mes'}
                                className="h-10 rounded-xl border-border/80 text-sm focus:border-primary"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="new-campaign-goal" className="text-xs font-semibold text-muted-foreground">
                                Objetivo o notas <span className="text-[10px] font-normal text-muted-foreground/75">(opcional)</span>
                            </Label>
                            <Input
                                id="new-campaign-goal"
                                maxLength={100}
                                value={goal}
                                disabled={busy}
                                onChange={e => setGoal(e.target.value)}
                                placeholder="Ej. Fidelización o reactivación de clientes inactivos"
                                className="h-9 rounded-xl border-border/70 text-xs"
                            />
                        </div>
                    </div>

                    {/* Sección 2: Selección de Emisor */}
                    <div className="space-y-1.5 rounded-xl border border-border/50 bg-muted/15 p-3.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground">
                                {isEmail ? 'Cuenta SMTP remitente' : 'Línea de WhatsApp emisora'}
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                                {availableSenders.length > 0 ? `${availableSenders.length} disponible(s)` : 'Opcional para borrador'}
                            </span>
                        </div>
                        {availableSenders.length > 0 ? (
                            <Select
                                value={selectedEmitter}
                                onValueChange={setSelectedEmitter}
                                disabled={busy}
                            >
                                <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                                    <SelectValue placeholder={isEmail ? 'Selecciona una cuenta SMTP...' : 'Selecciona un número de WhatsApp...'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableSenders.map(s => (
                                        <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-[11px] text-muted-foreground">
                                {isEmail
                                    ? 'No hay cuentas SMTP configuradas aún. Podrás asociarla luego en el editor o en Ajustes.'
                                    : 'No hay líneas activas de WhatsApp seleccionadas. Podrás asociarla en el editor.'}
                            </p>
                        )}
                    </div>

                    {/* Sección 3: Ritmo de Envío Inicial */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground">
                            Ritmo de entrega inicial
                        </Label>
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setDeliveryMode('stealth')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer focus:outline-none",
                                    deliveryMode === 'stealth'
                                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <Shield className="h-4 w-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-bold block">Conservador</span>
                                <span className="text-[10px] opacity-75">180s por lote</span>
                            </button>

                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setDeliveryMode('growth')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer focus:outline-none",
                                    deliveryMode === 'growth'
                                        ? "border-primary/50 bg-primary/10 text-primary ring-2 ring-primary/20"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <Zap className="h-4 w-4 mb-1 text-primary" />
                                <span className="text-xs font-bold block">Equilibrado</span>
                                <span className="text-[10px] opacity-75">30s (Estándar)</span>
                            </button>

                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setDeliveryMode('turbo')}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer focus:outline-none",
                                    deliveryMode === 'turbo'
                                        ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20"
                                        : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                <Rocket className="h-4 w-4 mb-1 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-bold block">Rápido</span>
                                <span className="text-[10px] opacity-75">5s por lote</span>
                            </button>
                        </div>
                    </div>

                    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

                    {/* Footer de Acciones */}
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={onClose}
                            className="rounded-xl text-xs font-semibold cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            disabled={busy || !name.trim()}
                            className={cn(
                                "rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer",
                                isEmail
                                    ? "bg-purple-600 hover:bg-purple-500"
                                    : "bg-emerald-600 hover:bg-emerald-500"
                            )}
                        >
                            {busy ? 'Creando borrador…' : 'Crear borrador'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
