import { addSeconds, addDays, setHours, setMinutes, setSeconds } from 'date-fns'

export interface DeliveryConfig {
    mode: 'stealth' | 'growth' | 'turbo'
    humanize: boolean
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
    if (!config.schedule_window) return date;
    
    let nextTime = new Date(date);
    const currentHour = nextTime.getHours();
    const startH = config.schedule_window.start;
    const endH = config.schedule_window.end;
    
    if (currentHour < startH || currentHour >= endH) {
        // Shift to next valid day at start time
        nextTime = setHours(nextTime, startH);
        nextTime = setMinutes(nextTime, Math.floor(Math.random() * 30)); // Random minute start
        nextTime = setSeconds(nextTime, 0);
        
        if (currentHour >= endH) {
            nextTime = addDays(nextTime, 1);
        }
    }
    return nextTime;
}
