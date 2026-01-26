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

    // 3. Services (mantenemos para funcionalidad existente)
    const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, status, type, frequency, amount, organization_id')
        .is('deleted_at', null)
        .eq('organization_id', orgId)

    if (servicesError) {
        console.error('Error fetching services:', servicesError)
    }

    // 4. Mapear respuesta para compatibilidad con UI existente
    return {
        clients: [], // Lista vacía ya que no se necesita para renderizado inicial
        invoices: [], // Lista vacía - los totales vienen en metrics
        services: services || [],
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
