/**
 * Call Hours Manager
 * 
 * Manages business hours for call availability.
 * Handles out-of-hours routing to messages or callbacks.
 */

export interface TimeRange {
    start: string; // HH:mm format
    end: string;   // HH:mm format
}

export interface DaySchedule {
    enabled: boolean;
    ranges: TimeRange[];
}

export interface CallHoursConfig {
    timezone: string;
    schedule: {
        monday: DaySchedule;
        tuesday: DaySchedule;
        wednesday: DaySchedule;
        thursday: DaySchedule;
        friday: DaySchedule;
        saturday: DaySchedule;
        sunday: DaySchedule;
    };
    outOfHoursAction: 'reject' | 'message' | 'callback';
    callbackPermissionEnabled: boolean;
}

/**
 * Call Hours Manager
 */
export class CallHoursManager {
    private config: CallHoursConfig;

    constructor(config?: CallHoursConfig) {
        this.config = config || this.getDefaultConfig();
    }

    /**
     * Get default business hours (9 AM - 6 PM weekdays)
     */
    private getDefaultConfig(): CallHoursConfig {
        const weekdayHours: DaySchedule = {
            enabled: true,
            ranges: [{ start: '09:00', end: '18:00' }]
        };

        const weekendHours: DaySchedule = {
            enabled: false,
            ranges: []
        };

        return {
            timezone: 'America/Mexico_City',
            schedule: {
                monday: weekdayHours,
                tuesday: weekdayHours,
                wednesday: weekdayHours,
                thursday: weekdayHours,
                friday: weekdayHours,
                saturday: weekendHours,
                sunday: weekendHours
            },
            outOfHoursAction: 'message',
            callbackPermissionEnabled: true
        };
    }

    /**
     * Check if within call hours
     */
    isWithinCallHours(date: Date = new Date()): {
        available: boolean;
        reason?: string;
        nextAvailable?: Date;
    } {
        // Get day of week (0 = Sunday, 1 = Monday, ...)
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()] as keyof CallHoursConfig['schedule'];

        const daySchedule = this.config.schedule[dayName];

        if (!daySchedule.enabled) {
            return {
                available: false,
                reason: `Calls not available on ${dayName}`,
                nextAvailable: this.getNextAvailableTime(date)
            };
        }

        // Get current time in configured timezone
        const currentTime = this.getTimeInTimezone(date);

        // Check if current time falls within any range
        for (const range of daySchedule.ranges) {
            if (this.isTimeInRange(currentTime, range)) {
                return { available: true };
            }
        }

        return {
            available: false,
            reason: 'Outside business hours',
            nextAvailable: this.getNextAvailableTime(date)
        };
    }

    /**
     * Get time in configured timezone (HH:mm format)
     */
    private getTimeInTimezone(date: Date): string {
        // Simple implementation - in production use proper timezone library
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Check if time is within range
     */
    private isTimeInRange(time: string, range: TimeRange): boolean {
        return time >= range.start && time <= range.end;
    }

    /**
     * Get next available time for calls
     */
    private getNextAvailableTime(from: Date): Date {
        // Simplified - find next enabled day with hours
        const next = new Date(from);
        next.setDate(next.getDate() + 1);
        next.setHours(9, 0, 0, 0); // Default to 9 AM next day

        return next;
    }

    /**
     * Handle out-of-hours call attempt
     */
    async handleOutOfHours(params: {
        callId: string;
        fromPhoneNumber: string;
    }): Promise<{
        action: 'reject' | 'message' | 'callback';
        message?: string;
    }> {
        const { callId, fromPhoneNumber } = params;

        console.log('[CallHours] Out of hours call from:', fromPhoneNumber);

        switch (this.config.outOfHoursAction) {
            case 'message':
                const availability = this.isWithinCallHours();
                const message = `Gracias por contactarnos. Nuestro horario de atención es de lunes a viernes, 9:00 AM - 6:00 PM. ${availability.nextAvailable
                        ? `Próxima disponibilidad: ${availability.nextAvailable.toLocaleString('es-MX')}`
                        : ''
                    }\n\n¿Deseas dejar un mensaje?`;

                // TODO: Send WhatsApp message
                // await sendWhatsAppTextMessage(fromPhoneNumber, message);

                return { action: 'message', message };

            case 'callback':
                if (this.config.callbackPermissionEnabled) {
                    const callbackMsg = 'Estamos fuera de horario. ¿Deseas que te devolvamos la llamada durante nuestro horario de atención?';

                    // TODO: Send callback request template
                    // await sendCallbackRequestTemplate(fromPhoneNumber);

                    return { action: 'callback', message: callbackMsg };
                }
            // Fall through to reject

            case 'reject':
            default:
                return { action: 'reject' };
        }
    }

    /**
     * Update call hours configuration
     */
    async updateConfig(config: Partial<CallHoursConfig>): Promise<void> {
        this.config = { ...this.config, ...config };

        console.log('[CallHours] Configuration updated:', {
            timezone: this.config.timezone,
            outOfHoursAction: this.config.outOfHoursAction
        });

        // TODO: Sync to Meta API
        await this.syncToMeta();
    }

    /**
     * Sync configuration to Meta API
     */
    private async syncToMeta(): Promise<void> {
        const META_API_VERSION = 'v24.0';
        const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
        const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

        if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
            console.warn('[CallHours] Cannot sync - missing credentials');
            return;
        }

        try {
            // Format hours for Meta API
            const hours = Object.entries(this.config.schedule).map(([day, schedule]) => ({
                day,
                enabled: schedule.enabled,
                ranges: schedule.ranges
            }));

            await fetch(
                `https://graph.facebook.com/${META_API_VERSION}/${PHONE_NUMBER_ID}/settings`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        call_hours: {
                            timezone: this.config.timezone,
                            hours
                        }
                    })
                }
            );

            console.log('[CallHours] ✅ Synced to Meta');
        } catch (error) {
            console.error('[CallHours] Failed to sync:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): CallHoursConfig {
        return { ...this.config };
    }

    /**
     * Get formatted schedule for display
     */
    getFormattedSchedule(): string {
        const lines: string[] = [];

        Object.entries(this.config.schedule).forEach(([day, schedule]) => {
            if (schedule.enabled && schedule.ranges.length > 0) {
                const ranges = schedule.ranges
                    .map(r => `${r.start} - ${r.end}`)
                    .join(', ');
                lines.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${ranges}`);
            } else {
                lines.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: Cerrado`);
            }
        });

        return lines.join('\n');
    }
}

// Singleton instance
export const callHoursManager = new CallHoursManager();
