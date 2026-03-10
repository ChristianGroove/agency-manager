'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { unstable_noStore as noStore } from "next/cache"

export async function getDashboardData(supabase: any, orgId: string) {
    // RPC + Settings in parallel (was sequential)
    const [metricsRes, settingsRes] = await Promise.all([
        supabase.rpc('get_agency_dashboard_metrics', { p_org_id: orgId }),
        supabase.from('organization_settings').select('*').eq('organization_id', orgId).single()
    ])

    if (metricsRes.error) {
        console.error('Error fetching dashboard metrics:', metricsRes.error)
        return getDashboardDataFallback(orgId, supabase)
    }

    return {
        clients: [],
        invoices: [],
        services: [],
        settings: settingsRes.data || null,
        metrics: metricsRes.data || {
            revenue: 0,
            pending: 0,
            overdue: 0,
            clients_count: 0,
            debtors: []
        }
    }
}

// Fallback function si la RPC falla
async function getDashboardDataFallback(orgId: string, supabase: any) {
    const [clientsRes, invoicesRes, servicesRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('id, status, created_at, organization_id, first_name, last_name, company_name, logo_url, avatar_url').is('deleted_at', null).eq('organization_id', orgId),
        supabase.from('invoices').select('id, status, total, client_id, due_date, created_at, organization_id').is('deleted_at', null).eq('organization_id', orgId),
        supabase.from('services').select('id, status, type, frequency, amount, organization_id').is('deleted_at', null).eq('organization_id', orgId),
        supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle()
    ])

    return {
        clients: clientsRes.data || [],
        invoices: invoicesRes.data || [],
        services: servicesRes.data || [],
        settings: settingsRes.data || null,
        metrics: null
    }
}

const fallbackData = {
    clients: [],
    invoices: [],
    services: [],
    settings: null,
    metrics: {
        revenue: 0,
        pending: 0,
        overdue: 0,
        clients_count: 0,
        debtors: []
    }
}

/**
 * OPTIMIZATION: Unified payload fetcher for DashboardPage.
 * 
 * Waterfall BEFORE:
 *   getCurrentOrganizationId() → [getOrganizationModules, getCurrentOrgDetails, getOrgSpaceCategory*]
 *   → getDashboardData() (sequential RPC then settings) → Banner query
 *   * getOrgSpaceCategory internally called getCurrentOrgDetails AGAIN (duplicated)
 * 
 * Waterfall AFTER:
 *   getCurrentOrganizationId() → [getOrganizationModules, getCurrentOrgDetails] (2 queries, not 3+)
 *   → [verticalData + bannerQuery] in parallel
 *   Inside getDashboardData: RPC + settings in parallel
 */
export async function getDashboardPayload() {
    noStore()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const supabase = await createClient() // Single client for entire payload

    const { getOrganizationModules, getCurrentOrgDetails } = await import("@/modules/core/organizations/actions")

    // Step 1: Fetch identity in parallel (2 queries instead of 3+)
    // getOrgSpaceCategory was calling getCurrentOrgDetails internally — now we derive inline
    const [modules, orgDetails] = await Promise.all([
        getOrganizationModules(orgId),
        getCurrentOrgDetails(orgId)
    ])

    // Derive space category inline (eliminates redundant getCurrentOrgDetails + saas_apps query)
    let spaceCategory = 'agency'
    if (orgDetails?.active_app_id) {
        const { data: appData } = await supabase
            .from('saas_apps')
            .select('space_category')
            .eq('id', orgDetails.active_app_id)
            .single()
        spaceCategory = appData?.space_category || 'agency'
    }

    const isCleaning = spaceCategory === 'cleaning' || modules.includes('module_cleaning') || modules.includes('vertical_cleaning')
    const isPlatform = orgDetails?.organization_type === 'platform'
    const isReseller = orgDetails?.organization_type === 'reseller'
    const isResto = spaceCategory === 'resto'
    const isRetail = spaceCategory === 'retail' ||
        modules.includes('module_attendance') ||
        modules.includes('core_locations') ||
        modules.includes('vertical_retail') ||
        orgDetails?.name?.toLowerCase().includes('retail') ||
        orgDetails?.slug?.toLowerCase().includes('retail')

    const orgType = isRetail ? 'retail' : (isCleaning ? 'cleaning' : (isResto ? 'resto' : ((isPlatform || isReseller) ? 'reseller' : 'agency')))

    // Step 2: Fetch vertical data AND banner in parallel (was sequential)
    const bannerSpaceType = orgDetails?.organization_type === 'platform' ? 'platform' : orgType
    const bannerPromise = supabase
        .from('global_dashboard_banners')
        .select('*')
        .in('space_type', [bannerSpaceType, 'all'])
        .eq('is_active', true)
        .order('is_active', { ascending: false })
        .limit(1)
        .maybeSingle()

    let dashboardData: any = null
    let extraData: any = null

    if (orgType === 'resto') {
        const [settingsRes, bannerRes] = await Promise.all([
            supabase.from('organization_settings').select('*').eq('organization_id', orgId).single(),
            bannerPromise
        ])
        dashboardData = { settings: settingsRes.data, bannerConfig: bannerRes.data || null }
        extraData = { orgDetails }
    } else if (orgType === 'retail') {
        const today = new Date().toISOString().split('T')[0]
        const [settingsRes, locationsRes, logsRes, bannerRes] = await Promise.all([
            supabase.from('organization_settings').select('*').eq('organization_id', orgId).single(),
            supabase.from('locations').select('id, name').eq('organization_id', orgId).is('deleted_at', null),
            supabase.from('attendance_logs').select('id, staff_id, location_id, type, is_valid').eq('organization_id', orgId).gte('timestamp', `${today}T00:00:00`).lte('timestamp', `${today}T23:59:59`),
            bannerPromise
        ])
        dashboardData = { settings: settingsRes.data, bannerConfig: bannerRes.data || null }
        extraData = {
            orgDetails,
            retailMetrics: {
                totalLocations: locationsRes.data?.length || 0,
                activeLocations: new Set(logsRes.data?.filter((l: any) => l.type === 'check_in').map((l: any) => l.location_id)).size,
                staffOnSite: new Set(logsRes.data?.filter((l: any) => l.type === 'check_in').map((l: any) => l.staff_id)).size,
                alerts: logsRes.data?.filter((l: any) => !l.is_valid).length || 0
            }
        }
    } else {
        // Agency, Cleaning, or Reseller
        const [data, bannerRes] = await Promise.all([
            getDashboardData(supabase, orgId),
            bannerPromise
        ])
        dashboardData = data
        if (dashboardData) dashboardData.bannerConfig = bannerRes.data || null

        if (orgType === 'cleaning') {
            const { getOperationsMetrics, getWeeklyRevenue } = await import("@/modules/core/work-orders/actions/operation-actions")
            const [cleaningMetrics, cleaningRevenue] = await Promise.all([
                getOperationsMetrics(new Date().toISOString()),
                getWeeklyRevenue()
            ])
            extraData = { cleaningMetrics, cleaningRevenue }
        } else if (orgType === 'reseller') {
            const { count: tenantCount } = await supabase
                .from('organizations')
                .select('id', { count: 'exact', head: true })
                .eq('parent_organization_id', orgId)
            extraData = { tenantCount }
        }
    }

    return {
        orgType,
        dashboardData,
        extraData
    }
}

