import { addSeconds } from 'date-fns'
import { deliveryConfigSchema } from './marketing-contracts'

export interface DeliveryConfig {
    mode: 'stealth' | 'growth' | 'turbo'
    humanize: boolean
    recipient_cooldown_hours?: number
    timezone?: string
    schedule_window?: {
        start: number
        end: number
    }
    max_speed?: string
}

export function addJitter(date: Date, config: DeliveryConfig): Date {
    if (!config.humanize) return date;
    
    let baseIntervalSeconds = 30; // default growth
    if (config.mode === 'stealth') baseIntervalSeconds = 180;
    if (config.mode === 'turbo') baseIntervalSeconds = 5;
    
    const jitterRange = baseIntervalSeconds * 0.35; // 35% variance total
    const randomJitter = (Math.random() * jitterRange) - (baseIntervalSeconds * 0.1); 
    return addSeconds(date, Math.round(randomJitter));
}

export function enforceScheduleWindow(date: Date, config: DeliveryConfig): Date {
    const parsed = deliveryConfigSchema.parse(config)
    if (!Number.isFinite(date.getTime())) throw new Error('Fecha de envío inválida.')
    if (!parsed.schedule_window) return date
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: parsed.timezone, hour: '2-digit', hourCycle: 'h23' })
    const allowed = (instant: Date) => {
        const hour = Number(formatter.format(instant))
        return hour >= parsed.schedule_window!.start && hour < parsed.schedule_window!.end
    }
    if (allowed(date)) return date
    // Search UTC instants, rather than adding local days/hours. This handles DST
    // gaps and repeated hours without depending on the worker host's timezone.
    const firstMinute = Math.ceil(date.getTime() / 60_000) * 60_000
    for (let minute = 0; minute <= 72 * 60; minute++) {
        const candidate = new Date(firstMinute + minute * 60_000)
        if (allowed(candidate)) return candidate
    }
    throw new Error('No se pudo calcular la próxima ventana de envío.')
}
