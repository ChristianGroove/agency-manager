'use client'

import type { DeliveryConfig } from '../marketing-utils'
import { cn } from '@/modules/infrastructure/utils/utils'

const modes = [
    { value: 'stealth', title: 'Conservador', interval: '180 s' },
    { value: 'growth', title: 'Equilibrado', interval: '30 s' },
    { value: 'turbo', title: 'Rápido', interval: '5 s' },
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
                className={cn('flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                    value.mode === mode.value ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border/60 bg-background hover:bg-muted/40')}
            >
                <span className="text-[11px] font-semibold">{mode.title}</span>
                <span className="text-xs text-muted-foreground">{mode.interval}</span>
            </button>)}
        </div>
        {value.mode === 'turbo' && <p role="status" className="text-xs text-rose-700 dark:text-rose-300">{channel === 'email' ? 'El ritmo rápido requiere capacidad validada de tu proveedor SMTP.' : 'El ritmo rápido requiere capacidad validada del número.'}</p>}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="h-4 w-4 accent-primary" disabled={disabled} checked={value.humanize} onChange={event => onChange({ ...value, humanize: event.target.checked })} />
            Añadir variación al intervalo
        </label>
        <p className="text-[11px] leading-relaxed text-muted-foreground">Intervalo mínimo compartido por emisor, sujeto a los límites del proveedor.</p>
    </div>
}
