'use server'

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// ============================================
// TYPES
// ============================================

export type RevenueShareRule = {
    id: string
    reseller_org_id: string | null
    phase_name: 'activation' | 'retention' | 'stable'
    phase_start_month: number
    phase_end_month: number | null
    commission_percent: number
    eligible_event_types: string[]
    requires_reseller_activity: boolean
    activity_window_days: number
    effective_from: string
    effective_to: string | null
    created_at: string
}

export type BillableEventType =
    | 'subscription_base'
    | 'subscription_addon'
    | 'addon'
    | 'overage'
    | 'upsell'
    | 'one_time'

export type BillableEvent = {
    id: string
    organization_id: string
    reseller_chain: { org_id: string; level: number }[]
    event_type: BillableEventType
    description: string | null
    amount: number
    currency: string
    invoice_id: string | null
    stripe_payment_intent_id: string | null
    client_age_months: number
    settled: boolean
    settlement_id: string | null
    commission_calculated: number | null
    commission_rule_id: string | null
    commission_phase: string | null
    event_date: string
    created_at: string
}

export type Settlement = {
    id: string
    reseller_org_id: string
    period_start: string
    period_end: string
    gross_revenue: number
    total_commission: number
    platform_fee: number
    net_payout: number
    breakdown: Record<string, { events: number; gross: number; commission: number }>
    event_count: number
    status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled'
    stripe_payout_id: string | null
    approved_at: string | null
    approved_by: string | null
    paid_at: string | null
    created_at: string
}

// ============================================
// REVENUE SHARE RULES ACTIONS
// ============================================

/**
 * Obtener todas las reglas de revenue share
 * Super admin: todas
 * Reseller: solo las propias + globales
 */
export async function getRevenueShareRules(): Promise<RevenueShareRule[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('revenue_share_rules')
        .select('*')
        .order('phase_start_month', { ascending: true })

    if (error) {
        console.error('Error fetching revenue share rules:', error)
        return []
    }

    return data || []
}

/**
 * Crear o actualizar regla de revenue share
 * Solo super admin
 */
export async function upsertRevenueShareRule(rule: Partial<RevenueShareRule> & {
    phase_name: string
    phase_start_month: number
    commission_percent: number
    eligible_event_types: string[]
}): Promise<{ success: boolean; error?: string; data?: RevenueShareRule }> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('revenue_share_rules')
        .upsert({
            ...rule,
            updated_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Error upserting revenue share rule:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin')
    return { success: true, data }
}

// ============================================
// BILLABLE EVENTS ACTIONS
// ============================================

/**
 * Registrar un evento facturable
 * Esta función captura la cadena de reseller automáticamente
 */
export async function registerBillableEvent(params: {
    organization_id: string
    event_type: BillableEventType
    amount: number
    description?: string
    currency?: string
    invoice_id?: string
    stripe_payment_intent_id?: string
}): Promise<{ success: boolean; error?: string; event_id?: string }> {
    const supabase = await createClient()

    // 1. Obtener info del cliente para calcular cadena y antigüedad
    const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, acquired_by_reseller_id, acquisition_date')
        .eq('id', params.organization_id)
        .single()

    if (orgError || !org) {
        return { success: false, error: 'Organización no encontrada' }
    }

    // 2. Construir cadena de reseller (solo nivel 1 en MVP)
    let resellerChain: { org_id: string; level: number }[] = []
    if (org.acquired_by_reseller_id) {
        resellerChain = [{ org_id: org.acquired_by_reseller_id, level: 1 }]
    }

    // 3. Calcular antigüedad en meses
    let clientAgeMonths = 0
    if (org.acquisition_date) {
        const acquisitionDate = new Date(org.acquisition_date)
        const now = new Date()
        clientAgeMonths = Math.max(0,
            (now.getFullYear() - acquisitionDate.getFullYear()) * 12 +
            (now.getMonth() - acquisitionDate.getMonth())
        )
    }

    // 4. Insertar evento
    const { data, error } = await supabase
        .from('billable_events')
        .insert({
            organization_id: params.organization_id,
            reseller_chain: resellerChain,
            event_type: params.event_type,
            amount: params.amount,
            description: params.description || null,
            currency: params.currency || 'USD',
            invoice_id: params.invoice_id || null,
            stripe_payment_intent_id: params.stripe_payment_intent_id || null,
            client_age_months: clientAgeMonths,
            event_date: new Date().toISOString()
        })
        .select('id')
        .single()

    if (error) {
        console.error('Error registering billable event:', error)
        return { success: false, error: error.message }
    }

    return { success: true, event_id: data.id }
}

/**
 * Obtener eventos facturables de un reseller (clientes adquiridos)
 */
export async function getResellerBillableEvents(reseller_org_id: string): Promise<BillableEvent[]> {
    const supabase = await createClient()

    // Obtener IDs de clientes adquiridos por este reseller
    const { data: clients, error: clientsError } = await supabase
        .from('organizations')
        .select('id')
        .eq('acquired_by_reseller_id', reseller_org_id)

    if (clientsError || !clients?.length) {
        return []
    }

    const clientIds = clients.map(c => c.id)

    const { data, error } = await supabase
        .from('billable_events')
        .select('*')
        .in('organization_id', clientIds)
        .order('event_date', { ascending: false })

    if (error) {
        console.error('Error fetching billable events:', error)
        return []
    }

    return data || []
}

// ============================================
// SETTLEMENT ACTIONS
// ============================================

/**
 * Calcular liquidación para un período
 * Solo super admin puede ejecutar
 */
export async function calculateSettlement(params: {
    reseller_org_id: string
    period_start: string // YYYY-MM-DD
    period_end: string   // YYYY-MM-DD
}): Promise<{ success: boolean; error?: string; settlement_id?: string }> {
    const supabase = await createClient()

    // 1. Obtener eventos no liquidados del período
    const { data: events, error: eventsError } = await supabase
        .from('billable_events')
        .select('*')
        .eq('settled', false)
        .gte('event_date', params.period_start)
        .lte('event_date', params.period_end + 'T23:59:59Z')
        .contains('reseller_chain', [{ org_id: params.reseller_org_id }])

    if (eventsError) {
        return { success: false, error: eventsError.message }
    }

    if (!events?.length) {
        return { success: false, error: 'No hay eventos para liquidar en este período' }
    }

    // 2. Calcular comisiones para cada evento usando la función de BD
    let totalGross = 0
    let totalCommission = 0
    const breakdown: Record<string, { events: number; gross: number; commission: number }> = {}
    const eventUpdates: { id: string; commission: number; rule_id: string | null; phase: string }[] = []

    for (const event of events) {
        // Llamar función de cálculo
        const { data: calcResult, error: calcError } = await supabase
            .rpc('calculate_event_commission', { p_event_id: event.id })

        if (calcError) {
            console.error('Error calculating commission:', calcError)
            continue
        }

        const result = calcResult?.[0]
        const commission = result?.commission_amount || 0
        const phase = result?.phase_name || 'unknown'

        totalGross += event.amount
        totalCommission += commission

        // Acumular por fase
        if (!breakdown[phase]) {
            breakdown[phase] = { events: 0, gross: 0, commission: 0 }
        }
        breakdown[phase].events += 1
        breakdown[phase].gross += event.amount
        breakdown[phase].commission += commission

        eventUpdates.push({
            id: event.id,
            commission,
            rule_id: result?.rule_id || null,
            phase
        })
    }

    const platformFee = totalGross - totalCommission
    const netPayout = totalCommission

    // 3. Crear settlement
    const { data: settlement, error: settlementError } = await supabase
        .from('settlements')
        .insert({
            reseller_org_id: params.reseller_org_id,
            period_start: params.period_start,
            period_end: params.period_end,
            gross_revenue: totalGross,
            total_commission: totalCommission,
            platform_fee: platformFee,
            net_payout: netPayout,
            breakdown,
            event_count: events.length,
            status: 'pending'
        })
        .select('id')
        .single()

    if (settlementError) {
        return { success: false, error: settlementError.message }
    }

    // 4. Marcar eventos como liquidados y guardar cálculos
    for (const update of eventUpdates) {
        await supabase
            .from('billable_events')
            .update({
                settled: true,
                settlement_id: settlement.id,
                commission_calculated: update.commission,
                commission_rule_id: update.rule_id,
                commission_phase: update.phase
            })
            .eq('id', update.id)
    }

    revalidatePath('/platform/admin')
    return { success: true, settlement_id: settlement.id }
}

/**
 * Aprobar liquidación (solo super admin)
 */
export async function approveSettlement(settlement_id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    const { error } = await supabase
        .from('settlements')
        .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user.id
        })
        .eq('id', settlement_id)
        .eq('status', 'pending')

    if (error) {
        return { success: false, error: error.message }
    }

    revalidatePath('/platform/admin')
    return { success: true }
}

/**
 * Obtener liquidaciones de un reseller
 */
export async function getResellerSettlements(reseller_org_id: string): Promise<Settlement[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('reseller_org_id', reseller_org_id)
        .order('period_start', { ascending: false })

    if (error) {
        console.error('Error fetching settlements:', error)
        return []
    }

    return data || []
}

/**
 * Obtener todas las liquidaciones (super admin)
 */
export async function getAllSettlements(): Promise<Settlement[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('settlements')
        .select(`
            *,
            reseller:organizations!reseller_org_id(id, name, slug)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all settlements:', error)
        return []
    }

    return data || []
}

// ============================================
// RESELLER ACTIVITY ACTIONS
// ============================================

/**
 * Registrar actividad del reseller con un cliente
 * Necesario para ganar comisiones en Fase 2
 */
export async function registerResellerActivity(params: {
    reseller_org_id: string
    client_org_id: string
    activity_type: 'addon_sale' | 'upsell' | 'support_session' | 'training' | 'consultation' | 'onboarding_assist'
    description?: string
    evidence_url?: string
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
        .from('reseller_activity_log')
        .insert({
            reseller_org_id: params.reseller_org_id,
            client_org_id: params.client_org_id,
            activity_type: params.activity_type,
            description: params.description || null,
            evidence_url: params.evidence_url || null,
            created_by: user?.id || null,
            activity_date: new Date().toISOString()
        })

    if (error) {
        console.error('Error registering reseller activity:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

// ============================================
// DASHBOARD METRICS
// ============================================

/**
 * Obtener métricas de revenue para un reseller
 */
export async function getResellerRevenueMetrics(reseller_org_id: string): Promise<{
    total_clients: number
    total_revenue: number
    total_commission_earned: number
    pending_commission: number
    clients_by_phase: Record<string, number>
}> {
    const supabase = await createClient()

    // Clientes adquiridos
    const { count: totalClients } = await supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true })
        .eq('acquired_by_reseller_id', reseller_org_id)

    // Eventos totales (ingresos que generaron)
    const { data: clientIds } = await supabase
        .from('organizations')
        .select('id')
        .eq('acquired_by_reseller_id', reseller_org_id)

    let totalRevenue = 0
    let totalCommissionEarned = 0
    let pendingCommission = 0

    if (clientIds?.length) {
        const ids = clientIds.map(c => c.id)

        const { data: events } = await supabase
            .from('billable_events')
            .select('amount, commission_calculated, settled')
            .in('organization_id', ids)

        if (events) {
            for (const e of events) {
                totalRevenue += e.amount || 0
                if (e.settled) {
                    totalCommissionEarned += e.commission_calculated || 0
                } else {
                    // Para pendientes, estimamos (se calculará al liquidar)
                    pendingCommission += (e.amount || 0) * 0.25 // Estimación conservadora
                }
            }
        }
    }

    // Clientes por fase (basado en antigüedad)
    const clientsByPhase: Record<string, number> = {
        activation: 0,
        retention: 0,
        stable: 0
    }

    if (clientIds?.length) {
        const { data: clients } = await supabase
            .from('organizations')
            .select('id, acquisition_date')
            .eq('acquired_by_reseller_id', reseller_org_id)

        if (clients) {
            const now = new Date()
            for (const c of clients) {
                if (!c.acquisition_date) {
                    clientsByPhase.activation += 1
                    continue
                }
                const acq = new Date(c.acquisition_date)
                const months = (now.getFullYear() - acq.getFullYear()) * 12 + (now.getMonth() - acq.getMonth())

                if (months <= 6) clientsByPhase.activation += 1
                else if (months <= 12) clientsByPhase.retention += 1
                else clientsByPhase.stable += 1
            }
        }
    }

    return {
        total_clients: totalClients || 0,
        total_revenue: totalRevenue,
        total_commission_earned: totalCommissionEarned,
        pending_commission: pendingCommission,
        clients_by_phase: clientsByPhase
    }
}
