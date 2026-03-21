
export interface TimeRange {
    start: string; // "HH:mm"
    end: string;   // "HH:mm"
}

export interface DaySchedule {
    enabled: boolean;
    ranges: TimeRange[];
}

export interface BusinessHoursConfig {
    timezone: string;
    days: Record<number, DaySchedule>;
}

/**
 * Robust Business Hours Engine using native Intl API
 */
export class BusinessHoursEngine {
    
    /**
     * Check if a given date is within the configured business hours
     */
    static isOnline(config: any, date: Date = new Date()): boolean {
        // 1. Sanitize/Normalize Config (Handle legacy formats and nulls)
        if (!config) return true;
        
        // Root override: If functionally disabled, we are "Always Online"
        if (config.enabled === false) return true;
        
        let normalized = config;
        // Handle legacy array structure: { days: [1,2,3], start: "09:00", end: "18:00" }
        if (config.days && Array.isArray(config.days)) {
            const daysObj: any = {};
            const start = config.start || "09:00";
            const end = config.end || "18:00";
            [0, 1, 2, 3, 4, 5, 6].forEach(d => {
                const dayNum = d === 0 ? 0 : d; // Ensure Sunday is 0
                daysObj[dayNum] = { 
                    enabled: config.days.includes(d === 0 ? 7 : d), 
                    ranges: [{ start, end }] 
                };
            });
            normalized = { timezone: config.timezone || 'America/Bogota', days: daysObj };
        }

        if (!normalized.days) return true;

        const tz = normalized.timezone || 'America/Bogota';
        const dayInTz = this.getNumericDay(date, tz);
        
        const daySchedule = normalized.days[dayInTz];
        if (!daySchedule || !daySchedule.enabled || !daySchedule.ranges || daySchedule.ranges.length === 0) {
            return false;
        }

        const currentTimeStr = this.getTimeInTz(date, tz);
        const currentMinutes = this.timeToMinutes(currentTimeStr);

        return daySchedule.ranges.some((range: TimeRange) => {
            const startMinutes = this.timeToMinutes(range.start);
            const endMinutes = this.timeToMinutes(range.end);
            return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        });
    }

    private static getTimeInTz(date: Date, timezone: string): string {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).format(date);
    }

    private static getNumericDay(date: Date, timezone: string): number {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'short'
        }).formatToParts(date);

        const weekday = parts.find(p => p.type === 'weekday')?.value;
        const dayMap: Record<string, number> = {
            'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
        };
        
        return dayMap[weekday || ''] ?? date.getDay();
    }

    private static timeToMinutes(time: string): number {
        const [h, m] = time.split(':').map(Number);
        return (h * 60) + (m || 0);
    }
}
