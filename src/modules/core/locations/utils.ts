import { BusinessHours } from "./actions"

/**
 * Función pura para calcular si una sede está abierta AHORA MISMO,
 * basándose en su zona horaria y horario comercial.
 * Ultraficiente: No hace queries, usa el objeto local.
 */
export function isLocationOpenNow(businessHours: BusinessHours | null, timezone: string = 'America/Bogota'): boolean {
    if (!businessHours) return false

    try {
        // 1. Obtener la fecha/hora actual EN LA ZONA HORARIA DE LA SEDE
        // Usamos Intl.DateTimeFormat para evitar dependencias pesadas
        const now = new Date()

        // Formateador específico para obtener partes
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            weekday: 'long',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
        })

        // Hack limpio para obtener partes:
        // Retorna algo como "Thursday, 14:30"
        const parts = formatter.formatToParts(now)

        let localWeekday = ''
        let localHour = 0
        let localMinute = 0

        parts.forEach(p => {
            if (p.type === 'weekday') localWeekday = p.value.toLowerCase() // 'thursday'
            if (p.type === 'hour') localHour = parseInt(p.value, 10)
            if (p.type === 'minute') localMinute = parseInt(p.value, 10)
        })

        // Normalizar hora para casos donde hour12 false retorna 24 en lugar de 0
        if (localHour === 24) localHour = 0

        // 2. Obtener el horario de HOY
        const todaySchedule = businessHours[localWeekday as keyof BusinessHours]

        if (!todaySchedule || todaySchedule.is_closed) return false

        // 3. Comparar horas (convertimos todo a minutos desde medianoche para fácil math)
        const currentMinutes = localHour * 60 + localMinute

        const [openH, openM] = todaySchedule.open.split(':').map(Number)
        const [closeH, closeM] = todaySchedule.close.split(':').map(Number)

        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM

        // Si open > close (e.g. 22:00 to 02:00), significa que cruza medianoche (turno nocturno)
        if (openMinutes > closeMinutes) {
            return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
        }

        // Turno diurno normal
        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes

    } catch (error) {
        console.error("Error calculating location open status:", error)
        return false
    }
}
