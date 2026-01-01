/**
 * Domain Resolution Service
 * Resolves admin and portal domains based on platform and organization settings
 * with intelligent caching for performance
 */

import { createClient } from '@supabase/supabase-js'

// ============================================
// TYPES
// ============================================

export interface DomainConfig {
    admin: string
    portal: string
}

interface PlatformDomainsCache {
    data: DomainConfig | null
    lastFetch: number
}

// ============================================
// IN-MEMORY CACHE
// ============================================

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let platformDomainsCache: PlatformDomainsCache = {
    data: null,
    lastFetch: 0
}

// Organization-level cache (map by org ID)
const orgDomainsCache = new Map<string, { data: DomainConfig; lastFetch: number }>()

// ============================================
// FALLBACK DEFAULTS
// ============================================

const FALLBACK_DOMAINS: DomainConfig = {
    admin: 'control.pixy.com.co',
    portal: 'mi.pixy.com.co'
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Fetch platform-wide domain configuration
 * Uses cache when available and valid
 */
export async function getPlatformDomains(): Promise<DomainConfig> {
    const now = Date.now()

    // Return cached if valid
    if (platformDomainsCache.data && (now - platformDomainsCache.lastFetch) < CACHE_TTL) {
        return platformDomainsCache.data
    }

    try {
        // Create Supabase client for server-side queries
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data, error } = await supabase
            .from('platform_settings')
            .select('admin_domain, portal_domain')
            .eq('id', 1)
            .single()

        if (error || !data) {
            console.error('Failed to fetch platform domains:', error)
            return FALLBACK_DOMAINS
        }

        // Update cache
        const domains: DomainConfig = {
            admin: data.admin_domain || FALLBACK_DOMAINS.admin,
            portal: data.portal_domain || FALLBACK_DOMAINS.portal
        }

        platformDomainsCache = {
            data: domains,
            lastFetch: now
        }

        return domains
    } catch (error) {
        console.error('Error fetching platform domains:', error)
        return FALLBACK_DOMAINS
    }
}

/**
 * Fetch organization-specific domain configuration
 * Falls back to platform defaults if organization doesn't use custom domains
 */
export async function getOrganizationDomains(
    organizationId: string
): Promise<DomainConfig> {
    const now = Date.now()

    // Check cache first
    const cached = orgDomainsCache.get(organizationId)
    if (cached && (now - cached.lastFetch) < CACHE_TTL) {
        return cached.data
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: org } = await supabase
            .from('organizations')
            .select('use_custom_domains, custom_admin_domain, custom_portal_domain')
            .eq('id', organizationId)
            .single()

        // If organization uses custom domains and they're valid, return those
        if (org?.use_custom_domains && org.custom_admin_domain && org.custom_portal_domain) {
            const domains: DomainConfig = {
                admin: org.custom_admin_domain,
                portal: org.custom_portal_domain
            }

            // Cache it
            orgDomainsCache.set(organizationId, {
                data: domains,
                lastFetch: now
            })

            return domains
        }

        // Otherwise, return platform defaults
        return await getPlatformDomains()
    } catch (error) {
        console.error('Error fetching organization domains:', error)
        return await getPlatformDomains()
    }
}

/**
 * Generate full portal URL with optional organization-specific domains
 */
export async function getPortalUrl(
    path: string = '',
    organizationId?: string
): Promise<string> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    // Development mode: always use localhost
    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:3000${cleanPath}`
    }

    // Client-side: use current origin (already on correct domain)
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${cleanPath}`
    }

    // Server-side: resolve from database config
    try {
        const domains = organizationId
            ? await getOrganizationDomains(organizationId)
            : await getPlatformDomains()

        return `https://${domains.portal}${cleanPath}`
    } catch (error) {
        console.error('Error generating portal URL:', error)
        return `https://${FALLBACK_DOMAINS.portal}${cleanPath}`
    }
}

/**
 * Generate full admin URL with optional organization-specific domains
 */
export async function getAdminUrl(
    path: string = '',
    organizationId?: string
): Promise<string> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    // Development mode: always use localhost
    if (process.env.NODE_ENV === 'development') {
        return `http://localhost:3000${cleanPath}`
    }

    // Client-side: use current origin
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${cleanPath}`
    }

    // Server-side: resolve from database config
    try {
        const domains = organizationId
            ? await getOrganizationDomains(organizationId)
            : await getPlatformDomains()

        return `https://${domains.admin}${cleanPath}`
    } catch (error) {
        console.error('Error generating admin URL:', error)
        return `https://${FALLBACK_DOMAINS.admin}${cleanPath}`
    }
}

/**
 * Invalidate cache (useful after updating domain configuration)
 */
export function invalidateDomainCache(organizationId?: string) {
    if (organizationId) {
        orgDomainsCache.delete(organizationId)
    } else {
        platformDomainsCache = { data: null, lastFetch: 0 }
        orgDomainsCache.clear()
    }
}

/**
 * Sync function for middleware usage (no async DB calls)
 * Returns cached value or fallback
 */
export function getPlatformDomainsSync(): DomainConfig {
    if (platformDomainsCache.data) {
        return platformDomainsCache.data
    }
    return FALLBACK_DOMAINS
}
