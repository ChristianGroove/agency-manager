export const DEFAULT_BRAND_NAME = 'Pixy'
export const DEFAULT_PRIMARY_COLOR = '#f205e2'
export const DEFAULT_SECONDARY_COLOR = '#9333ea'
export const MAX_BRAND_NAME_LENGTH = 80
const ALLOWED_LOGO_PORTS = new Set(['', '80', '443'])
const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'metadata.google.internal'])

export type PortalBrandingSettings = {
    agency_name?: string | null
    logo_url?: string | null
    portal_logo_url?: string | null
    primary_color?: string | null
}

function parseIPv4(ip: string) {
    const parts = ip.split('.').map(part => Number(part))
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
        return null
    }

    return parts
}

function isPrivateOrReservedIPv4(parts: number[]) {
    const [a, b] = parts
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 192 && b === 0) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224
    )
}

function isPrivatePortalLogoHost(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (PRIVATE_HOSTNAMES.has(normalized) || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
        return true
    }

    const ipv4 = parseIPv4(normalized)
    if (ipv4) {
        return isPrivateOrReservedIPv4(ipv4)
    }

    return normalized.includes(':')
}

export function normalizePublicPortalLogoUrl(rawUrl?: string | null) {
    if (!rawUrl) return ''

    try {
        const url = new URL(rawUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) return ''
        if (url.username || url.password) return ''
        if (!ALLOWED_LOGO_PORTS.has(url.port)) return ''
        if (isPrivatePortalLogoHost(url.hostname)) return ''

        return url.toString()
    } catch {
        return ''
    }
}

export function normalizePortalPrimaryColor(rawColor?: string | null) {
    const color = rawColor?.trim()
    return color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
        ? color
        : DEFAULT_PRIMARY_COLOR
}

export function resolvePortalBranding(settings?: PortalBrandingSettings | null) {
    const brandName = settings?.agency_name?.trim().slice(0, MAX_BRAND_NAME_LENGTH) || DEFAULT_BRAND_NAME
    const logoUrl = normalizePublicPortalLogoUrl(settings?.portal_logo_url) || normalizePublicPortalLogoUrl(settings?.logo_url)
    const primaryColor = normalizePortalPrimaryColor(settings?.primary_color)

    return { brandName, logoUrl, primaryColor }
}
