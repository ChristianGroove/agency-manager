"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getCurrentOrganizationId } from "./actions"
import { isSuperAdmin } from "@/lib/auth/platform-roles"

/**
 * Hierarchy Analytics Actions
 * 
 * Provides aggregated statistics and metrics across the organization
 * hierarchy (Platform → Reseller → Client).
 */

export interface HierarchyStats {
    level: 'platform' | 'reseller' | 'operator' | 'client'
    count: number
    activeCount: number
    suspendedCount: number
}

export interface HierarchyMetrics {
    totalOrganizations: number
    totalLeads: number
    totalConversations: number
    totalRevenue: number
    statsByLevel: HierarchyStats[]
}

/**
 * Get organization counts grouped by hierarchy level
 */
export async function getHierarchyStats(): Promise<{ data: HierarchyStats[] | null, error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    // Only Super Admins and Resellers can view hierarchy stats
    const isAdmin = await isSuperAdmin(user.id)
    const currentOrgId = await getCurrentOrganizationId()

    try {
        let query = supabaseAdmin
            .from('organizations')
            .select('organization_type, status')

        // Resellers only see their children
        if (!isAdmin && currentOrgId) {
            query = query.eq('parent_organization_id', currentOrgId)
        }

        const { data: orgs, error } = await query

        if (error) throw error

        // Aggregate by type
        const stats: Record<string, HierarchyStats> = {
            platform: { level: 'platform', count: 0, activeCount: 0, suspendedCount: 0 },
            reseller: { level: 'reseller', count: 0, activeCount: 0, suspendedCount: 0 },
            operator: { level: 'operator', count: 0, activeCount: 0, suspendedCount: 0 },
            client: { level: 'client', count: 0, activeCount: 0, suspendedCount: 0 },
        }

        orgs?.forEach(org => {
            const type = org.organization_type || 'client'
            if (stats[type]) {
                stats[type].count++
                if (org.status === 'active') stats[type].activeCount++
                if (org.status === 'suspended') stats[type].suspendedCount++
            }
        })

        return { data: Object.values(stats).filter(s => s.count > 0), error: null }
    } catch (error: any) {
        console.error("Error fetching hierarchy stats:", error)
        return { data: null, error: error.message }
    }
}

/**
 * Get aggregated metrics across the hierarchy
 */
export async function getHierarchyMetrics(): Promise<{ data: HierarchyMetrics | null, error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const isAdmin = await isSuperAdmin(user.id)
    const currentOrgId = await getCurrentOrganizationId()

    try {
        // Build org filter based on access level
        let orgIds: string[] = []

        if (isAdmin) {
            // Super admin sees all
            const { data: allOrgs } = await supabaseAdmin
                .from('organizations')
                .select('id')
            orgIds = allOrgs?.map(o => o.id) || []
        } else if (currentOrgId) {
            // Reseller sees self + children
            const { data: childOrgs } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .or(`id.eq.${currentOrgId},parent_organization_id.eq.${currentOrgId}`)
            orgIds = childOrgs?.map(o => o.id) || []
        }

        // Fetch counts in parallel
        const [orgsResult, leadsResult, convsResult] = await Promise.all([
            supabaseAdmin
                .from('organizations')
                .select('id', { count: 'exact', head: true })
                .in('id', orgIds),
            supabaseAdmin
                .from('leads')
                .select('id', { count: 'exact', head: true })
                .in('organization_id', orgIds),
            supabaseAdmin
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .in('organization_id', orgIds),
        ])

        // Get hierarchy stats
        const { data: statsByLevel } = await getHierarchyStats()

        return {
            data: {
                totalOrganizations: orgsResult.count || 0,
                totalLeads: leadsResult.count || 0,
                totalConversations: convsResult.count || 0,
                totalRevenue: 0, // TODO: Integrate with invoices if needed
                statsByLevel: statsByLevel || []
            },
            error: null
        }
    } catch (error: any) {
        console.error("Error fetching hierarchy metrics:", error)
        return { data: null, error: error.message }
    }
}

/**
 * Get growth trend for organizations over time
 */
export async function getOrganizationGrowth(period: 'week' | 'month' | 'year' = 'month'): Promise<{ data: { date: string, count: number }[] | null, error: string | null }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { data: null, error: "Unauthorized" }

    const isAdmin = await isSuperAdmin(user.id)

    if (!isAdmin) {
        return { data: null, error: "Only platform admins can view growth trends" }
    }

    try {
        // Get date range
        const now = new Date()
        let startDate: Date

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
                break
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        }

        const { data: orgs, error } = await supabaseAdmin
            .from('organizations')
            .select('created_at')
            .gte('created_at', startDate.toISOString())
            .order('created_at')

        if (error) throw error

        // Group by date
        const grouped: Record<string, number> = {}
        orgs?.forEach(org => {
            const date = new Date(org.created_at).toISOString().split('T')[0]
            grouped[date] = (grouped[date] || 0) + 1
        })

        const result = Object.entries(grouped).map(([date, count]) => ({ date, count }))

        return { data: result, error: null }
    } catch (error: any) {
        console.error("Error fetching growth data:", error)
        return { data: null, error: error.message }
    }
}
