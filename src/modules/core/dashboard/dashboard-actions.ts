'use server'

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { unstable_noStore as noStore } from "next/cache"
import { normalizeCatalogItem } from "@/modules/features/catalog/utils/normalize-catalog-item"

export async function getDashboardData(supabase: any, orgId: string) {
    // RPC + Settings in parallel (was sequential)
    const [metricsRes, settingsRes] = await Promise.all([
        supabase.rpc('get_agency_dashboard_metrics', { p_org_id: orgId }),
        supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle()
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
        supabase.from('leads').select('id, status, created_at, organization_id, name, company_name').is('deleted_at', null).eq('organization_id', orgId),
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

    const { getOrganizationModules, getCurrentOrgDetails } = await import("@/modules/core/organizations/organization-actions")

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
            .select('space_category, category')
            .eq('id', orgDetails.active_app_id)
            .maybeSingle()
        spaceCategory = (appData as any)?.space_category || (appData as any)?.category || 'agency'
    }

    const isRealEstate = spaceCategory === 'real_estate' ||
        modules.includes('module_real_estate') ||
        modules.includes('vertical_real_estate') ||
        orgDetails?.active_app_id === 'app_real_estate_pro' ||
        orgDetails?.organization_type === 'real_estate'
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
    const isSaaS = spaceCategory === 'saas' || modules.includes('module_saas') || modules.includes('vertical_saas')

    const orgType = isRealEstate ? 'real_estate' : (isRetail ? 'retail' : (isCleaning ? 'cleaning' : (isResto ? 'resto' : (isSaaS ? 'saas' : ((isPlatform || isReseller) ? 'reseller' : 'agency')))))

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

    if (orgType === 'real_estate') {
        const now = new Date()
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const [
            settingsRes,
            bannerRes,
            catalogRes,
            leasesRes,
            settlementsRes,
            leadsRes
        ] = await Promise.all([
            supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle(),
            bannerPromise,
            supabase.from('service_catalog')
                .select('id, name, base_price, is_active, is_visible_in_portal, classification, real_estate_details, classification_metadata, type, images, gallery_images, image_url')
                .eq('organization_id', orgId)
                .is('deleted_at', null),
            supabase.from('property_leases')
                .select('id, property_id, tenant_id, owner_id, monthly_rent, status, start_date, end_date, commission_percentage')
                .eq('organization_id', orgId)
                .is('deleted_at', null),
            supabase.from('property_lease_settlements')
                .select('id, lease_id, period, rent_amount, gross_collected, commission_amount, vat_amount, net_owner_payout, tenant_payment_status, owner_payout_status, deductions_amount')
                .eq('organization_id', orgId),
            supabase.from('leads')
                .select('id, name, company_name, email, phone, metadata, status')
                .eq('organization_id', orgId)
                .is('deleted_at', null)
        ])

        const catalogItems = (catalogRes.data || []).map((p: any) => normalizeCatalogItem(p))
        const leases = leasesRes.data || []
        const settlements = settlementsRes.data || []
        const leads = leadsRes.data || []

        // 1. Portafolio & Ocupación
        const activeItems = catalogItems.filter((i: any) => i.is_active !== false)
        let rentPropertiesCount = 0
        let salePropertiesCount = 0
        let totalSalesValuation = 0

        activeItems.forEach((i: any) => {
            const re = i.real_estate_details || i.classification_metadata?.real_estate
            const op = re?.operation || re?.operation_type || (Number(i.base_price || 0) > 50000000 ? 'sale' : 'rent')
            if (op === 'sale') {
                salePropertiesCount++
                totalSalesValuation += Number(i.base_price || 0)
            } else {
                rentPropertiesCount++
            }
        })

        // 2. Contratos & Renovaciones (Próximos 60 días)
        const activeLeases = leases.filter((l: any) => l.status === 'active')
        const activeLeasesCount = activeLeases.length
        const totalPropertiesCount = catalogItems.length
        const occupancyRate = rentPropertiesCount > 0 
            ? Math.min(100, Math.round((activeLeasesCount / rentPropertiesCount) * 100))
            : 0

        const upcomingRenewalsCount = activeLeases.filter((l: any) => {
            if (!l.end_date) return false
            const end = new Date(l.end_date).getTime()
            const nowDate = now.getTime()
            const maxDate = new Date(in60Days).getTime()
            return end >= nowDate && end <= maxDate
        }).length

        // 3. Recaudo del Mes (RentFlow Pro) & Dispersión a Propietarios
        const currentMonthSettlements = settlements.filter((s: any) => s.period === currentPeriod)
        
        let totalExpectedRent = 0
        let grossCollected = 0
        let netOwnerPayout = 0
        let agencyCommissions = 0
        let lateAmount = 0
        let pendingAmount = 0

        if (currentMonthSettlements.length > 0) {
            currentMonthSettlements.forEach((s: any) => {
                const rent = Number(s.rent_amount || 0)
                const gross = Number(s.gross_collected || 0)
                const comm = Number(s.commission_amount || 0) + Number(s.vat_amount || 0)
                const net = Number(s.net_owner_payout || 0)
                
                totalExpectedRent += rent
                if (s.tenant_payment_status === 'paid') {
                    grossCollected += gross
                    netOwnerPayout += net
                    agencyCommissions += comm
                } else if (s.tenant_payment_status === 'late') {
                    lateAmount += rent
                } else {
                    pendingAmount += rent
                }
            })
        } else {
            // Computed estimation from active leases
            activeLeases.forEach((l: any) => {
                const rent = Number(l.monthly_rent || 0)
                const commRate = Number(l.commission_percentage || 8) / 100
                const comm = rent * commRate * 1.19
                const net = rent - comm
                totalExpectedRent += rent
                pendingAmount += rent
                netOwnerPayout += net
                agencyCommissions += comm
            })
        }

        const collectionRate = totalExpectedRent > 0 
            ? Math.round((grossCollected / totalExpectedRent) * 100) 
            : 0

        dashboardData = {
            settings: settingsRes.data,
            bannerConfig: bannerRes.data || null,
            catalog: catalogItems,
            leads,
            leases,
            settlements
        }
        extraData = {
            orgDetails,
            realEstateMetrics: {
                // Portfolio & Occupancy
                activePropertiesCount: activeItems.length,
                totalPropertiesCount,
                rentPropertiesCount,
                salePropertiesCount,
                occupancyRate,
                totalSalesValuation,
                // Collection (RentFlow Pro)
                totalExpectedRent,
                grossCollected,
                collectionRate,
                lateAmount,
                pendingAmount,
                // Settlements & Agency Earnings
                netOwnerPayout,
                agencyCommissions,
                // Leases & Renewals
                activeLeasesCount,
                upcomingRenewalsCount,
                currentPeriod
            }
        }
    } else if (orgType === 'resto') {
        const today = new Date().toISOString().split('T')[0]
        const [settingsRes, bannerRes, ordersRes, tablesRes] = await Promise.all([
            supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle(),
            bannerPromise,
            supabase.from('resto_orders').select('id, total, resto_mode, kitchen_status, payment_status, created_at').eq('organization_id', orgId).gte('created_at', `${today}T00:00:00`),
            supabase.from('resto_tables').select('id, status, table_identifier').eq('organization_id', orgId)
        ])

        const todayOrders = ordersRes.data || []
        const allTables = tablesRes.data || []

        const todayPaidSales = todayOrders
            .filter((o: any) => o.payment_status === 'paid')
            .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)

        const activeOrdersCount = todayOrders
            .filter((o: any) => ['pending', 'preparing', 'ready'].includes(o.kitchen_status)).length

        const deliveryCount = todayOrders
            .filter((o: any) => o.resto_mode === 'delivery').length

        const dineInCount = todayOrders
            .filter((o: any) => o.resto_mode === 'dine_in').length

        const pickupCount = todayOrders
            .filter((o: any) => o.resto_mode === 'pickup').length

        const occupiedTablesCount = allTables.filter((t: any) => t.status === 'occupied' || t.status === 'billing').length
        const billingTablesCount = allTables.filter((t: any) => t.status === 'billing').length
        const availableTablesCount = allTables.filter((t: any) => t.status === 'available').length

        dashboardData = { settings: settingsRes.data, bannerConfig: bannerRes.data || null }
        extraData = { 
            orgDetails,
            tables: allTables,
            restoMetrics: {
                todayPaidSales,
                activeOrdersCount,
                deliveryCount,
                dineInCount,
                pickupCount,
                totalTables: allTables.length,
                occupiedTablesCount,
                billingTablesCount,
                availableTablesCount,
                todayOrdersCount: todayOrders.length
            }
        }
    } else if (orgType === 'retail') {
        const today = new Date().toISOString().split('T')[0]
        const [settingsRes, locationsRes, logsRes, bannerRes] = await Promise.all([
            supabase.from('organization_settings').select('*').eq('organization_id', orgId).maybeSingle(),
            supabase.from('organization_locations').select('id, name').eq('organization_id', orgId).eq('is_active', true),
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
            const { getOperationsMetrics, getWeeklyRevenue } = await import("@/modules/features/work-orders/actions/operation-actions")
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

    // Phase 11: Get current user role to avoid dashboard flashing
    const { data: { user } } = await supabase.auth.getUser()
    let userRole = null
    let perms = null
    if (user) {
        const { getCachedUserPermissions } = await import("@/modules/core/settings/actions/team")
        perms = await getCachedUserPermissions(user.id, orgId)
        userRole = perms?.role || null
    }

    const normalizedRole = userRole?.toLowerCase()
    const canMonitorAgents = ['admin', 'owner'].includes(normalizedRole || '')
    const isTargetSpace = ['saas', 'retail', 'real_estate'].includes(orgType)

    if (canMonitorAgents && isTargetSpace) {
        const { data: agentStats, error: rpcError } = await supabase.rpc('get_agent_monitoring_stats', { p_org_id: orgId })
        
        let filteredStats = agentStats || []

        // SI ES ADMIN (RESTRIGIDO): Filtrar agentes por canales compartidos
        if (normalizedRole === 'admin' || normalizedRole === 'administrador') {
            const adminChannels = perms?.permissions?.inbox_access || []
            
            if (adminChannels.length > 0) {
                // Obtener qué canales tiene cada agente
                const { data: availability } = await supabase
                    .from('agent_availability')
                    .select('agent_id, agent_channels(channel_type)')
                    .eq('organization_id', orgId)

                const agentsWithAccess = new Set<string>()
                availability?.forEach((a: any) => {
                    const agentHasSharedChannel = a.agent_channels?.some((c: any) => adminChannels.includes(c.channel_type))
                    if (agentHasSharedChannel) agentsWithAccess.add(a.agent_id)
                })

                // Filtrar las estadísticas. El 'unassigned' (ceros) se mantiene si el admin tiene algún canal.
                const UNASSIGNED_ID = '00000000-0000-0000-0000-000000000000'
                filteredStats = (agentStats || []).filter((s: any) => 
                    s.user_id === UNASSIGNED_ID || agentsWithAccess.has(s.user_id)
                )
            } else {
                filteredStats = []
            }
        }

        if (extraData) {
            extraData.agentStats = filteredStats
            extraData.rpcError = rpcError ? rpcError.message : null
        } else {
            extraData = { 
                agentStats: filteredStats, 
                rpcError: rpcError ? rpcError.message : null 
            }
        }
    }

    // Inject role and stats for instant hydration
    const payload = {
        orgType,
        dashboardData,
        extraData,
        userRole,
        agentStats: extraData?.agentStats || [],
        rpcError: extraData?.rpcError || null
    }

    // --- SECURITY FILTERING (Server Side) ---
    // Zero-Flicker Policy: Members should NEVER receive sensitive metadata
    const isRestricted = normalizedRole === 'member'

    if (isRestricted && payload.dashboardData) {
        // Obfuscate financial metrics
        if (payload.dashboardData.metrics) {
            payload.dashboardData.metrics = {
                revenue: 0,
                pending: 0,
                overdue: 0,
                clients_count: payload.dashboardData.metrics.clients_count || 0,
                debtors: []
            }
        }
        // Remove individual lists if they exist
        payload.dashboardData.invoices = []
        payload.dashboardData.services = []
        
        // Obfuscate extra data (like payroll or specific vertical metrics)
        if (payload.extraData) {
            delete payload.extraData.cleaningRevenue
            if (payload.extraData.cleaningMetrics) {
                payload.extraData.cleaningMetrics.revenue = 0
            }
            if (payload.extraData.realEstateMetrics) {
                payload.extraData.realEstateMetrics.totalSalesValuation = 0
                payload.extraData.realEstateMetrics.totalExpectedRent = 0
                payload.extraData.realEstateMetrics.grossCollected = 0
                payload.extraData.realEstateMetrics.netOwnerPayout = 0
                payload.extraData.realEstateMetrics.agencyCommissions = 0
                payload.extraData.realEstateMetrics.lateAmount = 0
                payload.extraData.realEstateMetrics.pendingAmount = 0
            }
            delete payload.extraData.agentStats
        }
        // Protect root property too
        payload.agentStats = []
        payload.rpcError = null
    }

    return payload
}



