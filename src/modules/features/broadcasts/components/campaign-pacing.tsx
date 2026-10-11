'use client'

import { Check, Gauge, Leaf, Zap } from 'lucide-react'
import type { DeliveryConfig } from '../marketing-utils'
import { cn } from '@/modules/infrastructure/utils/utils'

const modes = [
    { value: 'stealth', title: 'Conservador', interval: '180 s', icon: Leaf, color: 'text-emerald-600', dot: 'bg-emerald-500' },
    { value: 'growth', title: 'Equilibrado', interval: '30 s', icon: Gauge, color: 'text-amber-600', dot: 'bg-amber-500' },
    { value: 'turbo', title: 'Rápido', interval: '5 s', icon: Zap, color: 'text-rose-600', dot: 'bg-rose-500' },
] as const

export function CampaignPacing({ value, disabled, onChange, channel = 'whatsapp' }: { channel?: 'whatsapp' | 'email';
    value: DeliveryConfig; disabled: boolean; onChange: (value: DeliveryConfig) => void;
}) {
    return <div className="space-y-3">
        <div role="group" aria-label="Ritmo de envío" className="grid grid-cols-3 gap-2">
            {modes.map(mode => <button
                key={mode.value} type="button" disabled={disabled} aria-pressed={value.mode === mode.value}
                aria-label={`${mode.title}: ${mode.interval} de intervalo base`}
                onClick={() => onChange({ ...value, mode: mode.value })}
                className={cn('relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                    value.mode === mode.value ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/60 bg-background hover:bg-muted/40')}
            >
                <mode.icon className={cn('h-4 w-4', mode.color)} />
                <span className="text-[11px] font-semibold">{mode.title}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn('h-1.5 w-1.5 rounded-full', mode.dot)} />{mode.interval}</span>
                {value.mode === mode.value && <Check className="absolute right-2 top-2 h-3 w-3 text-primary" />}
            </button>)}
        </div>
        {value.mode === 'turbo' && <p role="status" className="text-xs text-rose-700 dark:text-rose-300">{channel === 'email' ? 'El ritmo rápido requiere capacidad validada de tu proveedor SMTP.' : 'El ritmo rápido requiere capacidad validada del número.'}</p>}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" disabled={disabled} checked={value.humanize} onChange={event => onChange({ ...value, humanize: event.target.checked })} />
            Añadir variación al intervalo
        </label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">Intervalo base compartido entre campañas del emisor. Los colores indican ritmo, no seguridad: ningún modo evita bloqueos ni sustituye la autorización y los límites del proveedor.</p>
    </div>
}
