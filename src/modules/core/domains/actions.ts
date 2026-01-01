'use server'

import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { invalidateDomainCache } from '@/lib/domain-resolver'

// ============================================
// TYPES
// ============================================

export interface UpdatePlatformDomainsInput {
    admin_domain: string
    portal_domain: string
}

export interface UpdateOrganizationDomainsInput {
    organization_id: string
    use_custom_domains: boolean
    custom_admin_domain?: string | null
    custom_portal_domain?: string | null
}

interface ActionResponse<T = void> {
    success: boolean
    error?: string
    data?: T
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate domain format
 * Allows: subdomain.domain.com, domain.com, subdomain.domain.co.uk
 */
function isValidDomain(domain: string): boolean {
    if (!domain || domain.trim().length === 0) return false

    // Basic domain validation regex
    // Allows letters, numbers, hyphens, and dots
    const domainRegex = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*$/i

    // Check format
    if (!domainRegex.test(domain)) return false

    // Additional checks
    if (domain.startsWith('.') || domain.endsWith('.')) return false
    if (domain.includes('..')) return false
    if (domain.length > 253) return false

    return true
}

/**
 * Check if user is super_admin
 */
async function isSuperAdmin(): Promise<boolean> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
        .from('profiles')
        .select('platform_role')
        .eq('id', user.id)
        .single()

    return profile?.platform_role === 'super_admin'
}

// ============================================
// PLATFORM-WIDE DOMAIN ACTIONS
// ============================================

/**
 * Update platform-wide domain configuration
 * Only accessible by super_admin
 */
export async function updatePlatformDomains(
    input: UpdatePlatformDomainsInput
): Promise<ActionResponse> {
    try {
        // 1. Verify user is super_admin
        const isSuperAdminUser = await isSuperAdmin()
        if (!isSuperAdminUser) {
            return {
                success: false,
                error: 'Unauthorized: Only super_admin can update platform domains'
            }
        }

        // 2. Validate domains
        if (!isValidDomain(input.admin_domain)) {
            return {
                success: false,
                error: 'Invalid admin domain format'
            }
        }

        if (!isValidDomain(input.portal_domain)) {
            return {
                success: false,
                error: 'Invalid portal domain format'
            }
        }

        if (input.admin_domain === input.portal_domain) {
            return {
                success: false,
                error: 'Admin and portal domains must be different'
            }
        }

        // 3. Update using admin client (bypass RLS)
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await adminClient
            .from('platform_settings')
            .update({
                admin_domain: input.admin_domain,
                portal_domain: input.portal_domain,
                domain_updated_at: new Date().toISOString()
            })
            .eq('id', 1)

        if (error) {
            console.error('Error updating platform domains:', error)
            return {
                success: false,
                error: 'Failed to update platform domains'
            }
        }

        // 4. Invalidate domain cache
        invalidateDomainCache()

        // 5. Revalidate relevant pages
        revalidatePath('/platform/admin/domains')
        revalidatePath('/platform/admin')

        return { success: true }
    } catch (error: any) {
        console.error('updatePlatformDomains error:', error)
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        }
    }
}

/**
 * Get current platform domain configuration
 */
export async function getPlatformDomainsConfig(): Promise<ActionResponse<{
    admin_domain: string
    portal_domain: string
    updated_at: string | null
}>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('platform_settings')
            .select('admin_domain, portal_domain, domain_updated_at')
            .eq('id', 1)
            .single()

        if (error || !data) {
            return {
                success: false,
                error: 'Failed to fetch platform domains'
            }
        }

        return {
            success: true,
            data: {
                admin_domain: data.admin_domain,
                portal_domain: data.portal_domain,
                updated_at: data.domain_updated_at
            }
        }
    } catch (error: any) {
        console.error('getPlatformDomainsConfig error:', error)
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        }
    }
}

// ============================================
// ORGANIZATION-SPECIFIC DOMAIN ACTIONS
// ============================================

/**
 * Update organization-specific domain configuration
 * Only accessible by super_admin
 */
export async function updateOrganizationDomains(
    input: UpdateOrganizationDomainsInput
): Promise<ActionResponse> {
    try {
        // 1. Verify user is super_admin
        const isSuperAdminUser = await isSuperAdmin()
        if (!isSuperAdminUser) {
            return {
                success: false,
                error: 'Unauthorized: Only super_admin can update organization domains'
            }
        }

        // 2. If enabling custom domains, validate them
        if (input.use_custom_domains) {
            if (!input.custom_admin_domain || !input.custom_portal_domain) {
                return {
                    success: false,
                    error: 'Both custom domains required when enabled'
                }
            }

            if (!isValidDomain(input.custom_admin_domain)) {
                return {
                    success: false,
                    error: 'Invalid custom admin domain format'
                }
            }

            if (!isValidDomain(input.custom_portal_domain)) {
                return {
                    success: false,
                    error: 'Invalid custom portal domain format'
                }
            }

            if (input.custom_admin_domain === input.custom_portal_domain) {
                return {
                    success: false,
                    error: 'Custom admin and portal domains must be different'
                }
            }
        }

        // 3. Update organization using admin client
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await adminClient
            .from('organizations')
            .update({
                use_custom_domains: input.use_custom_domains,
                custom_admin_domain: input.use_custom_domains ? input.custom_admin_domain : null,
                custom_portal_domain: input.use_custom_domains ? input.custom_portal_domain : null
            })
            .eq('id', input.organization_id)

        if (error) {
            console.error('Error updating organization domains:', error)
            return {
                success: false,
                error: 'Failed to update organization domains'
            }
        }

        // 4. Invalidate domain cache for this organization
        invalidateDomainCache(input.organization_id)

        // 5. Revalidate relevant pages
        revalidatePath(`/platform/admin/organizations/${input.organization_id}`)
        revalidatePath('/platform/admin/organizations')

        return { success: true }
    } catch (error: any) {
        console.error('updateOrganizationDomains error:', error)
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        }
    }
}

/**
 * Get organization domain configuration
 */
export async function getOrganizationDomainsConfig(
    organizationId: string
): Promise<ActionResponse<{
    use_custom_domains: boolean
    custom_admin_domain: string | null
    custom_portal_domain: string | null
}>> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('organizations')
            .select('use_custom_domains, custom_admin_domain, custom_portal_domain')
            .eq('id', organizationId)
            .single()

        if (error || !data) {
            return {
                success: false,
                error: 'Failed to fetch organization domain configuration'
            }
        }

        return {
            success: true,
            data: {
                use_custom_domains: data.use_custom_domains || false,
                custom_admin_domain: data.custom_admin_domain,
                custom_portal_domain: data.custom_portal_domain
            }
        }
    } catch (error: any) {
        console.error('getOrganizationDomainsConfig error:', error)
        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        }
    }
}
