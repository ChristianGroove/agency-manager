import type { BrandingConfig } from '@/types/branding'

export const PET_SHAPES = ['rectangle', 'square', 'circle', 'hexagon'] as const
export const PET_STATES = ['idle', 'thinking', 'searching', 'listening', 'speaking', 'working', 'happy', 'error', 'sleeping'] as const
export type PetState = typeof PET_STATES[number]
export type PetShape = typeof PET_SHAPES[number]
export type PetSize = 48 | 56 | 64 | 80

export interface PetSettings {
    version: 1
    enabled: boolean
    audience: 'pixy' | 'all'
    pixyOrganizationId: string | null
    shape: PetShape
    color: string
    trimColor: string
    screenColor: string
    desktopSize: PetSize
    mobileSize: PetSize
    animation: 'off' | 'contextual' | 'continuous'
    speed: number
    interactive: boolean
    antenna: boolean
    floorShadow: boolean
    alertReactions: boolean
    hibernateEnabled: boolean
    hibernateAfterMinutes: number
}

export const DEFAULT_PET_SETTINGS: Readonly<PetSettings> = {
    version: 1, enabled: false, audience: 'pixy', pixyOrganizationId: null,
    shape: 'rectangle', color: '#4F46E5', trimColor: '#EC4899', screenColor: '#E8F2FF',
    desktopSize: 64, mobileSize: 48, animation: 'contextual', speed: 1,
    interactive: false, antenna: true, floorShadow: true, alertReactions: false,
    hibernateEnabled: true, hibernateAfterMinutes: 5,
}

export interface DashboardPetConfig {
    settings: PetSettings
    enabled: boolean
    useGlobalColors: boolean
}

export function resolveDashboardPetConfig(settings: PetSettings, organizationId: string | null): DashboardPetConfig {
    const isPixy = !!organizationId && organizationId === settings.pixyOrganizationId
    return {
        settings,
        enabled: !!organizationId && !!settings.pixyOrganizationId && settings.enabled && (settings.audience === 'all' || isPixy),
        useGlobalColors: isPixy,
    }
}

// Never pass CSS variables or arbitrary CSS into the upstream color parser.
export function normalizePetColor(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim())) return fallback
    const hex = value.trim().slice(1)
    return '#' + (hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex).toUpperCase()
}

export function resolvePetPalette(config: DashboardPetConfig, branding: BrandingConfig | null) {
    const { settings } = config
    return {
        color: config.useGlobalColors ? settings.color : normalizePetColor(branding?.colors.primary, settings.color),
        trimColor: config.useGlobalColors ? settings.trimColor : normalizePetColor(branding?.colors.secondary, settings.trimColor),
        screenColor: settings.screenColor,
    }
}
