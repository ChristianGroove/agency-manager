"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { OrganizationMember } from "@/types/organization"
import { cookies } from "next/headers"

/**
 * Fetch all organizations the current user belongs to.
 */
export async function getUserOrganizations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // We fetch members and join organization details
    // Note: RLS policies (Members can view their own organization) allow this.
    const { data, error } = await supabase
        .from('organization_members')
        .select(`
            *,
            organization:organizations (
                *
            )
        `)
        .eq('user_id', user.id)

    if (error) {
        console.error("Error fetching user organizations:", error)
        return []
    }

    return data as OrganizationMember[]
}

/**
 * Get the current active organization ID from cookies or default to the first one available.
 */
export async function getCurrentOrganizationId() {
    // 1. Check cookie first (Context Switcher sets this)
    const cookieStore = await cookies()
    const orgCookie = cookieStore.get('pixy_org_id')
    if (orgCookie?.value) return orgCookie.value

    // 2. Fallback: Fetch first organization from DB
    const orgs = await getUserOrganizations()
    if (orgs.length > 0) {
        return orgs[0].organization_id
    }

    return null
}

/**
 * Get current organization name
 */
export async function getCurrentOrgName() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient()
    const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single()

    return data?.name || null
}

/**
 * Create a new Organization (Tenant Provisioning)
 */
export async function createOrganization(formData: {
    name: string
    slug: string
    logo_url?: string
    subscription_product_id: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "Unauthorized" }

    try {
        // 1. Create Organization (Using Admin to bypass initial RLS if needed, strictly speaking user can't create orgs freely unless we allow public insert)
        // Usually, provisioning is a protected action or we use a function.
        // For now, we use supabaseAdmin to ensure creation succeeds and we can set the owner.

        const { data: newOrg, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: formData.name,
                slug: formData.slug,
                logo_url: formData.logo_url,
                subscription_product_id: formData.subscription_product_id,
                subscription_status: 'active' // Trial/Active by default
            })
            .select()
            .single()

        if (orgError) throw orgError

        // 2. Add Creator as Owner
        const { error: memberError } = await supabaseAdmin
            .from('organization_members')
            .insert({
                organization_id: newOrg.id,
                user_id: user.id,
                role: 'owner'
            })

        if (memberError) throw memberError

        // 3. Switch Context Immediately
        await switchOrganization(newOrg.id)

        return { success: true, data: newOrg }

    } catch (error: any) {
        console.error("Error creating organization:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Switch the active organization context.
 * Sets a cookie that middleware/client uses to know the scope.
 */
export async function switchOrganization(organizationId: string) {
    const cookieStore = await cookies()

    // Verify user is actually a member of this org to prevent manual cookie tampering
    // (Optional security check, highly recommended)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: member } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('organization_id', organizationId)
            .eq('user_id', user.id)
            .single()

        if (!member) {
            throw new Error("User is not a member of this organization")
        }
    }

    // Set cookie
    cookieStore.set('pixy_org_id', organizationId, {
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    revalidatePath('/')
}

/**
 * Get active modules for an organization (Server Side)
 */
export async function getOrganizationModules(organizationId: string): Promise<string[]> {
    const supabase = await createClient()

    // 1. Fetch Organization Overrides AND Product Modules
    const { data } = await supabase
        .from('organizations')
        .select(`
            manual_module_overrides,
            subscription_product:saas_products!subscription_product_id (
                modules:saas_product_modules (
                    system_module:system_modules!module_id (
                        key
                    )
                )
            )
        `)
        .eq('id', organizationId)
        .single()

    const manualModules = (data?.manual_module_overrides as string[]) || []

    // Extract product modules
    const productModules: string[] = []

    if (data?.subscription_product && Array.isArray((data.subscription_product as any).modules)) {
        const modules = (data.subscription_product as any).modules
        modules.forEach((m: any) => {
            if (m.system_module?.key) {
                productModules.push(m.system_module.key)
            }
        })
    }

    // Merge unique
    const activeModules = Array.from(new Set([...manualModules, ...productModules]))

    // SELF-HEALING: Ensure basic cleaning modules are present for legacy/migration support
    // This allows the "optimized" dashboard to work immediately without manual DB patches.
    if (!activeModules.includes('module_cleaning')) {
        console.log(`[Auto-Migration] Enabling module_cleaning for Org ${organizationId}`)

        // 1. Add to set
        activeModules.push('module_cleaning')
        if (!activeModules.includes('vertical_cleaning')) activeModules.push('vertical_cleaning')

        // 2. Persist to DB asynchronously (fire and forget)
        supabaseAdmin
            .from('organizations')
            .update({
                manual_module_overrides: Array.from(new Set([...manualModules, 'module_cleaning', 'vertical_cleaning']))
            })
            .eq('id', organizationId)
            .then(({ error }) => {
                if (error) console.error("[Auto-Migration] Failed to persist cleaning module:", error)
                else console.log("[Auto-Migration] Success")
            })
    }

    return activeModules
}
