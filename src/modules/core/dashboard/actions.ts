'use server'

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { unstable_noStore as noStore } from "next/cache"

export async function getDashboardData() {
    noStore()
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) {
        return fallbackData;
    }

    // 1. Llamada RPC ultra-rapida para métricas agregadas
    const { data: metrics, error: metricsError } = await supabase.rpc('get_agency_dashboard_metrics', { p_org_id: orgId })




    if (metricsError) {
        console.error('Error fetching dashboard metrics:', metricsError)
        // Fallback a lógica antigua si falla la RPC
        return getDashboardDataFallback(orgId, supabase);
    }

    // 2. Settings (Ligero)
    const { data: settings, error: settingsError } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('organization_id', orgId)
        .single()

    if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching settings:', settingsError)
    }

    // // 3. Services (mantenemos para funcionalidad existente)
    // const { data: services, error: servicesError } = await supabase
    //     .from('services')
    //     .select('id, status, type, frequency, amount, organization_id')
    //     .is('deleted_at', null)
    //     .eq('organization_id', orgId)

    // if (servicesError) {
    //     console.error('Error fetching services:', servicesError)
    // }

    // 4. Mapear respuesta para compatibilidad con UI existente
    return {
        clients: [], // Lista vacía ya que no se necesita para renderizado inicial
        invoices: [], // Lista vacía - los totales vienen en metrics
        services: [], // Services ocultos para optimizar DB Call
        settings: settings || null,
        // Nuevos datos pre-calculados para el dashboard
        metrics: metrics || {
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
    let clientsQuery = supabase.from('clients').select('id, status, created_at, organization_id, first_name, last_name, company_name, logo_url, avatar_url')
    let invoicesQuery = supabase.from('invoices').select('id, status, total, client_id, due_date, created_at, organization_id')
    let servicesQuery = supabase.from('services').select('id, status, type, frequency, amount, organization_id')
    let settingsQuery = supabase.from('organization_settings').select('*')

    clientsQuery = clientsQuery.is('deleted_at', null)
    invoicesQuery = invoicesQuery.is('deleted_at', null)
    servicesQuery = servicesQuery.is('deleted_at', null)

    clientsQuery = clientsQuery.eq('organization_id', orgId)
    invoicesQuery = invoicesQuery.eq('organization_id', orgId)
    servicesQuery = servicesQuery.eq('organization_id', orgId)
    settingsQuery = settingsQuery.eq('organization_id', orgId)

    const [clientsRes, invoicesRes, servicesRes, settingsRes] = await Promise.all([
        clientsQuery,
        invoicesQuery,
        servicesQuery,
        settingsQuery.maybeSingle()
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
 * Resolves the client-side waterfall by doing everything in a single parallel server execution.
 */
export async function getDashboardPayload() {
    noStore()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return null

    const { getOrganizationModules, getCurrentOrgDetails } = await import("@/modules/core/organizations/actions")
    const { getOrgSpaceCategory } = await import("@/modules/core/organizations/space-helpers")

    // 1. Fetch only identity first to determine Space/Vertical
    const [modules, orgDetails, spaceCategory] = await Promise.all([
        getOrganizationModules(orgId),
        getCurrentOrgDetails(),
        getOrgSpaceCategory(orgId)
    ])

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

    // Hierarchy check: Retail and Vertical spaces take precedence over the generic Reseller/Agency view if detected.
    const orgType = isRetail ? 'retail' : (isCleaning ? 'cleaning' : (isResto ? 'resto' : ((isPlatform || isReseller) ? 'reseller' : 'agency')))

    let dashboardData: any = null
    let extraData: any = null

    // 2. Fetch specific vertical data ONLY if needed
    if (orgType === 'resto') {
        const supabase = await createClient()
        // Resto no necesita facturas ni MRR. Tal vez solo Settings para el Logo.
        const { data: settings } = await supabase.from('organization_settings').select('*').eq('organization_id', orgId).single()
        dashboardData = { settings }
        extraData = { orgDetails }
    } else if (orgType === 'retail') {
        const supabase = await createClient()
        const { data: settings } = await supabase.from('organization_settings').select('*').eq('organization_id', orgId).single()

        // Fetch Attendance metrics for Operómetro
        const today = new Date().toISOString().split('T')[0]

        const { data: locations } = await supabase.from('locations').select('id, name').eq('organization_id', orgId).is('deleted_at', null)
        const { data: logs } = await supabase
            .from('attendance_logs')
            .select('id, staff_id, location_id, type, is_valid')
            .eq('organization_id', orgId)
            .gte('timestamp', `${today}T00:00:00`)
            .lte('timestamp', `${today}T23:59:59`)

        dashboardData = { settings }
        extraData = {
            orgDetails,
            retailMetrics: {
                totalLocations: locations?.length || 0,
                activeLocations: new Set(logs?.filter(l => l.type === 'check_in').map(l => l.location_id)).size,
                staffOnSite: new Set(logs?.filter(l => l.type === 'check_in').map(l => l.staff_id)).size,
                alerts: logs?.filter(l => !l.is_valid).length || 0
            }
        }
    } else {
        // Agencia, Limpieza, o Reseller si requieren el MRR y Servicios
        dashboardData = await getDashboardData()

        if (orgType === 'cleaning') {
            const { getOperationsMetrics, getWeeklyRevenue } = await import("@/modules/core/work-orders/actions/operation-actions")
            const [cleaningMetrics, cleaningRevenue] = await Promise.all([
                getOperationsMetrics(new Date().toISOString()),
                getWeeklyRevenue()
            ])
            extraData = { cleaningMetrics, cleaningRevenue }
        } else if (orgType === 'reseller') {
            const supabase = await createClient()
            const { count: tenantCount } = await supabase
                .from('organizations')
                .select('id', { count: 'exact', head: true })
                .eq('parent_organization_id', orgId)
            extraData = { tenantCount }
        }
    }

    // 3. Fetch Global Dashboard Banner Configuration
    const supabase = await createClient()
    const bannerSpaceType = orgDetails?.organization_type === 'platform' ? 'platform' : orgType

    const { data: bannerData } = await supabase
        .from('global_dashboard_banners')
        .select('*')
        .in('space_type', [bannerSpaceType, 'all'])
        .eq('is_active', true)
        .order('is_active', { ascending: false }) // Prioritize if multiple (edge case)
        .limit(1)
        .maybeSingle()

    if (dashboardData && bannerData) {
        dashboardData.bannerConfig = bannerData
    }

    return {
        orgType,
        dashboardData,
        extraData
    }
}

