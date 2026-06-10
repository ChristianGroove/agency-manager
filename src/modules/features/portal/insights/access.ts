export type PortalInsightsAccess = {
    show: boolean
    mode: {
        organic: boolean
        ads: boolean
    }
}

type InsightsService = {
    name?: string | null
    status?: string | null
    insights_access?: string | null
}

function accessLevelToMode(accessLevel?: string | null) {
    const normalized = String(accessLevel || 'ALL').toUpperCase()

    return {
        organic: normalized === 'ALL' || normalized === 'ORGANIC',
        ads: normalized === 'ALL' || normalized === 'ADS',
    }
}

function normalizeSearchText(value: string) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function serviceAccessToMode(services: InsightsService[]) {
    const organicKeywords = ['social media', 'community', 'redes', 'content', 'organico']
    const adsKeywords = ['ads', 'pauta', 'trafficker', 'publicidad', 'meta', 'google', 'campaign']
    const mode = { organic: false, ads: false }

    for (const service of services) {
        if (service.status && service.status !== 'active') continue

        const access = String(service.insights_access || 'NONE').toUpperCase()
        if (access === 'ALL' || access === 'ORGANIC') mode.organic = true
        if (access === 'ALL' || access === 'ADS') mode.ads = true

        const name = normalizeSearchText(service.name || '')
        if (organicKeywords.some(keyword => name.includes(keyword))) mode.organic = true
        if (adsKeywords.some(keyword => name.includes(keyword))) mode.ads = true
    }

    return mode
}

export function resolvePortalInsightsAccess(
    services: InsightsService[] = [],
    settings: { override?: boolean | null, access_level?: string | null } | null = null
): PortalInsightsAccess {
    if (settings?.override === false) {
        return { show: false, mode: { organic: false, ads: false } }
    }

    const mode = settings?.override === true
        ? accessLevelToMode(settings.access_level)
        : serviceAccessToMode(services)

    return {
        show: mode.organic || mode.ads,
        mode,
    }
}
