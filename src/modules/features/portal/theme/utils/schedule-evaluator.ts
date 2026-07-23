import { BusinessScheduleConfig, PortalThemeConfig, DEFAULT_BUSINESS_SCHEDULE } from '../types'

export interface StoreStatusResult {
    isOpen: boolean
    isForceClosed: boolean
    statusBadgeText: string // "ABIERTO" | "CERRADO" | "PAUSADO"
    badgeColor: 'emerald' | 'rose' | 'amber'
    message: string
    todayHoursFormatted: string
}

export interface DayScheduleDisplay {
    dayId: number
    dayName: string
    dayShort: string
    isToday: boolean
    enabled: boolean
    shiftsFormatted: string[]
}

export function evaluateStoreStatus(
    config?: PortalThemeConfig | null,
    overrideDate?: Date
): StoreStatusResult {
    const schedule: BusinessScheduleConfig = config?.schedule_config || DEFAULT_BUSINESS_SCHEDULE

    // 1. Emergency Pause check
    if (schedule.force_closed) {
        return {
            isOpen: false,
            isForceClosed: true,
            statusBadgeText: 'PAUSADO',
            badgeColor: 'amber',
            message: schedule.force_closed_message || 'Pedidos a domicilio pausados temporalmente.',
            todayHoursFormatted: 'Pedidos Pausados'
        }
    }

    const now = overrideDate || new Date()
    const currentDay = now.getDay() // 0 = Dom, 1 = Lun, ..., 6 = Sáb
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    const daySchedule = schedule.days?.[currentDay]

    if (!daySchedule || !daySchedule.enabled || !daySchedule.shifts || daySchedule.shifts.length === 0) {
        return {
            isOpen: false,
            isForceClosed: false,
            statusBadgeText: 'CERRADO',
            badgeColor: 'rose',
            message: 'En este momento el establecimiento se encuentra cerrado.',
            todayHoursFormatted: 'Cerrado hoy'
        }
    }

    // Format today's hours string (e.g. "11:00 AM - 3:00 PM | 6:00 PM - 10:00 PM")
    const formattedShifts = daySchedule.shifts.map(s => `${formatTime12h(s.open)} - ${formatTime12h(s.close)}`).join(' | ')
    const todayHoursFormatted = `Hoy: ${formattedShifts}`

    // Check if current time falls within ANY shift for today
    let isInShift = false
    for (const shift of daySchedule.shifts) {
        const [openH, openM] = shift.open.split(':').map(Number)
        const [closeH, closeM] = shift.close.split(':').map(Number)

        const openMinutes = openH * 60 + openM
        const closeMinutes = closeH * 60 + closeM

        // Handle overnight shift (e.g. 18:00 - 02:00)
        if (closeMinutes < openMinutes) {
            if (currentMinutes >= openMinutes || currentMinutes <= closeMinutes) {
                isInShift = true
                break
            }
        } else {
            if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
                isInShift = true
                break
            }
        }
    }

    if (isInShift) {
        return {
            isOpen: true,
            isForceClosed: false,
            statusBadgeText: 'ABIERTO',
            badgeColor: 'emerald',
            message: '¡Estamos abiertos y recibiendo pedidos!',
            todayHoursFormatted
        }
    }

    return {
        isOpen: false,
        isForceClosed: false,
        statusBadgeText: 'CERRADO',
        badgeColor: 'rose',
        message: `Establecimiento cerrado en este momento. Horario de hoy: ${formattedShifts}`,
        todayHoursFormatted
    }
}

export function getWeeklyScheduleFormatted(config?: PortalThemeConfig | null): DayScheduleDisplay[] {
    const schedule: BusinessScheduleConfig = config?.schedule_config || DEFAULT_BUSINESS_SCHEDULE
    const todayId = new Date().getDay()

    const days = [
        { id: 1, name: 'Lunes', short: 'Lun' },
        { id: 2, name: 'Martes', short: 'Mar' },
        { id: 3, name: 'Miércoles', short: 'Mié' },
        { id: 4, name: 'Jueves', short: 'Jue' },
        { id: 5, name: 'Viernes', short: 'Vie' },
        { id: 6, name: 'Sábado', short: 'Sáb' },
        { id: 0, name: 'Domingo', short: 'Dom' },
        { id: 7, name: 'Festivos', short: 'Fest' },
    ]

    return days.map(d => {
        const dayConfig = schedule.days?.[d.id]
        const enabled = dayConfig?.enabled ?? false
        const shiftsFormatted = (enabled && dayConfig?.shifts) 
            ? dayConfig.shifts.map(s => `${formatTime12h(s.open)} - ${formatTime12h(s.close)}`)
            : []

        return {
            dayId: d.id,
            dayName: d.name,
            dayShort: d.short,
            isToday: d.id === todayId,
            enabled,
            shiftsFormatted
        }
    })
}

export function formatTime12h(time24: string): string {
    if (!time24) return ''
    const [h, m] = time24.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    const mStr = m < 10 ? `0${m}` : `${m}`
    return `${h12}:${mStr} ${period}`
}
