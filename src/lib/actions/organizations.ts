"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Organization, OrganizationMember } from "@/types/organization"
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
    const cookieStore = cookies()
    // Awaiting cookies() is required in Next.js 15+, but let's check current version usage.
    // Assuming Next.js App Router standard usage.
    const orgCookie = (await cookieStore).get('pixy_org_id')
    if (orgCookie?.value) return orgCookie.value

    // 2. Fallback: Fetch first organization from DB
    const orgs = await getUserOrganizations()
    if (orgs.length > 0) {
        return orgs[0].organization_id
    }

    return null
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
