export interface DayShift {
    open: string  // "11:30" (HH:mm)
    close: string // "15:00" (HH:mm)
}

export interface DaySchedule {
    enabled: boolean
    shifts: DayShift[] // Soporta Turno 1 y Turno 2 (Doble Jornada)
}

export interface BusinessScheduleConfig {
    force_closed: boolean           // Cierre de emergencia manual (Pausar domicilios)
    force_closed_message?: string   // Mensaje al usuario cuando está pausado
    days: Record<number, DaySchedule> // 0 = Dom, 1 = Lun, 2 = Mar, 3 = Mié, 4 = Jue, 5 = Vie, 6 = Sáb, 7 = Festivos
}

export interface PortalThemeConfig {
    // 1. Tema & Paleta
    theme_id: 'modern_glass' | 'gourmet_elegance' | 'cyber_glass_3d'
    color_mode: 'dark' | 'light' | 'auto'
    primary_color?: string
    secondary_color?: string
    background_style: 'solid' | 'gradient' | 'mesh' | 'mesh_3d'
    
    // Variante de Logo de Marca y Nombre del Tenant
    tenant_name?: string
    logo_variant?: 'auto' | 'main_dark' | 'main_light' | 'portal_iso'
    tenant_logos?: {
        main_dark?: string | null
        main_light?: string | null
        portal_iso?: string | null
    }

    // Estilo de Navegación de Categorías y Dock Inferior
    category_nav_style?: 'pills' | 'underline_tabs' | 'glass_cards' | 'floating_dock'
    dock_style?: 'floating_glass' | 'capsule_pill' | 'full_width_dock'

    // 2. Estilo de Tarjetas del Catálogo (Platos, Inmuebles, Productos)
    card_style: {
        variant: 'glass' | 'flat' | 'elevated' | 'bordered'
        border_radius: 'xl' | '3xl' | 'full'
        hover_effect: 'zoom' | 'lift' | 'glow'
        layout: 'grid' | 'list'
    }

    // 3. Banner Publicitario / Promocional
    promo_banner?: {
        enabled: boolean
        image_url?: string
        target_url?: string
        position: 'top' | 'bottom'
        alt_text?: string
    }

    // 4. Redes Sociales & Contacto
    social_links?: {
        instagram?: string
        facebook?: string
        tiktok?: string
        whatsapp?: string
        website?: string
        google_maps?: string
    }

    // 5. Header & Footer de Landing Page
    header_footer?: {
        show_header: boolean
        show_footer: boolean
        custom_tagline?: string
        business_hours_text?: string
        address_text?: string
    }

    // 6. Horarios de Atención & Control de Pedidos
    schedule_config?: BusinessScheduleConfig

    animations_enabled: boolean
}

export const DEFAULT_DAY_SCHEDULE: DaySchedule = {
    enabled: true,
    shifts: [
        { open: '11:00', close: '22:00' }
    ]
}

export const DEFAULT_BUSINESS_SCHEDULE: BusinessScheduleConfig = {
    force_closed: false,
    force_closed_message: 'En este momento estamos pausando pedidos a domicilio. ¡Te esperamos pronto!',
    days: {
        1: { enabled: true, shifts: [{ open: '11:00', close: '22:00' }] }, // Lun
        2: { enabled: true, shifts: [{ open: '11:00', close: '22:00' }] }, // Mar
        3: { enabled: true, shifts: [{ open: '11:00', close: '22:00' }] }, // Mié
        4: { enabled: true, shifts: [{ open: '11:00', close: '22:00' }] }, // Jue
        5: { enabled: true, shifts: [{ open: '11:00', close: '23:00' }] }, // Vie
        6: { enabled: true, shifts: [{ open: '11:00', close: '23:00' }] }, // Sáb
        0: { enabled: true, shifts: [{ open: '11:00', close: '21:00' }] }, // Dom
        7: { enabled: true, shifts: [{ open: '12:00', close: '21:00' }] }, // Festivos
    }
}

export const DEFAULT_PORTAL_THEME_CONFIG: PortalThemeConfig = {
    theme_id: 'modern_glass',
    color_mode: 'auto',
    primary_color: '',
    secondary_color: '',
    background_style: 'solid',
    logo_variant: 'auto',
    tenant_logos: {
        main_dark: null,
        main_light: null,
        portal_iso: null
    },
    category_nav_style: 'pills',
    dock_style: 'floating_glass',
    card_style: {
        variant: 'glass',
        border_radius: 'xl',
        hover_effect: 'zoom',
        layout: 'grid'
    },
    promo_banner: {
        enabled: false,
        image_url: '',
        target_url: '',
        position: 'top',
        alt_text: 'Promoción especial'
    },
    social_links: {
        instagram: '',
        facebook: '',
        tiktok: '',
        whatsapp: '',
        website: '',
        google_maps: ''
    },
    header_footer: {
        show_header: true,
        show_footer: true,
        custom_tagline: 'Disfruta de la mejor experiencia gastronómica',
        business_hours_text: '',
        address_text: ''
    },
    schedule_config: DEFAULT_BUSINESS_SCHEDULE,
    animations_enabled: true
}
